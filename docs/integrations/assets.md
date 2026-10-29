# Google Drive event assets

The issue-update and daily-audit workflows create an event folder, copy its
templates, and save the folder URL in **Drive Link** on the issue.

## Configure

Create three distinct Drive folders: a parent for event folders, a folder
containing the template files, and one shared destination for all
events' generated PDFs. Folder IDs are authoritative; folder names are unrestricted.
Give the service account read access to the
templates and permission to create folders, copy files and update files in the
parent and move/update/share permission for generated PDFs in the destination. Shared
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

Google Slides and Google Docs discover managed fields directly from their native
text and image alt titles. No asset configuration file or object-ID mapping is
needed. Templates without expressions, Sheets, uploaded Office files, PDFs and
standalone images remain copy-only. Enable the Drive, Slides and Docs APIs for
the formats used. The service account needs access to each template and copy.

## Author managed content

Write the [shared template expressions](../reference/templating.md) directly in
the Google file. For example, `{{event.title}}`, `{{event.date:D MMMM YYYY}}`,
`{{talk.title:1}}`, and `[SPEAKER_NAME:1]`.

| Token                                           | Public value                                                                |
| ----------------------------------------------- | --------------------------------------------------------------------------- |
| `event.title`                                   | Validated event title.                                                      |
| `event.date`                                    | Localized long event date.                                                  |
| `event.date.month`                              | Localized month name.                                                       |
| `event.date.numeric`                            | Event date as `DD/MM/YYYY`.                                                 |
| `event.date.weekday`                            | Localized weekday and full event date.                                      |
| `host.name`                                     | Resolved host display name.                                                 |
| `host.address`, `host.postal_code`, `host.city` | Explicit public venue fields.                                               |
| `agenda`                                        | Ordered talk titles and all public co-speaker names.                        |
| `event.feedback_url`                            | Public feedback URL.                                                        |
| `talk.title`, `talk.abstract`, `talk.speakers`  | Talk title, abstract, and co-speaker names at the numbered agenda position. |
| `speaker.name`                                  | Public speaker name at the same numbered position as portraits.             |
| `next_event.date`, `next_event.date.numeric`    | Next published meetup date, localized long form or `DD/MM/YYYY`.            |
| `next_event.host.name`, `next_event.host.city`  | Next published meetup's host display name and explicit public city.         |

Numbered selectors are one-based positions in the current validated agenda,
from 1 to 200. Talks follow agenda order. Speakers follow their first appearance
in that order, with co-speakers in their listed order and repeated speakers
counted once. Reordering or removing agenda entries changes those positions.
`{{speaker.name:1}}` and `{{speaker.picture:1}}` select the same person.
A template needs a location for every participant it intends to show; rendering
does not add slides or duplicate layouts. Manual talks use their description as
the title. Selected Conference Hall talks use the refreshed public title and
abstract. Stale or unresolved agenda data is withheld.

