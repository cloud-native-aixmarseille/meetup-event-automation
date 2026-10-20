# ADR 0020: Use one organizer checklist and visible proposal numbers

Status: Accepted

Failure classification and feedback ownership are governed by
[ADR 0021](0021-separate-technical-and-organizer-feedback.md).

Date: 2026-10-19

## Context

Organizers select hosts and enter the proposal numbers shown in Conference Hall.
Missing selections, participation confirmations, source failures, and manual tasks
need distinct, actionable guidance without duplicate comment or Slack alerts.

## Decision

Accept only the visible, event-scoped proposal number as organizer input. Resolve
it against the export's `proposalNumber` and preserve the internal `id` in the
managed agenda automatically. Reject ambiguous
matches, duplicate selections, unaccepted proposals, and unresolved speaker
mappings. Host selection removes the host-needed label; confirmation remains an
explicit organizer decision.

Use the original diagnostic checkbox comment for pre-event hints and additional
organizer tasks. Preserve attention state using verified bot revision history.
Copy notification reservations before removing a separate attention comment,
and accept identical copied records when recovering an interrupted removal.
Do not overwrite competing records or reset uncertain deliveries.

Slack presents concrete checklist guidance and independent integration failures,
with at most six actions and a link to the full checklist. Dependent failures
caused by the reported event problem do not produce separate integration alerts.
Existing reminder windows, approval controls, and post-event follow-up remain
under their domain policies.

## Consequences

Organizers can use visible proposal numbers without finding internal export IDs.
The checklist remains concise and notification reservations survive reruns.
Comment writers must preserve each other's sections and verify bot history before
rewriting stored authority. Consolidation requires issue-comment deletion access
under the existing Issues: write grant. Independent integration errors still link
to workflow diagnostics when no more specific public guidance is available.
