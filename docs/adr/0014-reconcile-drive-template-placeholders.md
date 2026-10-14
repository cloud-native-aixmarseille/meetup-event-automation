# ADR 0014: Populate and update managed placeholders in Drive template copies

Status: Proposed

Date: 2026-10-14

## Context

The [asset reconciliation](../integrations/assets.md) creates a managed event
folder and one copy per template, identified by metadata. It replaces
`[EVENT_DATE:YYYY-MM-DD]` in filenames and updates names and template kinds on
later runs. It does not populate file contents or propagate template edits.
Organizers therefore repeat event dates, host details, agenda text, and links
inside presentations and documents.

Replacing a token once is insufficient: after the first render the token is
absent, so a changed event date or talk title cannot be located reliably.
Searching for the previous value can change unrelated text, and copying the
whole template again would lose organizer edits and change shared file links.

## Decision

Extend asset reconciliation with explicit, managed text placeholders. Keep one
stable event copy per template and update only the registered content locations.
Deliver support for Google Slides and Google Docs first. Sheets, uploaded Office
files, PDFs, images, and other formats retain copying behavior; content rendering
for them requires a separately supported renderer. This ADR does not change the
current asset contract until the implementation is delivered.

### Template and data contract

Opt in per template through a versioned content contract associated with its
existing `template_kind`. Templates without that contract remain copy-only.
Validate the entire opted-in template contract before creating or modifying its
copy. Preserve existing filename substitution and folder/file identity rules.

Use literal tokens with a fixed allowlist, for example:

| Token                    | Value                                                            |
| ------------------------ | ---------------------------------------------------------------- |
| `{{event.title}}`        | Validated public meetup title.                                   |
| `{{event.date}}`         | Event date formatted for the workflow locale and event timezone. |
| `{{host.name}}`          | Host's public display name.                                      |
| `{{agenda}}`             | Ordered talk titles and public speaker display names.            |
| `{{event.feedback_url}}` | Current validated public feedback URL.                           |

The initial contract supports text only. Do not evaluate scripts, arbitrary
property paths, loops, remote includes, or expressions. Repeated occurrences of
a token are independent registered locations with the same value. Aggregate
agenda text keeps variable talk counts out of the template language.

Declare required fields and explicit fallback text for optional fields in the
contract. Unknown tokens, missing required values, or unsupported locations block
rendering that file with actionable diagnostics. Never silently erase unresolved
tokens. Use a non-empty fallback for absent optional text so managed ranges remain
addressable. Treat substituted values literally, even when they contain token
syntax. Keep text formatting in the template; do not interpret imported HTML.

Build a typed public render model in the journey from the current event,
resolved participants, and available publication results. Do not couple renderers
to Conference Hall or fetch contacts from them. Exclude emails, phone numbers,
private host addresses, survey answers, and delivery records, even if the Drive
folder is restricted. Labels, date formatting, and agenda prose use the asset
presenter's scoped English/French catalogs; tokens themselves are stable IDs.

### Persistent bindings and edit ownership

For Slides, require each managed token to occupy an entire text shape. Register
its page and shape object IDs in the copied presentation, then update that
shape's text while retaining its layout and supported style. Mixed prose and
tokens in one shape, tables, speaker notes, and master/layout content are outside
the first renderer's contract. Manual slides and unregistered shapes stay intact.

For Docs, register every supported token occurrence as a named range with a
stable binding name, including its tab and segment identity. Replace the content
and renew the range within the same batch. Start with text in body paragraphs
across supported document tabs; reject tokens in unsupported structures rather
than partially render the file. Named ranges track positions as surrounding
content moves; literal rendered values are never used as global search keys.

Store a versioned binding manifest in a managed Drive JSON sidecar associated
with the event file, under the same folder access policy. It contains the file
and template identities, contract version, token-to-location bindings, and
last-applied/pending value fingerprints. Keep only compact identity metadata in
Drive `appProperties`. Do not persist a full event/export payload or place the
manifest in issue outputs. Verify its schema, file association, and current
locations before use; missing or inconsistent state requires explicit recovery.

A location is owned by automation only while its current content matches the
last applied fingerprint or a recorded pending write. Preserve a manual edit
inside a managed location and report a conflict; do not overwrite it, rebind by
text, or detach it silently. An organizer can explicitly restore the managed
value or remove that binding through the supported recovery operation. Deleted
or duplicated anchors also require recovery. Changes outside managed locations
must survive every reconciliation.

