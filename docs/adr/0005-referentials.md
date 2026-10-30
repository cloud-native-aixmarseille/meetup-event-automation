# Referentials and Conference Hall authority

Status: Accepted decisions consolidated on 2026-10-23.

Scope: source authority, speaker identities, local catalog preservation, and talk
selection. Setup and supported data formats live in the
[Conference Hall guide](../integrations/conference-hall.md) and
[referential reference](../reference/referentials.md).

## Context

Speaker and submitted-talk corrections must reach events without waiting for a
catalog pull request. The private catalog still owns stable recipient identities,
reviewed source mappings, and local contact fields. Replacing it with a provider
export would lose those identities and import unnecessary private data.

## Accepted decisions

Conference Hall is the runtime authority for linked speaker profiles and
explicitly selected submitted talks. Compose a consistent source snapshot with
committed local identities and supplements for each invocation. Require source
configuration at boundaries that resolve these data; there is no silent fallback
to stale CSV values. Local validation and issue-form projection remain independent
maintenance operations.

The referential domain owns identity mappings, allocation, and field ownership.
The event domain owns ordered proposal references and public agenda data. Journey
coordinates their public APIs; adapters validate vendor responses and persist
complete catalog candidates without leaking provider payloads into business rules.

### Identity and field ownership

The 2026-10-30 host-address decision replaces the former required private contact
`address` with `venue_address`, `venue_postal_code`, and `venue_city` as the sole
event location. The old field duplicated venue data and prevented complete public
projections when only it was filled. Host contacts retain names, emails, and phone
numbers; speaker emails use the structured public venue. Consumers migrate their
reviewed addresses explicitly while preserving stable IDs and contact order.

| Data                                                 | Authority and preservation rule                                                                  |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Local `speaker_id`                                   | Allocate once; retain across refreshes and retries; never reuse removed IDs.                     |
| Source mapping                                       | Organizer-reviewed association of provider, CFP, and source speaker ID with a local identity.    |
| Linked display name, company, email, and picture URL | Current source profile; absent optional affiliation or picture values clear the snapshot value.  |
| Structured names, phone, and local supplements       | Preserve organizer-maintained values; never derive structured names by splitting a display name. |
| Hosts, unlinked speakers, and other CFP mappings     | Remain locally managed.                                                                          |

Equal names or email addresses do not authorize identity merging. Reject ambiguous
or conflicting mappings. Preserve local rows when their source disappears and
retain unknown CSV columns or block the write. Current display names feed linked
speaker greetings; image failure can fall back to text without invalidating a
resolved agenda or email recipient.

Only allowlisted public profile fields reach issues, feedback, or assets. Contact
snapshots belong in the private catalog. Raw exports, reviews, surveys, credentials,
and private contact details never become public outputs. The integration reads
Conference Hall; it does not upload local edits or change proposal statuses.

### Reviewed registration and runtime refresh

Register new identities through a private review PR containing the complete
validated catalog candidate, allocation state, and corresponding form projection.
Verify the private destination, serialize repository-wide updates, preserve human
edits, and use revision checks when updating the review branch. Unchanged input
produces no new diff. Organizers merge the PR; automatic merge is disabled.

Existing linked profiles refresh independently of later snapshot PRs. New mappings
become usable after review and merge. The catalog and form actions remain separate;
their workflow publishes a candidate only after all required checks succeed, as
specified in [action composition](0002-action-contracts.md).

### Explicit talk selection

The issue owns date, host, lifecycle, participation confirmation, and ordered
visible proposal numbers. Resolve those numbers to canonical, CFP-scoped proposal
identities and persist the canonical association automatically. Do not infer
selection from a title, speaker name, catalog membership, or acceptance alone.

Selected proposals must be accepted and have a supported, non-declined confirmation
state. CFP acceptance does not confirm availability for the meetup date. Resolve
titles, abstracts, languages, formats, and mapped co-speakers from the same source
snapshot; preserve order and deduplicate recipients by local identity. Issues
without selected proposals retain their manual agenda while linked profiles still
refresh.

Source changes propagate on the next successful issue reconciliation or audit.
Submitted proposals are distinct from personal library talks; editing the latter
alone does not establish an updated submitted proposal. Missing profiles, stale
source data, or invalid mappings block dependent operations, preserve the last
valid agenda, and produce actionable diagnostics. They do not justify sending to
cached contacts. Independent work may continue.

Source refresh never authorizes delivery. Changed unfinished batches require fresh
approval; stable recipient identities, accepted deliveries, and reservations
survive catalog updates.

## Alternatives and consequences

CSV-only authority delays corrections until a merge. Optional source configuration
would permit inconsistent authority policies. Raw export copies, automatic
name-based identity merging, and bidirectional synchronization introduce privacy
or conflict risks without satisfying the reviewed identity requirement.

Live composition depends on source availability and rate budgets. Consistency is
per invocation, and separate actions share the provider's request budget. Reviewed
registration adds a deliberate delay for new identities while routine corrections
to existing profiles propagate on the next successful reconciliation.

## Decision history

| Original record                                                                | Retained decision or later refinement                                                                             |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| [0012: Conference Hall](archive/0012-conference-hall-talks-and-speakers.md)    | Established live source authority, private reviewed mappings, field ownership, and preserved delivery identities. |
| [0020: Unified checklist](archive/0020-unified-organizer-checklist.md)         | Replaced organizer entry of internal proposal IDs with visible proposal numbers; canonical IDs remain internal.   |
| [0024: Action scopes](archive/0024-scoped-actions-and-workflow-composition.md) | Separated catalog reconciliation from issue-form projection while retaining complete-candidate publication.       |
