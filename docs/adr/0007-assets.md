# Managed documents, images, and presentation PDFs

Status: Accepted decisions consolidated on 2026-10-23.

Scope: template contracts, editable document ownership, image rendering, and
presentation PDF snapshots. Authoring, configuration, and recovery live in the
[asset integration guide](../integrations/assets.md).

## Context

Copied templates must follow event corrections without overwriting organizer
edits. Replacing visible tokens once loses the identity needed for later updates.
The editable presentation also differs from the downloadable PDF shared after an
event: their ownership, identity, readiness, and recovery rules are distinct.

## Accepted decisions

Keep stable event folder and copied-file identities with explicit template kinds.
Templates opt into managed rendering through a versioned content contract. Files
without one remain copy-only. Do not mutate the original template or automatically
migrate an existing copy when the template changes.

Publication owns render policy and provider-neutral data. Journey supplies public
event and participant projections. Drive owns folders, files, and sidecars;
Docs/Slides adapters own provider operations; image adapters validate retrieval and
media. Generated cover proposals have their separate
[review contract](0008-draft-generation.md).

### Filename expressions

Parse filenames as `[ENTITY_PROPERTY:FORMAT]` expressions. Resolve the entity
and its property separately, then apply the format selected by the `:` operator.
The shared presentation templater owns the expression grammar. Publication owns
the allowed filename field `EVENT.DATE` through an injected rendering port;
runtime composition binds the
workflow locale. Explicit numeric patterns retain their order, and textual month
and weekday patterns use that locale without shifting the event's calendar day.

Asset reconciliation and announcement validation share this renderer. Validate
every template filename before mutating folders or files; unsupported fields,
operators, and date formats do not remain unresolved in copied names. Literal
labels remain template-authored. This contract is distinct from managed document
content bindings. The same engine parses and renders managed Docs and Slides
fields, including explicit date formats and existing participant slots.

The engine contains no event model, field registry, provider API, or approval
policy. Both supported expression spellings produce one parsed model and precise
UTF-16 occurrences. Provider adapters retain all location, styling, and ownership
constraints. Rendered values remain literal and are never parsed recursively.
Format-specific binding identities are deterministic; existing unformatted and
slotted identities remain unchanged.

### Explicit bindings and public fields

Use a closed token registry and explicit registered targets: whole text shapes in
Slides, supported named ranges in Docs, and real image object identities. Retain
document tab and segment identity where applicable. Never find a managed target
by searching for its previous visible value or overwrite an unregistered object.

Render aggregate agenda fields and explicit participant slots. Bind slots to
stable proposal identities within their provider and event scope, so a title or
name correction does not silently reassign a participant. Expose public event,
speaker, host, and venue projections; private contact addresses are not venue
data. Next-meetup fields use the strictly later eligible event from a validated
lookup. A failed lookup must not produce a partial authoritative projection.

Required missing values keep the asset pending. Optional values require declared
fallbacks: nonempty text or valid image content as appropriate. Host logos come
from the public host map, not private contact data. Preserve manual branding and
unmanaged images. Respect the chosen image-fit behavior rather than stretching
or replacing unrelated objects.

### Durable edit ownership and recovery

Store a versioned binding manifest with target identities, contract identity,
source fingerprints, and last applied values. Compare current provider content
with those bindings before writing. A human change to managed content creates an
ownership conflict rather than authorizing an overwrite.

Persist pending intent before a provider batch and use revision checks. Verify
the resulting content before finalizing bindings. Retries reconcile uncertain
effects instead of blindly repeating them; an image object ID or source URL alone
does not prove that uncertain replacement bytes were accepted. Preserve existing
content and surface incomplete or conflicting bindings for explicit recovery.

### A separate PDF snapshot

Export the presentation as a managed static PDF in the public shared event folder.
It is a distinct artifact with its own stable file ID and provenance metadata,
not another template copy or a document binding. Refresh that same managed file
when the editable source changes; this does not create an immutable revision
archive. Do not change sharing permissions automatically.

