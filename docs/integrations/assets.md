# Google Drive event assets

The issue-update and daily-audit workflows create an event folder, copy its
templates, and save the folder URL in **Drive Link** on the issue.

## Configure

Create two distinct Drive folders: a parent for event folders and a folder
containing the template files. Give the service account read access to the
templates and permission to create folders, copy files and update files in the
parent. Shared drives are supported. Configure sharing for attendees and
speakers yourself; the automation does not change permissions.

Follow [repository setup](../usage/setup.md), then pass these settings to both
`update-meetup-issue.yml` and `check-active-meetup-issues.yml`:

| Consumer setting                                  | Reusable workflow parameter                    |
| ------------------------------------------------- | ---------------------------------------------- |
| Secret `GOOGLE_SERVICE_ACCOUNT_CREDENTIALS`       | Secret `google-credentials`                    |
| Variable `GOOGLE_DRIVE_MEETUP_FOLDER_ID`          | Input `google-drive-meetup-folder-id`          |
| Variable `GOOGLE_DRIVE_MEETUP_TEMPLATE_FOLDER_ID` | Input `google-drive-meetup-template-folder-id` |

The credential is the service-account JSON, including `type`, `client_email` and
`private_key`. The credential and both folder IDs are required. Folder settings
contain IDs, not URLs, and must differ. Missing or invalid settings fail asset
reconciliation.

## Prepare templates

The template folder must contain at least one file and no subfolders. Each file
needs a non-empty, unique `template_kind` in its Drive `appProperties` metadata,
such as `slides` or `attendance`. Use `slides` for the event presentation: email
batches require the direct URL of that managed copy. Set this metadata through the Drive API using
the same application credentials used by the automation.

Use `[EVENT_DATE:YYYY-MM-DD]` in filenames where the event date belongs. For
example, `Slides [EVENT_DATE:YYYY-MM-DD]` becomes `Slides 2026-10-15`.

Templates remain copy-only unless their kind has a content contract in the
consumer's committed `.github/meetup-asset-content.json`. Google Slides and
Google Docs support managed text and embedded portrait images. Sheets, uploaded
Office files, PDFs and standalone images remain copy-only. Enable the Drive,
Slides and Docs APIs in the service-account project for the formats used. The
existing Drive OAuth scope authorizes these file operations; access still depends
on the service account's file permissions. Sharing is never changed automatically.

## Author managed content

The configuration has `version: 1`, a `contracts` map keyed by `template_kind`,
an optional `venues` map keyed by stable host ID, and an optional `events` map
keyed by `owner/repository#issue-number`. This
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
        { "type": "text", "token": "talk.title", "slot": "opening", "required": true },
        { "type": "text", "token": "talk.abstract", "slot": "opening", "required": false, "fallback": "Details coming soon" },
        { "type": "text", "token": "speaker.name", "slot": "portrait-a", "required": true },
        { "type": "text", "token": "next_event.date.numeric", "required": false, "fallback": "To be announced" },
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
  "events": {
    "example/meetups#42": {
      "speakers": { "portrait-a": "speaker-example" },
      "talks": {
        "opening": { "provider": "conference-hall", "event": "example-cfp", "id": "proposal-one" }
      }
    }
  }
}
```

Replace the example IDs and fallback URL with real template IDs and a public
generic portrait. Obtain object, page and tab IDs using the corresponding
Google API's `get` operation. The configuration supports at most 100 fields per
contract and 500 registered locations per file. Configuration and sidecars are
limited to 1 MB. Revisions and slot names use letters, digits, underscores,
dots, colons or hyphens, with at most 100 characters. A slotted text field's
complete `token:slot` key must also fit within 100 characters. Assignment maps
and the public venue map each accept at most 200 entries; reserved object keys
are not valid assignment slot names.

Text fields use the literal `{{token}}` spelling, or `{{token:slot}}` for a
slotted field. The complete allowlist is:

| Token | Public value |
| --- | --- |
| `event.title` | Validated event title. |
| `event.date` | Localized long event date. |
| `event.date.month` | Localized month name. |
| `event.date.numeric` | Event date as `DD/MM/YYYY`. |
| `event.date.weekday` | Localized weekday and full event date. |
| `host.name` | Resolved host display name. |
| `host.address`, `host.postal_code`, `host.city` | Explicit public venue fields. |
| `agenda` | Ordered talk titles and all public co-speaker names. |
| `event.feedback_url` | Public feedback URL. |
| `talk.title`, `talk.abstract`, `talk.speakers` | Slotted selected proposal title, abstract, and public co-speaker names. |
| `speaker.name` | Slotted public speaker name using the same assignment as portraits. |
| `next_event.date`, `next_event.date.numeric` | Next published meetup date, localized long form or `DD/MM/YYYY`. |
| `next_event.host.name`, `next_event.host.city` | Next published meetup's host display name and explicit public city. |

Dates preserve the event timezone's calendar day; month and weekday names use
the workflow locale. Numeric dates always use `DD/MM/YYYY`. Speaker lists use
English or French list formatting. Required missing values block the file;
optional text needs an explicit non-empty fallback in the template's language.
Values are inserted literally, including token-looking text or HTML. There are
no expressions, arbitrary date formats, or executable template instructions.

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
excluded. The host name comes from the validated referential; its city comes
from the same public venue map. Missing data or an incomplete/failed listing
produces missing fields. Lookup is limited to 200 distinct issues and 20 pages;
it never selects from a partial result or edits candidate issues.

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
body paragraph. Assign each slot to an explicit stable speaker ID in that
event's `speakers` map. Reordering the agenda does not reassign portraits, and
co-speakers need separate slots. A removed or unbound speaker uses the optional
fallback instead of retaining the old portrait. Public URLs come from the
committed speaker referential's optional `picture_url` column; renderers never
contact Conference Hall or receive contact records.

Images and fallbacks must be publicly retrievable HTTPS PNG, JPEG or GIF files,
smaller than 50 MB, at most 25 megapixels, with source URLs no longer than
2 KB. Retrieval permits at most three redirects, validates each destination,
rejects non-public network addresses and credential-bearing URLs, and forwards
no integration credentials. Media type and dimensions are checked before
mutation. Keep source images available to Google after preflight. Prefer stable
public URLs; changing bytes at the same URL is detected on reconciliation.

Both renderers use explicit center crop. Slides also accepts `CENTER_INSIDE`;
Docs rejects it. Image replacement can remove provider effects; no preservation
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
folder. Each template file owns one managed copy: changes to template names or
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
Duplicate managed folders or copies require manual reconciliation. For access
errors, check service-account permissions and quota; for rate limits, retry
later.

The direct
[assets action](../../actions/publication/reconcile-assets/README.md) reconciles
assets on every invocation. Call it under the shared event workflow lock. Its
`asset-url` output is the folder URL; `drive-files` maps each
`<template_kind>-link` to a copied file URL. The `result` output's `data.content`
maps template kinds to `copy-only`, `ready`, `pending`, `conflict` or
`recovery-required`.
Both event workflows produce feedback before rendering and pass the
`slides-link` entry and `slides-ready` to communications. An existing URL alone
does not make opted-in content ready. Pending or conflicted slides hold due
email batches; other successfully rendered files remain reusable. Completed
emails are not resent when document content changes. Approval covers the email
batch inputs and stable links, not an immutable snapshot of linked content.
**Drive Link** continues to identify the
folder; email slides links identify the presentation file. See
[email link requirements](communications.md#presentation-link).

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
