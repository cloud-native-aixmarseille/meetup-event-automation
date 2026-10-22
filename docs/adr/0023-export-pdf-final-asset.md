# ADR 0023: Export a static PDF final asset from the slides

Status: Accepted; implemented.

Date: 2026-10-20

## Context

[Asset reconciliation](../integrations/assets.md) maintains an event folder and
one editable copy per template. A copy with `template_kind: slides` supplies the
`slides-link` entry in `drive-files`. The journey derives `slides-ready` from
that URL and the copy's content status; communications use the editable URL for
`eventSlidesUrl`. The folder URL is saved in the issue's **Drive Link**.
The [asset action](../../actions/publication/reconcile-assets/action.yml) exposes
`drive-files`, `slides-ready`, and `diagnostics`.

Managed Slides content follows
[ADR 0014](0014-reconcile-drive-template-placeholders.md): registered locations
are reconciled while manual content remains editable. Organizers need a separate
PDF that can be downloaded and shared as a rendered snapshot, with a stable file
identity and metadata connecting it to the event and source. The current
[asset repository port][asset-port] provides folders, template copies, and
metadata updates; it has no binary export or upload capability. Existing content
binding sidecars track registered locations, not whole-presentation exports.

## Decision

Reconcile one managed PDF of the event presentation alongside the editable
assets, under the shared event workflow lock. Keep the PDF's identity, export
state, and readiness separate from the editable Slides copy.

### A separate rendered snapshot

Upload and verify a new PDF in the existing managed event folder, then move
it to one shared Drive folder named `public` for all events. The required
`google-drive-public-folder-id` input selects that existing destination
by ID; separate event jobs must not race to discover or create a shared folder.
Reuse it when event folders have moved into an archive. Keep the editable copy,
its stable URL, and the export sidecar in the event folder. Refresh a published
PDF in place, preserving its file ID.
The PDF has its own event-dated filename and a distinct derived-asset identity;
never identify it as another copy of the Slides template. Current copy matching
uses `template_file_id`, so export provenance must not cause a PDF to match that
copy identity.

The PDF is a static snapshot of a successfully observed source version. A later
reconciliation may refresh the same PDF when the source or export inputs change.
Its URL stays stable, but its bytes are not an immutable historical archive or a
guarantee of what was presented on the event date. Preserving every exported
version or freezing an organizer-approved final version requires a separate
decision.

Keep the current editable `slides-link`, `slides-ready`, and email link contract.
There is no operational consumer for a PDF link in the current workflows. Add a
`slides-pdf-link` entry to `drive-files` only with an identified consumer and the
corresponding contract updates; it is not a standalone action output. Until
then, organizers access the PDF through the configured shared `public` folder.
Do not change the
thank-you email's `eventSlidesUrl` or repurpose **Drive Link**.

### Eligibility and source readiness

The journey evaluates the existing
[`PostEventPolicy`][post-event-policy] using the injected clock, event timezone,
date, and occurrence status. It passes the eligibility result to publication;
publication must not import the communication domain. With valid date/time
inputs, follow-up is due for a `held` event or a `scheduled` event whose local
date has passed. Cancelled, postponed, and unknown occurrences are ineligible.
This phase does not assert that an event happened and does not complete any
organizer checklist item. Publication's manual-task applicability remains
governed by its own policy.

Keep the existing workflow scope: issue updates and scheduled audits process
open meetup issues. Export does not reopen closed issues or add an archive
backfill. A moved Drive folder remains reusable while its event is in scope and
the service account retains access.

Export only a Google Slides source whose managed content is `ready` or
`copy-only`. Pending or conflicted source content leaves the export pending;
an editable URL alone does not prove the source is ready. An ineligible or
unready run preserves an existing PDF without presenting it as a fresh export.

### Provider and metadata contract

Use Drive [`files.export`][drive-export] with `application/pdf`, a supported
[Slides export format][export-formats]. It returns bytes rather than creating a
Drive file, and limits exported content to 10 MB. The adapter must separately
upload the PDF with bounded I/O and validate its media type and content. Report
size or permission failures explicitly; never publish a truncated file.

Use Drive file `version` as an opaque source-change token. It reflects all
server-side changes, so metadata-only changes can conservatively trigger an
export. `headRevisionId` and `md5Checksum` are binary-file fields and cannot
identify a Slides source revision. See the [file resource][drive-files].
`files.export` has no revision-selection parameter: compare source versions
before and after export, and leave a changed source pending rather than
confirming a mismatched snapshot. The workflow lock does not prevent human
edits in Slides.

Manage the PDF's Drive name, description, and compact `appProperties` identity.
Record source provenance, the export contract revision, and confirmed source
version in dedicated export state. Keep pending intent and binary fingerprints
in that state, separate from placeholder binding sidecars. Respect the
[custom-property limits][drive-properties]. Adapter codecs own storage schemas;
the publication domain owns the corresponding identity and recovery invariants.

Drive metadata is the queryable identification contract. The export API offers
no embedded PDF metadata controls; it does not guarantee a deterministic Title,
Author, Subject, Keywords, producer, or XMP value. Renaming the uploaded file
must not be treated as setting its embedded title. Rich embedded metadata needs
a separately selected and validated PDF post-processing capability.

Keep export state under the event folder's existing access policy. Include only
necessary identity, version, and integrity data; never expose sidecars, private
contacts, credentials, or provider payloads through issue outputs or logs.
The automation does not grant sharing permissions. Moving the PDF applies the
shared folder's inherited access policy; organizers configure that audience.
Only verified PDF bytes are moved, never source documents or export sidecars.

### Idempotency and recovery

