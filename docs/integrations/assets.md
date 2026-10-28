# Google Drive event assets

The issue-update and daily-audit workflows create an event folder, copy its
templates, and save the folder URL in **Drive Link** on the issue.

## Configure

Create three distinct Drive folders: a parent for event folders, a folder
containing the template files, and one shared folder named `public` for all
events' generated PDFs. Give the service account read access to the
templates and permission to create folders, copy files and update files in the
parent and move/update/share permission for generated PDFs in `public`. Shared
drives are supported. The folder can remain restricted: the automation grants
unlisted reader access to each verified PDF. Configure access to editable
documents for speakers and organizers separately.

Follow [repository setup](../usage/setup.md), then pass these settings to both
`event-reconcile.yml` and `event-reconcile-active.yml`:

| Consumer setting                            | Reusable workflow parameter             |
| ------------------------------------------- | --------------------------------------- |
| Secret `GOOGLE_SERVICE_ACCOUNT_CREDENTIALS` | Secret `google-credentials`             |
| Variable `GOOGLE_DRIVE_FOLDER_ID`           | Input `google-drive-folder-id`          |
| Variable `GOOGLE_DRIVE_PUBLIC_FOLDER_ID`    | Input `google-drive-public-folder-id`   |
| Variable `GOOGLE_DRIVE_TEMPLATE_FOLDER_ID`  | Input `google-drive-template-folder-id` |

The credential is the service-account JSON, including `type`, `client_email` and
`private_key`. The credential and all three folder IDs are required.
Folder settings contain IDs, not URLs, and must differ. Missing or invalid settings fail asset
reconciliation.