### Safe updates and recovery

Read the current file, bindings, and public inputs; compute all desired text
before mutation. If values already match, perform no content writes. Store a
pending render intent before changing content, then issue a single content batch
per file where possible. Use Docs/Slides revision controls to reject a write
against a document changed since it was read. Reload and re-evaluate after a
revision conflict instead of overwriting a collaborator's changes.

Drive metadata and document content are not one transaction. After an ambiguous
batch response or manifest-write failure, read the file again: matching pending
fingerprints confirm success; matching prior content permits a safe retry; any
other content is a conflict. Apply the same recovery rule to initial binding
creation. Reuse an existing managed copy after a failed render; do not create a
second copy or clear delivery records to recover. An uncertain copy operation
retains the existing manual reconciliation requirement.

Record success only after validating the rendered locations and saving their
state. Each file has an independent result; successful files remain reusable
when another file fails. Preserve folder and copied-file URLs. Report content
readiness separately from URL existence: if the opted-in `slides` template is
unrendered, stale, or conflicted, hold email batches that require it and explain
how to recover. Copy-only slides keep their existing behavior. Content changes
do not resend completed emails; approval continues to cover the existing
outgoing batch inputs, not an immutable snapshot of a linked document.

Template layout/content edits do not rewrite existing event copies. Record the
contract revision used to bind each copy; later template changes affect new
copies. Migrating an existing copy to a new contract requires an explicit plan
that validates locations and preserves manual content. Existing copy-only files
remain unchanged until enrolled; never guess bindings from their current text.

### Architecture and workflow integration

The publication domain owns the placeholder contract, render plan, conflict
policy, and content repository port. The Drive asset adapter continues to own
folders, copies, metadata, and sidecars. Separate Google Docs and Slides content
adapters implement the owned content port; Google API shapes stay inside them.
The journey supplies public values and coordinates assets with publication.
Runtime composition injects the appropriate renderer by supported MIME type.

Run on issue updates and scheduled/manual audits under the shared event lock,
with document revision checks protecting concurrent human edits in Drive.
Order producer steps before rendering when their links are required. An
unavailable required link leaves that file pending; it must not trigger a
create/render loop. Enable the required Google APIs and grant the service account
only the file access and API scopes needed by supported renderers. Do not change
sharing permissions automatically.

Extend the existing asset action and shared reporting contract with safe content
status and recovery guidance. Preserve `asset-url`, `drive-files`, `slides-link`,
and locale propagation. Update communication prerequisites, workflow wiring,
and adjacent contract documentation together when content rendering ships.

## Alternatives

- One-time text replacement cannot locate values for subsequent updates.
- Searching for the previous rendered value can modify unrelated manual text.
- Replacing whole files loses edits and stable links used by speakers and mail.
- A general template engine or Apps Script installation adds execution and
  deployment requirements beyond the text population needed here.

## Consequences and delivery

Event changes update registered content while shared links and manual work stay
stable. Authors must follow the supported placement rules, and conflicts need
explicit recovery. Revision checks and manifests add state, but make retries and
ownership reviewable. Sheets and rich content remain outside the initial scope.

First deliver contract validation and public render data, then Slides binding
and recovery, then Docs binding and recovery before advertising both formats.
Publish template authoring and recovery instructions with each supported
renderer. Validate first population, changed and unchanged inputs, repeated
tokens, co-speakers, missing data, unsupported formats/locations, manual edits,
deleted anchors, tab handling, locale changes, template upgrades, interrupted
writes, stable URLs, redaction, and downstream email holds using synthetic data.
Run production quality and bundle checks when implemented.

## API references

- [Google Slides template merging][slides-merge] demonstrates initial population;
  persistent object bindings provide subsequent updates in this design.
- [Google Docs named ranges][docs-ranges] documents locating and replacing managed
  text, including renewing ranges and checking document revisions.
- [Slides batch updates][slides-batch] and [Docs batch updates][docs-batch] define
  content requests and revision controls. They do not transact Drive sidecars.

[slides-merge]: https://developers.google.com/workspace/slides/api/guides/merge
[docs-ranges]: https://developers.google.com/workspace/docs/api/how-tos/named-ranges
[slides-batch]: https://developers.google.com/workspace/slides/api/reference/rest/v1/presentations/batchUpdate
[docs-batch]: https://developers.google.com/workspace/docs/api/reference/rest/v1/documents/batchUpdate