An unchanged source version and unchanged export inputs, with verified prior
PDF content, require no export or content write. For a changed source, validate
the exported bytes and persist pending intent before creating or updating the
managed PDF. The intent records the expected binary fingerprint, source version,
export inputs, and prior confirmed state. Confirm success only after reading
back the file's identity and content evidence and verifying its placement in the
shared `public` folder. A failed or uncertain move is recoverable from actual
file location and confirmed bytes without reexporting or duplicating the PDF.

A stored metadata marker alone is not proof that the intended bytes were
written. After an ambiguous upload or state-write response, observed content
matching the pending fingerprint permits confirmation; verified prior content
permits a safe retry of the same managed file. Any other result remains a
conflict. An ambiguous create requires locating and verifying the intended file
before another create; incomplete searches or duplicate identities require
explicit reconciliation. Do not blindly retry uncertain writes.

Manual changes to the managed PDF are conflicts, including when the source is
unchanged. Leave unmanaged files alone. Reuse verified managed files after a
failed run, preserve their URLs, and never clear email delivery records to
recover an export. Missing or malformed export state requires explicit recovery;
the existing content-binding `restore`, `remove`, and `enroll` operations do not
authorize PDF replacement.

### Architecture and reporting

Follow the current [architecture rules](../development/architecture.md) and
[ADR 0022](0022-inject-stateless-collaborators.md):

- Publication owns export eligibility inputs, identity, readiness, idempotency,
  and recovery policies, plus narrow ports for source observation, export,
  binary persistence, and export state.
- Journey coordinates event evaluation, follow-up eligibility, editable-asset
  reconciliation, PDF export, and issue persistence. It passes public event
  values and capabilities rather than provider records or credentials.
- The Drive adapter owns provider requests, binary transport, metadata codecs,
  and export-state storage. Docs and Slides content adapters keep ownership of
  registered content rendering; PDF export does not extend their binding model.
- Package-local composition assembles focused collaborators; runtime composition
  supplies credentials and binds implementations. Require constructor injection
  for policies, codecs, presenters, clocks, and effectful capabilities.

Keep the [action interface rules](../development/README.md#action-interface-rules)
and [ADR 0018](0018-remove-invariant-action-options.md): no optional inputs,
implicit runtime defaults, invariant flags, or unconsumed outputs. Export state
is a domain result, not a reason to add a public status output.

Follow [ADR 0020](0020-unified-organizer-checklist.md),
[ADR 0021](0021-separate-technical-and-organizer-feedback.md), and the
[reporting contract](../development/reporting.md). Return technical export facts
and redacted diagnostics through `ActionReportData` and the shared `ActionRunner`.
Classify new diagnostic codes with `DiagnosticPolicy`: expected organizer
corrections and reviewed recovery tasks do not fail CI; unexpected API and
persistence failures do. Organizer guidance belongs in the final merged
checklist reused by Slack, with owner-local English/French catalogs. Missing or
failed stage evidence must preserve unresolved tasks.

PDF readiness adds no email precondition and does not change `slides-ready`.
Expected PDF corrections can coexist with usable editable slides. Technical
failures still follow ordinary workflow gating: communications require completed
asset outputs and a successful execution path. Independent PDF readiness does
not promise email dispatch after a failed asset action.

## Alternatives

- Sharing only the editable Slides file gives no separate rendered deliverable
  or export provenance.
- Replacing or renaming the editable copy loses the editable source or breaks
  the `slides-link` consumed by communications.
- Manual download and upload leave identity, refresh detection, and recovery
  outside reconciliation.
- Immutable versioned PDFs preserve historical snapshots but require retention,
  finalization, and consumer-link policies beyond this decision.
- PDF post-processing can control embedded metadata but adds a dependency and a
  separate validation boundary. Drive metadata covers this decision's initial
  identification requirement.

## Consequences and required validation

One additional managed file and export-state record must be reconciled per
eligible event. Stable PDF links can serve refreshed snapshots; they do not
freeze content for existing recipients. Conservative source-version detection
may reexport after metadata changes. The provider size limit constrains the
presentations this export path supports.

Validation covers clean creation, unchanged reruns, changed-source
refreshes, copy-only sources, pending managed content, follow-up date/timezone
boundaries, cancelled/postponed events, moved folders, manual PDF edits,
concurrent source edits, uncertain uploads and state writes, duplicate identity,
size limits, access failures, and redaction. Cover technical failure gating,
merged-checklist preservation, and continued editable-link semantics with
synthetic domain, journey, adapter, and workflow contract tests.

The [export use case](../../packages/domain/publication/src/application/reconcile-slide-pdf.ts)
owns reconciliation and recovery. The Drive adapter implements its ports with a
separate export-state codec. Synthetic coverage includes
[export integration](../../tests/integration/pdf-export.spec.ts), adjacent domain,
journey and adapter tests, and the shared reporting and workflow contracts.
No live provider export is claimed. The [assets guide](../integrations/assets.md#export-the-presentation-pdf)
documents operation and manual recovery. Changes follow the
[production checks](../development/README.md#choose-checks-for-the-change).

[asset-port]: ../../packages/domain/publication/src/application/ports.ts
[post-event-policy]: ../../packages/domain/communication/src/post-event-policy.ts
[drive-export]: https://developers.google.com/workspace/drive/api/reference/rest/v3/files/export
[drive-files]: https://developers.google.com/workspace/drive/api/reference/rest/v3/files
[export-formats]: https://developers.google.com/workspace/drive/api/guides/ref-export-formats
[drive-properties]: https://developers.google.com/workspace/drive/api/guides/properties
