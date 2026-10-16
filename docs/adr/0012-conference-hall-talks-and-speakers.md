# ADR 0012: Use Conference Hall as the source of truth for talks and speakers

Status: Accepted (implemented)

Date: 2026-10-14

Updated: 2026-10-16

## Context

All meetup talks originate in the recurring
[Cloud Native Aix-Marseille CFP](https://conference-hall.io/team/cloud-native-aix-marseille/meetup-cloud-native-aix-marseille/proposals).
Organizers explicitly select proposals for each meetup. Speaker profile and
submitted-talk corrections must reach event content and recipients automatically,
without copying text or waiting for a CSV synchronization PR to merge.

The [private speaker CSV](../reference/referentials.md) already supports catalog
validation, issue-form projection and communications. Its stable `speaker_id`
identifies recipients for duplicate protection. It also contains local fields,
such as phone numbers, that the proposal export does not supply. These identities
and organizer-maintained fields must survive source updates.

Conference Hall's [Web API contract][conference-hall-api] exposes event proposals
through `GET /api/v1/event/:event`, authenticated with an event key in the
`X-API-Key` header. Its schedule endpoint is restricted to conference events.
The [proposal serializer][conference-hall-export] includes proposal and speaker
IDs, profiles, picture URLs, email addresses, review data and survey answers.
Only an allowlisted subset belongs in the private catalog or public agenda.

## Decision

Use Conference Hall as the runtime authority for linked speaker profiles and
explicitly selected talks. Compose its current export with committed local
speaker IDs, reviewed identity mappings and organizer-owned fields through the
existing referential port. Event evaluation and recipient preparation share one
composed catalog and one source snapshot per invocation.

Retain private reviewed CSV synchronization for identity registration, stable-ID
allocation, snapshots and issue-form choices. Routine source edits take effect
on the next successful reconciliation without a snapshot PR merge. The meetup
issue owns proposal selection and order, date, host, lifecycle and participation
confirmation.

### Required source configuration

Require both `conference-hall-event` and `conference-hall-api-key` in the event,
feedback, asset and communication actions and their reusable workflows. Speaker
synchronization requires the same settings. Supply the CFP slug at the workflow
boundary and the key as an explicitly forwarded secret, with no defaults.

Runtime validation rejects missing or blank values before reconciliation,
including direct programmatic calls and issues without selected proposals.
Required TypeScript dependencies express the same contract. Always compose the
source-aware catalog and proposal source; there is no unconfigured CSV fallback.

Use the configured CFP's event export on the supported service origin. The
organizer dashboard URL is not an API endpoint, and issue text cannot choose a
credential target. Document-only issue listing and organizer attention do not
resolve profiles or talks; their composition does not expose the event
reconciliation journey. Standalone CSV validation and form projection remain
local maintenance tools.

### Speaker identity and field ownership

Read speakers from the configured CFP's proposals, including co-speakers.
Importing a speaker does not select or publish a talk, confirm attendance, or
authorize an email.

| Field                                    | Owner and behavior                                                                                                        |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `speaker_id`                             | Local stable identity; never replace it with a provider ID or reuse a removed ID.                                         |
| Source identity mapping                  | Reviewed association of provider, CFP and event-scoped speaker ID with a local ID; complete and unique within that scope. |
| Public display name, company and email   | Conference Hall owns these fields for linked rows; current values override the CSV snapshot during reconciliation.        |
| `picture_url`                            | Conference Hall owns the optional profile image URL; expose a validated HTTPS reference in the resolved public profile.   |
| `firstname` and `lastname`               | Preserve local structured-name data; never invent it by splitting a display name.                                         |
| `phone` and other supported local fields | Organizers own these fields; synchronization preserves them.                                                              |
| Unlinked rows and rows for another CFP   | Retain local values and identities.                                                                                       |

Support imported display names without requiring structured names or affiliation.
Use the current source display name in email greetings for linked speakers,
including when local structured names are older. Local speakers use their first
name when available, otherwise their display name. Equal public names remain
distinguishable by stable ID; ambiguous name-only references fail.

Absent, empty or null source-owned affiliation and picture fields become empty.
Invalid picture references fall back to text. Do not download images into Git,
forward API credentials to image hosts, or expose private contact fields through
public profile consumers. Each presenter owns image display and fallback;
unavailable pictures do not block agenda resolution or email delivery.

Link existing rows through organizer-reviewed mappings. Name or email matches
may identify candidates for review but never authorize merging people or copying
local contacts. Reject conflicting mappings and inconsistent profiles for the
same source identity. Conference Hall speaker IDs are event-scoped and shared
across that event's proposals; retain the CFP scope when resolving co-speakers.

Allocate a local ID once for each new speaker and preserve it across retries and
updates to an open synchronization PR. Reserve historical and removed IDs.
Preserve unmapped rows, local fields and extra columns during serialization;
unknown columns must survive or block the write. Source disappearance never
deletes a local row. Correct source-owned fields in Conference Hall and local
supplements in the CSV; do not upload local contacts or edits to Conference Hall.

### Private identity registration and snapshots

Run speaker synchronization on scheduled and manual requests. Fetch one source
snapshot, compute a deterministic merge, validate the complete candidate catalog,
and open or update one private PR containing the CSV, allocation state and
regenerated issue-form choices. Unchanged input produces no new diff or PR.

Verify the destination is private before persisting contacts. Use a dedicated
repository-wide concurrency group to protect shared writes and ID allocation.
Merge the current default branch before importing and verify its revision before
publication. Use an exact branch-head lease when updating the synchronization
branch. Preserve organizer edits; conflicts or a human-authored branch head
require reconciliation.

Organizers review and merge new mappings and snapshot updates using existing
repository rules. Automatic merge is disabled. New identities become available
after their mappings are committed; existing linked profiles refresh directly
from Conference Hall independently of later snapshot PRs. Catalog merges trigger
validation/form checks and active-event audits through the consumer workflows.

The private PR and workflow record snapshot freshness and failures. Missing or
invalid required source data blocks the candidate sync and leaves committed
files unchanged. A failed snapshot sync does not establish runtime freshness or
permit use of cached source-owned contacts.

### Selected talks and automatic propagation

Add ordered proposal references to the issue form and versioned codec. Organizers
select stable proposal IDs within the configured CFP; document how to obtain
them from its Web API export. Do not infer selection from names, titles, CSV
membership, acceptance alone or a conference schedule. Reject duplicate, missing
or foreign proposal IDs.

Resolve selected titles, abstracts, languages, formats and speaker identities
from the same source snapshot used for profiles. Translate source identities
through committed mappings to local `speaker_id` values. Missing mappings
require synchronization and review; never guess by name. Deduplicate recipients
across talks by local identity.

A selected proposal must have accepted deliberation and a supported,
non-declined confirmation state. Preserve the meetup's separate participation
confirmation checks: CFP acceptance does not establish availability on its date.
Never change Conference Hall proposal status or send its result emails.

Render managed agenda content through the issue codec, escaping imported public
text and preserving explicit order and unrelated sections. Issues without
proposal references retain manually maintained talk text while linked speaker
profiles still refresh. Keep talk-specific biographies outside the contact schema
unless a supported consumer requires them.

Reconcile on issue changes and scheduled/manual audits. Scheduled audits always
persist refreshed event content and diagnostics in fix mode under the shared
event lock. Source edits alone do not trigger GitHub Actions; the next successful
audit determines propagation latency.

Conference Hall updates event speaker records when users save profiles. Its
personal talk library and submitted proposals are separate: this integration
inherits the selected CFP proposal exposed by the event API. Editing only a
library talk does not update existing submissions. Source capabilities, setup
and recovery are documented in the [integration guide](../integrations/conference-hall.md).

### Failures, privacy and delivery safeguards

If the configured source cannot be refreshed, its export is invalid, identities
conflict or a linked profile is missing, reject catalog use with safe localized
diagnostics. Do not fall back to old profile or contact values. Retain local rows
and the last valid selected agenda, mark selected proposals stale, and block
dependent mail and feedback work. Independent event work can continue. Recovery
requires a successful refresh or an explicit correction to the mapping.

Bound requests and response sizes, handle rate-limit responses and `Retry-After`
without immediate retries, and fetch once per action invocation rather than per
speaker or proposal. Separate actions consume the provider's shared rate budget;
audit frequency must account for that. Do not persist raw export caches or expose
provider payloads through artifacts or action outputs.

The referential domain owns source mappings, field ownership, stable-ID
allocation and validation through provider-neutral ports. A source-aware
repository combines live profiles and local supplements. The Conference Hall
adapter validates and allowlists vendor responses; the CSV adapter persists
validated candidates without losing local fields. The event domain owns proposal
references and public agenda data. The journey coordinates use cases, and runtime
composition injects credentials and adapters.

Store allowlisted contact snapshots only in the private consumer referential.
Discard reviews, surveys, contact locations and arbitrary reference fields at
the source boundary. Keep private addresses, phone numbers, credentials and raw
exceptions out of public issues, Slack, Drive assets, logs, summaries and outputs.
Use owner-local English/French catalogs and the shared action reporting contract.

Current source profiles and selected proposals feed existing email batch
fingerprints. Changed unfinished batches require fresh approval. Preserve stable
recipient IDs, accepted deliveries and reservations when linking or updating a
speaker; never reset or resend accepted deliveries. Source refresh does not
authorize mail. In-flight runs retain their source snapshot and checked-out local
supplements and cannot recall an already dispatched message. Hosts remain locally
managed.

## Alternatives

- Using the committed CSV as runtime authority delays speaker corrections until
  a reviewed sync is merged. Live composition preserves the existing consumers
  and stable IDs while removing that delay.
- Optional source configuration permits callers to silently use a different
  authority policy. Required settings make that policy consistent.
- Copying raw exports or replacing whole CSV rows imports unnecessary private
  data and erases organizer-owned fields.
- Bidirectional synchronization adds conflict policies and write APIs beyond
  the read-only integration needed here.
- Importing every accepted proposal into an agenda removes explicit meetup
  selection; profile synchronization does not replace it.

## Consequences and validation

Speaker and submitted-proposal corrections reach event content and recipients
on the next successful reconciliation. Local identities, supplemental contacts,
explicit meetup selection and delivery protection remain stable. No webhook or
bidirectional source write is required.

Every reconciliation caller must supply both source settings. Event runs depend
on source availability when their catalog contains linked profiles, including
manual agendas. Missing linked profiles invalidate that CFP catalog until
repaired. Tradeoffs include API request budgets, snapshot consistency within
individual invocations, reviewed registration of new identities, and private
contact history in Git. Standalone CSV validation and form choices reflect the
committed snapshot rather than live source values.

Validate required manifests and forwarding, missing and blank settings, direct
runtime calls, scheduled persistence, and profile/talk edits across invocations
without a CSV change. Cover field ownership, optional field clearing, picture
fallbacks, local field preservation, scoped mappings, co-speakers, name ambiguity,
ID allocation across retries, missing profiles, unchanged syncs, concurrent edits,
private-destination checks, redaction, escaped text and locale changes. Preserve
approval and duplicate-delivery tests, and run architecture, public contract,
reporting, localization and bundle checks for implementation changes.

[conference-hall-api]: https://github.com/conference-hall/conference-hall/blob/335d349b51194e3f5abbd809016b779dbdbcc0d5/docs/api.md
[conference-hall-export]: https://github.com/conference-hall/conference-hall/blob/335d349b51194e3f5abbd809016b779dbdbcc0d5/app/features/event-management/proposals-export/services/proposals-export.server.ts