Asset reconciliation also requires the three [publication URL inputs](../reference/configuration.md#publication-url-inputs).
Use the asset folder prefix for Drive Link validation and the configured Meetup
and community prefixes when selecting the next event to promote.

## Prepare templates

The template folder must contain at least one file and no subfolders. Each file
needs a non-empty, unique `template_kind` in its Drive `appProperties` metadata,
such as `slides` or `attendance`. Use `slides` for the event presentation: email
batches require the direct URL of that managed copy. Set this metadata through the Drive API using
the same application credentials used by the automation.

Filename templates use the [shared expression syntax and date formats](../reference/templating.md).
For example, `Slides [EVENT_DATE:YYYY-MM-DD]` becomes `Slides 2026-10-15`.
Only the event date is available in filenames, and its format is required.
Reconciliation validates all template filenames before any folder or file
mutation. Announcement image validation uses the same renderer and workflow locale.

Templates remain copy-only unless their kind has a content contract in the
consumer's committed `.github/meetup-asset-content.json`. Google Slides and
Google Docs support managed text, speaker portraits, and host logos. Sheets,
uploaded Office files, PDFs and standalone images remain copy-only. Enable the Drive,
Slides and Docs APIs in the service-account project for the formats used. The
existing Drive OAuth scope authorizes these file operations; access still depends
on the service account's file permissions. Automatic permission grants apply
only to the verified presentation PDF; copied templates retain their existing
sharing policy.

## Author managed content

The configuration has `version: 1`, a `contracts` map keyed by `template_kind`,
optional `venues` and `hostLogos` maps keyed by stable host ID, and an optional
`events` map keyed by `owner/repository#issue-number`. This
synthetic example opts in the `slides` template:

```json
{
  "version": 1,
  "contracts": {
    "slides": {
      "version": 1,
      "revision": "slides-v1",
      "kind": "slides",
      "fields": [
        { "type": "text", "token": "event.title", "required": true },
        { "type": "text", "token": "event.date", "required": true },
        { "type": "text", "token": "host.name", "required": true },
        { "type": "text", "token": "host.city", "required": true },
        { "type": "text", "token": "agenda", "required": true },
        {
          "type": "text",
          "token": "talk.title",
          "slot": "opening",
          "required": true
        },
        {
          "type": "text",
          "token": "talk.abstract",
          "slot": "opening",
          "required": false,
          "fallback": "Details coming soon"
        },
        {
          "type": "text",
          "token": "speaker.name",
          "slot": "portrait-a",
          "required": true
        },
        {
          "type": "text",
          "token": "next_event.date.numeric",
          "required": false,
          "fallback": "To be announced"
        },
        {
          "type": "text",
          "token": "event.feedback_url",
          "required": false,
          "fallback": "Feedback opens soon"
        },
        {
          "type": "image",
          "token": "speaker.picture",
          "slot": "portrait-a",
          "objectId": "REPLACE_IMAGE_OBJECT_ID",
          "pageId": "REPLACE_PAGE_OBJECT_ID",
          "required": false,
          "fit": "CENTER_CROP",
          "fallback": {
            "url": "https://images.example.org/generic-speaker.png",
            "description": "Speaker portrait"
          }
        },
        {
          "type": "image",
          "token": "host.logo",
          "slot": "host-logo",
          "objectId": "REPLACE_LOGO_OBJECT_ID",
          "pageId": "REPLACE_PAGE_OBJECT_ID",
          "required": false,
          "fit": "CENTER_INSIDE",
          "fallback": {
            "url": "https://images.example.org/generic-host.png",
            "description": "Host logo"
          }
        }
      ]
    }
  },
  "venues": {
    "host-example": {
      "address": "1 Public Square",
      "postalCode": "13001",
      "city": "Marseille"
    }
  },
  "hostLogos": {
    "host-example": {
      "url": "https://images.example.org/host-example.png",
      "description": "Example host logo"
    }
  },
  "events": {
    "example/meetups#42": {
      "speakers": { "portrait-a": "speaker-example" },
      "talks": {
        "opening": {
          "provider": "conference-hall",
          "event": "example-cfp",
          "id": "proposal-one"
        }
      }
    }
  }
}
```

Replace the example IDs and image URLs with real template IDs and public images,
including separate generic portrait and logo fallbacks. Obtain object, page and
tab IDs using the corresponding Google API `get` operation. The configuration supports at most 100 fields per
contract and 500 registered locations per file. Configuration and sidecars are
limited to 1 MB. Revisions and slot names use letters, digits, underscores,
dots, colons or hyphens, with at most 100 characters. A slotted text field's
complete `token:slot` key must also fit within 100 characters. Assignment maps
and the public venue and host-logo maps each accept at most 200 entries; reserved
object keys are not valid assignment slot names.

Text fields use the [shared template syntax](../reference/templating.md), including
`{{token}}`, `{{token:slot}}` for a slotted field, and
`{{event.date:FORMAT}}` for an explicitly formatted date. The complete allowlist is:

| Token                                           | Public value                                                            |
| ----------------------------------------------- | ----------------------------------------------------------------------- |
| `event.title`                                   | Validated event title.                                                  |
| `event.date`                                    | Localized long event date.                                              |
| `event.date.month`                              | Localized month name.                                                   |
| `event.date.numeric`                            | Event date as `DD/MM/YYYY`.                                             |
| `event.date.weekday`                            | Localized weekday and full event date.                                  |
| `host.name`                                     | Resolved host display name.                                             |
| `host.address`, `host.postal_code`, `host.city` | Explicit public venue fields.                                           |
| `agenda`                                        | Ordered talk titles and all public co-speaker names.                    |
| `event.feedback_url`                            | Public feedback URL.                                                    |
| `talk.title`, `talk.abstract`, `talk.speakers`  | Slotted selected proposal title, abstract, and public co-speaker names. |
| `speaker.name`                                  | Slotted public speaker name using the same assignment as portraits.     |
| `next_event.date`, `next_event.date.numeric`    | Next published meetup date, localized long form or `DD/MM/YYYY`.        |
| `next_event.host.name`, `next_event.host.city`  | Next published meetup's host display name and explicit public city.     |

Dates preserve the event timezone's calendar day; month and weekday names use
the workflow locale. The `.numeric` fields use `DD/MM/YYYY`. Speaker lists use
English or French list formatting. Required missing values block the file;
optional text needs an explicit non-empty fallback in the template's language.
Values are inserted literally, including token-looking text or HTML.

For an explicit date format, declare `format` on `event.date` or
`next_event.date`, and use the same pattern in the template expression:

```json
{
  "type": "text",
  "token": "event.date",
  "format": "D MMMM YYYY",
  "required": true
}
```

This field binds `{{event.date:D MMMM YYYY}}` or `[EVENT_DATE:D MMMM YYYY]`.
The [date format reference](../reference/templating.md#date-formats) lists supported
patterns. Multiple formats of the same date are distinct bindings. Format operands
are limited to 100 characters; they apply only to calendar-date fields and cannot
be combined with participant slots. Invalid patterns leave the file pending before
content writes. Optional missing dates use their literal fallback.

For `{{talk.title:opening}}`, declare `token: "talk.title"` and `slot: "opening"`.
Assign that slot to the proposal's exact `provider`, `event`, and `id` in the
current event's `talks` map. Values come from the refreshed, selected Conference
Hall proposal snapshot; `talk.abstract` uses its public abstract. Reordering the
agenda retains the assignment. Removing the proposal, a duplicate identity, an
unresolved selection, or stale source data leaves the slot missing. A manual
agenda entry without a proposal identity can appear in `agenda` but cannot fill
a talk slot. Extra talks require additional authored slots; extra co-speakers
can use `talk.speakers` or explicit separate speaker/portrait slots.

For `{{speaker.name:portrait-a}}`, use the event's `speakers` mapping. The speaker
must still appear in the current validated agenda. Name and image slots share
the stable ID; a missing portrait does not prevent a valid public name. Missing
participants follow each field's required/fallback policy instead of silently
moving the next participant into the slot.

Public venue values are committed explicitly under `venues[host-id]` with
`address`, `postalCode`, and `city`. All three must be non-empty. Private host
contact addresses are never used as a fallback. Supply only venue information
intended for public documents.

Next-meetup lookup runs only when a configured contract declares a `next_event.*`
field. It selects the earliest strictly later date among open `meetup` issues
in the same repository with scheduled status, a confirmed resolved host, a valid
date, and a valid Meetup or CNCF publication URL. Same-date ties use the lowest
issue number. Cancelled, postponed, held, unpublished, and same-day events are
excluded. The name of the host comes from the validated referential; its city comes
from the same public venue map. A complete listing without an eligible candidate
leaves the next-event fields missing; an unavailable public venue value also
remains missing. API or unexpected decoding failures fail the action. Lookup
is limited to 200 distinct issues and 20 pages; repeated cursors or exceeded
limits fail explicitly. It never selects from a partial result or edits candidate
issues.

In Slides, put each text token in an entire, ungrouped text shape with uniform
text styling. Repeated tokens use separate shapes. Tables, grouped shapes,
speaker notes, masters, layouts and mixed prose/token shapes are unsupported.
The renderer preserves shape geometry and uniform text style. Manual slides
and unregistered elements remain untouched.

In Docs, place tokens in body paragraphs, including child tabs. Repeated
occurrences receive independent named ranges. Header/footer, footnote and table
tokens are unsupported; suggestions inside managed content must be resolved
first. The renderer renews named ranges when replacing text, and follows them
when surrounding content moves. It does not search for previously rendered text.

Image fields refer to actual placeholder images, not printed URLs. Slides uses
`pageId` and `objectId`; Docs uses `tabId` and the inline image's `objectId` in a
body paragraph. For `speaker.picture`, assign each slot to an explicit stable
speaker ID in that event's `speakers` map. Reordering the agenda does not reassign portraits, and
co-speakers need separate slots. A removed or unbound speaker uses the optional
fallback instead of retaining the old portrait. Public URLs come from the
committed speaker referential's optional `picture_url` column; renderers never
contact Conference Hall or receive contact records.

For `host.logo`, configure the public image's `url` and non-empty `description`
under `hostLogos[host-id]`. The renderer selects the current event's resolved
host by stable ID; it does not match display names or read contact data.
The contract's `slot` names the image binding and needs no per-event assignment.
Multiple logo locations can use separate slots for the same current host.
Changing the host or the image bytes updates the bound logo. A missing,
unresolved, unconfigured, or invalid source uses the optional generic fallback
instead of retaining the previous logo; a required logo leaves the file pending.
Manual replacements remain conflicts. Logos are independent of agenda and venue
assignments. Community branding and unregistered sponsor images remain manual.

Images and fallbacks must be publicly retrievable HTTPS PNG, JPEG or GIF files,
smaller than 50 MB, at most 25 megapixels, with source URLs no longer than
2 KB. Retrieval permits at most three redirects, validates each destination,
rejects non-public network addresses and credential-bearing URLs, and forwards
no integration credentials. Media type and dimensions are checked before
mutation. Keep source images available to Google after preflight. Prefer stable
public URLs; changing bytes at the same URL is detected on reconciliation.

The repository provides a [generic speaker portrait](../../assets/template-fallbacks/generic-speaker.png)
and [generic host logo](../../assets/template-fallbacks/generic-host.png) for
optional image bindings. Use their raw GitHub URLs pinned to the automation
commit deployed by the consumer, so fallback images remain publicly retrievable
without Drive credentials or temporary delivery URLs.

Both renderers use explicit center crop. Slides also accepts `CENTER_INSIDE`;
use it for logos that should fit entirely inside their frame. Docs rejects it;
prepare a padded logo image for `CENTER_CROP` when cropping would cut off branding.
Image replacement can remove provider effects; no preservation
of shadows, recoloring or other image effects is promised. Supply meaningful
generic alt text on placeholder images. Slides updates the description from
the public image value; Docs retains the authored description because its image
replacement API does not update alt text. A validated optional fallback reports
a warning and counts as ready. Failure of a required image or its fallback
leaves the file pending.

## Run and retry

An issue needs a valid date and a host resolved from the
[referentials](../reference/referentials.md). Cancelled and unrelated issues are
skipped. Event folders use `YYYY-MM-DD - Month - Host`, with English month
names.

Each issue owns one managed folder. Changing its date or host renames that
folder. Folders are found by their stable `meetup_event_key` metadata across
the locations accessible to the service account. You can move completed-season
folders into `_archives/YYYY`; reconciliation reuses them in place, keeps their
IDs and URLs, and updates the issue's **Drive Link**. Only new event folders are
created under the configured parent. Keep the service account's access to the
archived folders and their files when moving them.

Each template file owns one managed copy: changes to template names or
kinds update the copy's name and metadata; changes to template contents do not
replace existing copy contents. New templates produce new copies.

New opted-in copies validate their whole contract, locations and values before
copying. A binding sidecar freezes the contract revision for that copy. Later
template or contract edits affect new copies; they do not overwrite existing
layouts or manual work. Existing copy-only files remain copy-only until an
explicit enrollment. Upgrading an enrolled copy's contract needs a separately
reviewed migration plan that preserves manual content and file identity.

Managed copies store a compact identity marker in Drive `appProperties` and a
`.FILE_ID.bindings.json` sidecar in the event folder. The sidecar contains
identities, the bound contract, locations, fingerprints and pending write state;
it contains no event export, contacts or temporary Google image delivery URLs.
Keep it under the folder's existing access policy. Do not publish it in issues.
Rendering stores intent before a revision-controlled document batch, validates
the resulting locations, then saves success. An unchanged file receives no
content write. Manual edits inside registered locations are conflicts; changes
outside them survive reconciliation.

Files are identified by stored metadata, not their names. Manually created files
with matching names are left alone. Repeated successful runs reuse managed
assets. When automation is enabled, it sets **Drive Link** to its managed
folder.

If Drive succeeds but saving the issue fails, rerun to reuse the assets and save
the link. If a Drive write times out or has an uncertain result, inspect Drive
before retrying: an interrupted response can leave a created file or folder.
Duplicate managed folders or copies require manual reconciliation, including
an event folder present both at the root and in an archive. An incomplete Drive
search stops reconciliation before another folder can be created. For access
errors, check service-account permissions and quota; for rate limits, retry
later.

The direct
[document action](../../actions/assets/reconcile-documents/README.md) reconciles
folders, template copies and document content on every invocation. Call it under the shared event workflow lock. Its
`drive-files` output maps each `<template_kind>-link` to a copied file URL.
`slides-ready` is true only when a slides URL exists and its content is copy-only
or ready. Rendering codes appear in the technical report and `diagnostics`
output; organizer corrections and recovery guidance appear in the merged
checklist. The `pdf-source` output contains public file identities and an opaque
issue revision. `assets/reconcile-slides-pdf` checks this revision against a fresh
issue read before exporting; an intervening edit requires a rerun. The managed folder URL is saved on the issue.
Both event workflows produce feedback before rendering and pass the
`slides-link` entry and `slides-ready` to communications. An existing URL alone
does not make opted-in content ready. Pending or conflicted slides hold due
email batches; other successfully rendered files remain reusable. Completed
emails are not resent when document content changes. Approval covers the email
batch inputs and stable links, not an immutable snapshot of linked content.
**Drive Link** continues to identify the
folder; email slides links identify the presentation file. See
[email link requirements](communications.md#presentation-link).

## Export the presentation PDF

The workflow runs `assets/reconcile-slides-pdf` after document reconciliation.
Only this action receives the public destination folder ID. A PDF failure does
not block independent event or email work with successfully prepared documents;
it keeps the assets stage incomplete for organizer reporting.

Asset reconciliation exports the managed Google Slides presentation as a separate
PDF when post-event follow-up is due. With a valid event date and timezone, that
means an explicitly `held` event or a `scheduled` event whose local calendar day
has ended. Cancelled, postponed and unknown occurrences are ineligible. The
normal workflows process open issues only; closing an issue stops automatic
exports and recovery. Moving its Drive folder into an archive does not change
file identity or prevent reconciliation while the issue remains open.

The source must have a stable managed template identity and `ready` or
`copy-only` content. Pending or conflicted source content blocks export. The PDF
uses the presentation's name, adds the event date if needed, and ends in `.pdf`.
Names are bounded to 204 characters. The existing editable Slides file remains
the email target. Download the PDF from the configured shared `public` folder.
**Drive Link** continues to identify the event folder. After verifying placement
and file-level reader access, the action writes **Slides PDF** to the issue. A pending or conflicted
export clears that link. [Meetup attendee delivery](event-publication.md#send-slides-to-attendees)
uses it to send the PDF to members marked as having attended.

Set `GOOGLE_DRIVE_PUBLIC_FOLDER_ID` to the existing `public` folder's ID
and forward it as `google-drive-public-folder-id`. The same destination
is used for every event, regardless of where its event folder is archived.
The automation validates the destination by ID, name and folder type. It does
not create per-event public folders or search for a shared folder by name.

The service account needs permission to export the source and create/update
binary files in the event folder, move PDFs into the shared folder, update them,
and grant permissions on the PDF itself. Shared-drive policy must permit
anyone-with-the-link sharing. New exports are uploaded and verified in the event folder before
being moved; existing exports are refreshed in place. The Drive API must be
enabled. Exported bytes are limited to 10,000,000 bytes and checked for PDF
media type, signature and
end marker before upload. Each request has a 30-second timeout; downloads also
have a 30-second abort signal. Oversized exports need a smaller presentation.
Access, transport and persistence failures remain technical action failures.
Denied PDF permission access or incompatible public grants remain pending with
organizer guidance to correct sharing before retrying.

One managed PDF is refreshed in place when the observed Drive source version or
export filename changes. Its URL stays stable. An unchanged source and unchanged
inputs cause no export or content write after the existing PDF's bytes are
verified. Drive versions include metadata changes, so those can also trigger an
export. The PDF is a rendered snapshot that can be refreshed, not an immutable
record of what was shown on the event date.

The PDF has separate `meetup_pdf_source` identity metadata and no template-copy
marker. Its description is the public event identifier. Source/template
provenance and the export contract are stored in Drive metadata; embedded PDF
document properties are not controlled. Once the PDF is verified in the destination,
the automation grants `type=anyone`, `role=reader`, `allowFileDiscovery=false`
on that file and reads its permissions back before reporting readiness.
Anyone with its link can view the PDF. The destination folder can stay restricted;
its permissions, editable sources, and export sidecars are not changed.
Existing unlisted reader access is reused. Broader, searchable, or ambiguous
public permissions require organizer review rather than being overwritten.
Editable sources and export sidecars stay in the event folder and are never moved with the PDF.
A dedicated `.SOURCE_FILE_ID.pdf-export.json` sidecar holds the reserved PDF ID,
source version, filename and SHA-256 fingerprints of pending and confirmed
exports. Its schema is separate from content bindings and its size is bounded
to 65,536 bytes. Keep this state private to the event folder.

The workflow lock serializes runs for each event. Source versions are compared
before and after export; a changing source stays pending. The PDF and sidecar
are reread before updates to detect intervening edits. These checks are not a
transaction with human Drive edits; finish edits before running reconciliation.

### Recover a PDF export

Rerun after a transport failure. The automation verifies actual PDF bytes before
confirming a pending upload. Matching previous content allows a retry using the
same reserved file ID. A lost create response never authorizes creating a second
PDF. Failed or incomplete searches stop the run; duplicate managed identities
require manual reconciliation. A verified PDF still in its event folder is moved
with the same file ID, even when no new export is needed. A failed or uncertain
move is retried or verified on the next run without another upload. The action
reports readiness only after checking the destination, PDF bytes, and public-reader
permission. An uncertain grant is inspected on the next run before any retry;
an existing grant is reused without another export or PDF upload. Missing reader
access is repaired on the same managed PDF. If the
configured folder is unavailable or renamed, restore its access and `public`
name before retrying; do not switch destinations for existing managed PDFs.

If sharing is denied, allow the service account to share individual files and
check the shared drive's external-sharing policy. For a permission conflict,
review the managed PDF's General access setting: it must be "Anyone with the link"
and "Viewer", without search discovery. Do not broaden the folder's access or
recreate files to retry. Generated cover media have a separate
[public-access requirement](content.md#configure-the-repository).

For a conflict, stop editing and inspect the PDF and its export sidecar together.
Preserve any manual work in a separate unmanaged file. Restore the verified PDF
bytes and matching export state from a trusted backup or Drive history before
retrying. A missing or malformed sidecar cannot be reconstructed from the current
PDF alone. Do not delete the managed files, change their IDs, clear email delivery
records, or use content-binding `restore`, `remove` or `enroll` entries to replace
a PDF. Unmanaged files with the same filename are left alone.

PDF status appears as technical facts in the action report. Expected corrections
appear in the merged organizer checklist and Slack; they do not alter
`slides-ready` or add an email prerequisite. Unexpected failures still fail the
asset action and prevent dependent workflow steps. Ineligible or unready runs
preserve an existing PDF without treating it as a fresh export.

## Recover a content conflict

Inspect the file and its sidecar before recovery. Do not delete the managed copy,
recreate its URL or clear delivery records. An uncertain copy operation still
requires manual inspection for duplicate files. Missing, duplicate or malformed
sidecars require restoring verified state; they are never guessed from rendered
text. After a lost text response, matching pending fingerprints confirm success;
matching previous content allows a safe retry. An uncertain image write requires
explicit recovery when the stored observations cannot prove the result.

For an intact binding with a manual edit, either restore the last managed value
yourself or commit a one-time recovery entry under the event's `recovery` map:

```json
{
  "COPY_FILE_ID": {
    "operation": "restore",
    "revision": "CURRENT_DOCS_OR_SLIDES_REVISION_ID",
    "bindingId": "BINDING_ID_FROM_SIDECAR"
  }
}
```

Read the current revision through Docs or Slides immediately before approving
the operation. `restore` authorizes replacing that location with the currently
resolved value. `remove` stops managing that one binding and leaves its content
alone; it can also remove a deleted anchor. Recovery rejects a changed document
revision and records consumption so the same request cannot repeatedly overwrite
future edits. Remove the committed request after success. Missing or duplicated
anchors must be repaired explicitly or removed; automation never rebinds by
matching text or image similarity.

To enroll a copy-only file, use `operation: "enroll"` with its current revision
and omit `bindingId`. The copy must contain the authored tokens and image IDs
from the selected contract. Review and preserve organizer edits before adding
those locations. Enrollment validates them before marking the file as managed.
For a missing initial sidecar, enrollment is possible only after explicitly
restoring the authored placeholders; an already rendered file is not scanned
for old values. Recovery runs through the normal workflow under the event lock.

## Approved event cover

Managed image fields support `event.cover` for the exact selected and approved
content image. See [content review](content.md#decide-and-apply) for eligibility,
required binding settings, and changed-image behavior.
