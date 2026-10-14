# ADR 0008: Request organizer confirmation for email batches

Status: Accepted

Date: 2026-10-14

## Context

Organizers need to review each introduction and thank-you email batch before
sending. Requests must be visible on the meetup issue and in the organizer
Slack channel, with separate approval for each batch type.

## Decision

The journey owns an `OrganizerApproval` port. Its GitHub adapter maintains one
trusted bot request comment per batch type. Public requests show the batch type,
event date, maximum recipient count, and approval choices. Slack links directly
to the request. The interaction and editor verification are defined in
[ADR 0010](0010-checkbox-organizer-approval.md).

Anyone with repository write access or higher can decide. Check current
permission through GitHub on each run. Missing identity, insufficient
permission, malformed state, or API failures cannot authorize mail.

Fingerprint the full batch's outgoing inputs inside the communication domain.
Only the fingerprint and public facts cross the approval boundary. Private
contact records never appear in comments, Slack notifications, or reports.
A changed fingerprint resets the choices and requires a fresh decision.
Partial completion and locale changes preserve approval for the same batch.

Reserve each Slack alert in the request comment before posting. Retry only a
definitive nonacceptance; ambiguous acknowledgements do not produce duplicate
alerts. The GitHub request remains usable if Slack fails. Use the
[organizer channel](0009-organizer-role-and-slack-channel.md) and shared
repository/issue workflow lock.

## Consequences

Approval and delivery are independent: approving a batch never clears a delivery
reservation. Accepted messages are skipped on retries. Email completion follows
[ADR 0007](0007-automatic-communication-checklists.md).

The approval boundary handles email batches. Missing participation confirmations
and integration errors must be resolved before sending. Readiness reminders are
independent of email approval. Public event announcements are manual tasks.
