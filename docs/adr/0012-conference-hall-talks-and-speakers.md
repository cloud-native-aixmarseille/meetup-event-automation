# ADR 0012: Synchronize speaker referentials and selected talks from Conference Hall

Status: Proposed

Date: 2026-10-14

## Context

All meetup talks originate in the recurring
[Cloud Native Aix-Marseille CFP](https://conference-hall.io/team/cloud-native-aix-marseille/meetup-cloud-native-aix-marseille/proposals).
Organizers explicitly select proposals for each meetup. Today they copy talk
text into the issue agenda and maintain speaker profiles and contacts in the
[private speaker CSV](../reference/referentials.md). Changes in Conference Hall
do not reach either source automatically.

The CSV is already the speaker referential used by validation, issue-form
projection, and communications. Its stable `speaker_id` also identifies email
recipients for duplicate protection. It contains organizer-maintained fields,
such as phone numbers, that the proposal export does not supply. Keeping this
referential avoids replacing its consumers or discarding useful local data.

Conference Hall's [Web API contract][conference-hall-api] exposes event proposals
through `GET /api/v1/event/:event`, authenticated with an event key in the
`X-API-Key` header. Its schedule endpoint is restricted to conference events.
The [proposal serializer][conference-hall-export] includes proposal and speaker
IDs, profiles, a speaker `picture` URL, email addresses, review data, and survey
answers. Only a selected set of fields belongs in the private referential or
public agenda.

## Decision

Synchronize Conference Hall speaker data one way into
`referentials/speakers.csv` in the private consumer repository. Keep that CSV as
the application's speaker referential, including locally maintained phone
numbers. Separately resolve explicitly selected proposals into meetup agendas.
The issue retains selection, order, event date, host, lifecycle, and confirmation
for that particular meetup. This ADR proposes future behavior; it does not change
the current CSV, issue, or workflow contracts by itself.

### Speaker synchronization and field ownership

Configure the CFP slug `meetup-cloud-native-aix-marseille` at the consumer workflow
boundary and provide its API key as an explicit secret. The organizer dashboard
URL is not an API endpoint. Keep requests on the supported service origin;
issue text cannot choose credential targets.

Read speakers from the configured CFP's proposal export, including co-speakers,
and reconcile an allowlisted set of fields. Importing a speaker does not select
a talk, publish a proposal, confirm attendance, or authorize an email.

| Field                                    | Owner and synchronization behavior                                                                      |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `speaker_id`                             | Local stable identity. Preserve existing values; never replace them with provider IDs.                  |
| Conference Hall identity mapping         | Associate provider, CFP, and speaker ID with the local ID; validate uniqueness and scope.               |
| Public display name, company, and email  | Conference Hall owns these fields for linked rows; sync proposes updates in the CSV.                    |
| `picture_url`                            | Conference Hall owns this optional profile image URL for linked rows; sync proposes updates in the CSV. |
| `firstname` and `lastname`               | Preserve existing values as local structured-name data; do not invent them by splitting a display name. |
| `phone` and other supported local fields | Organizers own these fields; synchronization preserves them exactly.                                    |
| Unlinked existing rows                   | Remain locally maintained and are not overwritten or removed.                                           |

Extend the CSV schema with explicit source mapping, a display-name field, and
an optional `picture_url` populated from Conference Hall's speaker `picture`.
The current reader requires first name, last name, and company, while the export
provides a single name and may omit affiliation. Support imported display names
without fabricated structured names; retain legacy name parsing for existing
rows, allow absent affiliation, and use the display name for email greetings
when no organizer-maintained first name exists. Update validation, resolution,
form projection, and communication placeholders together. Equal display names
must remain distinguishable by stable ID; name-only ambiguous references fail.

Synchronize profile picture URLs along with the other provider-owned fields.
Store a validated HTTPS image reference in `picture_url`, without downloading
image binaries into Git or forwarding API credentials to an image host. Expose
this optional field in the resolved public speaker profile so presenters can
use it without reading private contact fields. Storing a URL does not embed an
image automatically; each consuming presenter owns image display and fallback.

An omitted source field preserves the existing URL; an explicit empty or null
picture proposes clearing it through the private synchronization PR. A changed
valid URL proposes an update, and unchanged values produce no diff. Invalid or
authentication-dependent image references produce a diagnostic and preserve the
last valid value, or leave a new speaker's picture empty. Missing or unavailable
pictures never block agenda resolution or email delivery. Image consumers must
handle unavailable images because the externally hosted content can change
independently of the committed CSV.

Link existing rows through an organizer-reviewed mapping. Name or email matches
may identify a candidate for review but never authorize merging people or copying
local contact fields. Reject conflicting mappings and inconsistent profiles for
the same source identity. Verify the provider's speaker-ID scope across proposals
before relying on it for deduplication.

Allocate a local ID once for a new speaker, preserving it across reruns and
updates to an open synchronization PR. Never reuse a removed speaker's ID.
Preserve unmapped records, phone numbers, and supported extra columns. Unknown
columns must survive serialization or block the write with a diagnostic; they
must not be silently dropped. Missing fields in a response never clear local
fields. Missing or invalid required source data blocks the candidate sync and
leaves the committed catalog unchanged. Clearing an optional source-owned value
is an explicit reviewed diff. Disappearance from an export never deletes a row.

For linked rows, correct imported fields in Conference Hall; a local edit to one
of those fields will be proposed for replacement on the next sync. Local fields
remain editable in CSV. Do not upload local contacts or edits to Conference Hall.

### Persist through the existing private repository workflow

Run a dedicated speaker synchronization workflow on a schedule and manual
request. Fetch one source snapshot, compute a deterministic merge, validate the
complete candidate catalog, and open or update one private synchronization PR.
Reuse the repository's existing bot-PR pattern. Regenerate the issue-form choices
from the same candidate catalog and include them in that PR when changed.
Unchanged input produces no new diff or PR.

Keep the CSV and identity mappings in the consumer repository. Restrict the
workflow to a private destination before writing contact data. Use a dedicated
repository-wide concurrency group for synchronization; per-issue locks cannot
protect shared catalog writes or ID allocation. Rebase the merge on the current
default-branch catalog and verify the source revision before updating the branch.
Preserve organizer edits on both the default branch and an existing sync PR;
conflicts require reconciliation rather than overwriting those edits.

Organizers review and merge the proposed changes using existing repository rules.
Do not enable automatic merge as part of this decision. Event runs consume the
catalog at their checked-out revision, exactly as today. Merging a sync triggers
validation/form checks and reconciliation of affected active events so pending
email approvals are evaluated against the updated inputs.

Recipient resolution uses the committed CSV and does not fetch Conference Hall
contacts at dispatch time. An unmerged import is not live application data.
Record and report sync freshness through the workflow and private PR, including
failures. A failed sync leaves the last merged catalog usable; it must not be
reported as current. This deliberately accepts lag until the next successful,
reviewed sync. Urgent contact changes require a new sync and merge before use;
they do not bypass approval or reset accepted deliveries.

### Selected talk integration

Add ordered proposal references to the issue form and versioned codec.
Organizers explicitly select stable proposal IDs within the configured CFP.
Document how to obtain them from Conference Hall's Web API settings/export.
Do not infer selection from CSV membership, names, titles, acceptance alone, or
a conference schedule. Reject duplicate, missing, or foreign proposal IDs.

Resolve selected proposal titles, abstracts, languages, formats, and speaker
identities through the API on issue changes and scheduled/manual audits.
Translate their speaker identities to local `speaker_id` values through the
committed mapping and use the same catalog revision for participant resolution.
If a selected speaker has no committed mapping, report that synchronization and
review are required; do not create a second live contact lookup or guess by name.
Deduplicate recipients across talks by local speaker identity.

The proposal owns talk content; the committed CSV supplies speaker display names,
optional profile picture URLs, and contact data to their respective consumers.
Keep talk-specific biographies out of the contact schema unless a supported
feature requires them. Render managed agenda content through the issue codec,
preserving unrelated sections and explicit meetup order. Edits to managed talk
text are corrected in Conference Hall.

A selected proposal must be accepted before its content is eligible for
publication. Pending, declined, withdrawn, or unrecognized states produce a
diagnostic. Preserve and mark the last valid agenda projection stale if refresh
fails, and block effects requiring a verified refreshed proposal. Existing
recipient lookup remains available from the committed CSV. CFP acceptance or
confirmation does not imply availability on this meetup's date; retain its
participation-confirmation checks. Never change Conference Hall proposal status
or send its result emails.

### Ownership, failures, and privacy

The referential domain owns source mappings, field merge rules, stable-ID
allocation, and catalog validation through provider-neutral ports. A
`conference-hall-proposal-source` adapter validates vendor responses; a CSV
adapter persists the validated candidate without losing local fields. The event
domain owns proposal references and public agenda data. The journey coordinates
synchronization, form projection, and event reconciliation. Runtime composition
injects credentials and adapters; provider payloads stay outside domains.

Bound requests and response sizes, honor rate-limit responses and `Retry-After`,
and avoid a request per speaker or proposal. Fetch once per sync invocation;
validate the deployed API contract and budget audit requests before enabling
selected-talk refresh. Authentication errors, invalid responses, and incomplete
reads leave committed files and existing issue content intact with diagnostics.
No raw export cache, artifact, or action output is needed.

Store allowlisted speaker contacts only in the private consumer referential.
Discard reviews, surveys, contact locations, and arbitrary reference fields at
the import boundary. Private PR diffs contain the intended catalog updates;
public reports show safe counts and diagnostic codes, never rows, addresses,
phone numbers, credentials, or provider exceptions. Do not project local contact
fields into issues, Slack, or Drive assets. Escape imported public text and use
owner-local English/French catalogs and the shared action reporting contract.

Existing issues and speaker IDs remain readable without conversion to a second
recipient model. Preserve all delivery reservations and completion records when
linking a speaker or updating profile data. Changed outgoing inputs require
fresh approval for affected unfinished batches through the existing fingerprint
rules, but do not resend accepted deliveries. In-flight event runs retain their
checked-out catalog snapshot; a merge cannot recall an already dispatched
message. Keep the host referential unchanged.

## Alternatives

- Resolving speaker contacts live from Conference Hall and retaining only local
  supplements requires two runtime sources and a new contact-resolution path.
  CSV synchronization reuses the existing consumers and their stable IDs.
- Copying the raw export or replacing entire CSV rows would import unnecessary
  private data and erase organizer-maintained fields. Field-owned merging avoids
  both problems.
- Bidirectional synchronization adds conflict policy and write APIs beyond the
  read-only integration needed here.
- Importing every accepted proposal into an agenda removes the organizer's
  explicit meetup selection. Speaker synchronization does not replace it.

## Consequences and delivery

Organizers maintain phone numbers and other local fields in the existing CSV;
Conference Hall supplies updates to linked profiles through reviewable diffs.
Speaker lookup remains deterministic and available without a live contact API
call. The tradeoffs are synchronization lag, private contact history in Git, and
ongoing maintenance of explicit identity mappings and a compatible CSV schema.

First deliver the schema/name compatibility changes and mapping review, then the
source adapter, field merge, and private synchronization workflow. Add selected
proposal references and agenda refresh after committed speaker mappings are
available. Update usage, referential, configuration, action, and workflow
contracts when each behavior ships. No live data migration is performed by this
ADR.

Validate field ownership, preserved phone numbers and extra columns, unmapped
rows, source disappearance, name ambiguity, missing data, co-speaker identity,
ID allocation across retries, unchanged syncs, concurrent organizer edits, sync
failures and freshness, private-destination enforcement, escaped text, locale
changes, selected proposals, and unchanged email duplicate protection. Cover
picture URL import, updates, explicit removal, omitted fields, invalid references,
and unavailable-image fallbacks without blocking unrelated work. Run the behavior,
architecture, public contract, reporting, localization, and bundle checks for
eventual production changes.

[conference-hall-api]: https://github.com/conference-hall/conference-hall/blob/335d349b51194e3f5abbd809016b779dbdbcc0d5/docs/api.md
[conference-hall-export]: https://github.com/conference-hall/conference-hall/blob/335d349b51194e3f5abbd809016b779dbdbcc0d5/app/features/event-management/proposals-export/services/proposals-export.server.ts
