# ADR 0012: Synchronize OpenFeedback talks and speakers

Status: Accepted

Date: 2026-10-15

The combined event-feedback/shared-link action boundary is superseded by
[ADR 0024](0024-scoped-actions-and-workflow-composition.md).

## Context

Feedback automation must populate talks and speakers from the meetup issue as
well as create events, update their metadata, and manage the shared Kutt link.
Organizers must retain the ability to edit records in the OpenFeedback admin UI.
The API must support this through its existing event, talk and speaker resources.
The issue's agenda remains a concept owned by the meetup automation.

## Decision

Extend OpenFeedback with authenticated list, read, create and update operations
for event talks and speakers. Connect the event gateway to these resources using
the organization API key. Lists use document-ID cursors and return each record's
revision. Updates require that record's last-read revision; creation with an
existing ID returns a conflict.

Project public talk titles, speaker names and their associations from the issue.
Keep private catalog contacts and source locations out of provider payloads.
Create new polls when the event prerequisites, talk subjects and resolved
speaker references are available. An incomplete agenda preserves an existing
poll and still permits event-title and due Kutt updates.

Read both collections and resolve all identities before writing. Reuse matching
provider IDs, including records created manually, and use deterministic IDs for
new records. A title edit retains its talk ID when the speaker group identifies
it unambiguously; speaker changes retain the talk ID when its title matches
uniquely. Reject ambiguous matches before writing talks or speakers.

Synchronize speakers before talks and skip unchanged records. Preserve omitted
records, schedules, photos, settings and votes. Never delete provider records
automatically. Conflicts stop the run; retries read current state and resume with
the same IDs.

## Alternatives

- A combined agenda endpoint could atomically update talks and speakers, but
  would introduce an aggregate absent from OpenFeedback's model.
- Unconditional resource updates could overwrite concurrent admin edits.
- A public JSON agenda feed requires hosting and makes those records read-only
  in the admin UI.
- Direct Firebase writes require user-session credentials and couple the
  automation to OpenFeedback's internal storage permissions.

## Consequences

Atomicity applies to each record. A failure can leave earlier writes committed;
retries preserve completed work and recover the deterministic event before
resuming synchronization. When agenda synchronization is attempted, it must
succeed before saving a new feedback URL or updating Kutt. Unrelated record
edits do not invalidate every update.

The issue owns synchronized titles and speaker names. Organizers manage photos,
schedules and removals in OpenFeedback. Simultaneous title edits for talks with
the same speakers can require organizer intervention. Changing both a title and
its speaker group can create a new talk.

Deploy the resource API extension before enabling the automation client. No
additional consumer credentials or permissions are required. The
[feedback integration guide](../integrations/feedback.md) defines the required
API capabilities, synchronization limits and operational recovery.