The workflow locale controls date and list formatting. Explicit date operands
apply only to `event.date` and `next_event.date`; see the
[date formats](../reference/templating.md#date-formats). Values remain literal,
even when they contain template syntax. Missing next-event fields and talk
abstracts use localized "To be announced" text. Other missing text values leave
the file pending before copying or writing content.

Public venue fields come from `venue_address`, `venue_postal_code`, and
`venue_city` in the [host referential](../reference/referentials.md#hosts).
Private contact addresses never supply public template values.

Next-event lookup runs only for templates using `next_event.*`. It selects the
earliest strictly later open, scheduled event under the configured event label,
with a confirmed resolved host and valid publication URL. Same-date ties use the
lowest issue number. Cancelled, postponed, held, unpublished, and same-day events
are excluded. The name of the host and its public city come from the validated referential.
Lookup is bounded to 200 distinct issues and 20 pages. Incomplete listings,
repeated cursors, and provider failures stop the action; no partial result is used.

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

For an image, insert a real placeholder image. Put exactly one expression in
its **alt title**, and a meaningful human-readable explanation in its **alt
description**:

| Alt title               | Image source                                             |
| ----------------------- | -------------------------------------------------------- |
| `{{speaker.picture:1}}` | First speaker's public `picture_url`.                    |
| `{{host.logo}}`         | Current host's public `logo_url` and `logo_description`. |
| `{{event.cover}}`       | Selected and approved event cover.                       |

Slides images must be ungrouped on a slide. Docs images must be inline in a body
paragraph. Native object, page, and tab IDs are discovered automatically.
Multiple placeholders may show the same source. Community branding and unmarked
images remain manual. Missing or unusable speaker portraits and host logos use
the automation's generic images and report a warning. The approved cover is
required and has no fallback.

Images and fallbacks must be publicly retrievable HTTPS PNG, JPEG or GIF files,
smaller than 50 MB, at most 25 megapixels, with source URLs no longer than
2 KB. Retrieval permits at most three redirects, validates each destination,
rejects non-public network addresses and credential-bearing URLs, and forwards
no integration credentials. Media type and dimensions are checked before
mutation. Keep source images available to Google after preflight. Prefer stable
public URLs; changing bytes at the same URL is detected on reconciliation.

Slides fits host logos with `CENTER_INSIDE`; portraits and covers use
`CENTER_CROP`. Docs uses `CENTER_CROP` for all images, so pad logos when necessary.
Image replacement does not promise to retain provider effects such as shadows
or recoloring. Slides updates the image description from the public value; Docs
retains the authored description. Generic images and missing-text messages are
owned by the automation and need no consumer configuration.

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

New managed copies validate discovered fields, locations and values before
copying. A binding sidecar freezes the contract revision for that copy. Later
template edits affect new copies; they do not overwrite existing
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
the email target. Download the PDF from the configured shared destination.
**Drive Link** continues to identify the event folder. After verifying placement
and file-level reader access, the action writes **Slides PDF** to the issue. A pending or conflicted
export clears that link. [Meetup attendee delivery](event-publication.md#send-slides-to-attendees)
uses it to send the PDF to members marked as having attended.

Set `GOOGLE_DRIVE_PUBLIC_FOLDER_ID` to the existing public root's ID and
forward it as `google-drive-public-folder-id`. Its display name is arbitrary.
Create these two direct child folders under that root:

- `slides`: generated presentation PDFs, shared across all events.
- `tmp-covers`: generated cover candidates awaiting or retaining content review.

The automation resolves each destination by its exact child name under the
configured root ID. It requires one existing, non-trashed folder with that name;
missing, duplicate, malformed, or incomplete lookup results block the operation.
It never creates destination folders or falls back to writing files in the root.
The same layout applies when private event folders are archived. It does not
create per-event public folders. Keep referenced cover candidates: there is no
automatic cleanup of `tmp-covers`.

The service account needs permission to export the source and create/update
binary files in the event folder, move PDFs into the shared folder, update them,
and grant permissions on the PDF itself. Shared-drive policy must permit
anyone-with-the-link sharing. Moving between folders within one shared drive
requires Content manager (`fileOrganizer`) or Manager access; Contributor can
create and edit files but cannot perform this move. See Google's
[shared-drive roles](https://developers.google.com/workspace/drive/api/guides/about-shareddrives#roles_for_shared_drives).
New exports are uploaded and verified in the event folder before
being moved; existing exports are refreshed in place. The Drive API must be
enabled. PDFs use Drive's long-running `files.download` API, including presentations
above the 10 MB limit of synchronous exports. Preparation is polled every 10
seconds for up to two minutes. Media downloads have a two-minute abort signal;
other requests have a 30-second timeout. Downloads are bounded to 50,000,000 bytes
and checked for PDF media type, signature and end marker before upload.
Larger exports need a smaller presentation. Download URLs and redirects are
restricted to Google's document and content hosts. Authorization is sent only
to the original document host.
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
configured folder is unavailable, restore access before retrying. Renaming it
does not affect reconciliation. Keep its configured ID stable for existing PDFs.

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
yourself or create `.github/meetup-asset-recovery.json` for a one-time, reviewed
operation. This optional maintenance file is unnecessary for template rendering:

```json
{
  "version": 1,
  "events": {
    "owner/repository#42": {
      "COPY_FILE_ID": {
        "operation": "restore",
        "revision": "CURRENT_DOCS_OR_SLIDES_REVISION_ID",
        "bindingId": "BINDING_ID_FROM_SIDECAR"
      }
    }
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
and omit `bindingId`. The copy must contain valid text expressions and image
alt-title markers. Its field definition is discovered directly from the copy. Review and preserve organizer edits before adding
those locations. Enrollment validates them before marking the file as managed.
For a missing initial sidecar, enrollment is possible only after explicitly
restoring the authored placeholders; an already rendered file is not scanned
for old values. Recovery runs through the normal workflow under the event lock.

## Approved event cover

Managed image fields support `event.cover` for the exact selected and approved
content image. See [content review](content.md#decide-and-apply) for eligibility,
required binding settings, and changed-image behavior.