Journey determines post-event eligibility using the shared
[lifecycle policy](0004-organizer-workflow.md#lifecycle-and-follow-up). Reconcile only
open eligible issues. The source must be ready or explicitly copy-only. Capture
and recheck its provider revision around export, validate the returned PDF, and
verify the resulting file and placement before acknowledging completion.

Reserve uncertain creates, recover by identity and metadata, and retain pending
state until readback establishes the effect. Conflicting manual PDF edits require
review; an uncertain response does not justify another create. PDF reconciliation
never resets email delivery records or other asset identities.

Document reconciliation and PDF export are separate actions. Email retains the
editable presentation link; PDF export readiness does not gate an otherwise ready
email batch. A PDF failure remains visible through its own stage evidence without
invalidating independent work.

### Meetup attendee delivery

Expose the verified public PDF URL in the issue. The publication workflow uses
Meetup's Contact attendees form with the attended-only RSVP filter to send that
link after the event. The communication ledger reserves delivery before submission
and records acceptance before updating the issue checklist. Uncertain sends
require verification; PDF refreshes and issue retries never resend accepted work.
The browser adapter owns recipient selection and confirmation; journey owns
eligibility, concurrency, delivery state and issue completion.

## Alternatives and consequences

One-time text substitution cannot track later edits safely. Replacing entire
files would erase organizer work and change links. Managing arbitrary provider
objects or guessing data from contact fields would broaden ownership beyond the
declared contract. Automatically editing templates or migrating old bindings would
silently change an author's document contract.

Keeping only editable slides would omit the shareable final snapshot. Replacing
the editable file with a PDF would lose its original identity and editing surface.
A separate stable PDF preserves both uses but requires provenance, revision
checks, and recovery for uncertain writes.

Explicit contracts and sidecars add setup and state. Their benefit is a bounded
write surface with detectable manual conflicts and stable links across retries.
Provider limits and supported object types remain constraints documented in the
integration guide.

## Decision history

On 2026-10-26, manual Meetup slide sharing was replaced by automatic attendee
messaging. The organizer supplied the Contact attendees flow and French message.
The supplied saved page and browser assets established the contact URL, RSVP
checkboxes, rich-text editor and successful-send notification. Synthetic browser
tests exercise those controls without contacting real attendees.
The editable presentation remains the target of host and speaker emails; only
attendee delivery requires the public PDF. This extends the PDF decision without
changing existing artifact identities or host/speaker delivery policies.

Later on 2026-10-23, the filename-only parser and runtime date formatter were
replaced by `packages/presentation/templating`. Separate filename, Slides, and
Docs parsers duplicated grammar and prevented consistent date formatting across
outputs. Publication now consumes a rendering port, and provider adapters use the
shared parser. Existing authored spellings and durable slot identities remain
supported; managed calendar-date fields can declare an explicit format.

On 2026-10-23, structured filename expressions replaced literal substitution of
the complete `[EVENT_DATE:YYYY-MM-DD]` token. The literal approach supported only
one date format and concealed entity/property resolution. Separating parsing,
field resolution, and localized formatting allows template-authored formats
without moving locale policy into the Drive adapter or adding a second naming
configuration. The original ISO-style expression retains its output.

| Original record                                                                     | Retained decision or later refinement                                                                                                       |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| [0014: Managed placeholders](archive/0014-reconcile-drive-template-placeholders.md) | Established opt-in contracts, durable bindings, edit ownership, and recovery.                                                               |
| [0015: Render fields](archive/0015-extend-asset-render-fields.md)                   | Extended aggregate fields with explicit participants, venue, and next-meetup data. Later failure classification rejects incomplete lookups. |
| [0016: Host logos](archive/0016-render-host-logos.md)                               | Added public host logo rendering without changing contact-field ownership.                                                                  |
| [0023: Presentation PDF](archive/0023-export-pdf-final-asset.md)                    | Added a separate stable PDF snapshot with provenance and recovery.                                                                          |
| [0024: Action scopes](archive/0024-scoped-actions-and-workflow-composition.md)      | Separated document and PDF actions and superseded PDF readiness as an email prerequisite.                                                   |
