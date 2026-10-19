# Organizer approvals and email delivery

Status: Accepted decisions consolidated on 2026-10-23.

Scope: organizer authority, verified decisions, email completion, and delivery
identity. Setup and recovery procedures live in the
[communications guide](../integrations/communications.md).

## Context

A completion checkbox does not grant permission to send, and a request accepted
by a mail gateway does not prove inbox delivery. Editable issue comments also
cannot be trusted as authorization merely because they contain a marker. Approval,
completion, and delivery therefore need independent evidence.

## Accepted decisions

Use `organizer` for the meetup management role. Repository write permission or
higher authorizes review; platform permission names keep their API meaning.
Internal requests use the explicitly configured organizer Slack channel. Public
announcement destinations have separate [draft and review rules](0008-draft-generation.md).

Journey owns approval capabilities and policies. GitHub adapters verify comment
identity, current body, last editor, edit time, current repository permission,
and trusted bot revision history. A pending request accepts exactly one choice
on its unchanged localized rendering. Missing identity, altered facts, bots,
ambiguous choices, or unavailable verification cannot authorize an effect.

Persist a verified decision, actor, and time in the original bot request before
authorizing work. Replace choices with the final result. Later edits cannot
reverse that decision for the same semantic revision; recover trusted state
from bot-authored history and fail closed when it is unavailable. Recheck the
recorded organizer's permission before using an approval.

### Email batches and completion

Introduction and thank-you batches require independent decisions. Fingerprints
cover outgoing inputs, including recipient addresses, templates, placeholders,
event facts, and policy. Only fingerprints and public review details cross into
comments and Slack. Partial completion and locale changes do not invalidate an
otherwise unchanged batch. Changed material inputs require a new request.

Present, unchecked email tasks participate in planning. Checked or absent tasks
produce no new intent. Introductions require a ready scheduled event today or
later; thank-you eligibility follows the [post-event policy](0004-organizer-workflow.md#lifecycle-and-follow-up).
Ready editable slides and the required feedback links remain independent email
prerequisites. An approval cannot manufacture missing source data.

The journey checks a task only after every intended recipient in its group has
an accepted delivery record. A combined task waits for both recipient groups;
manual work remains separate. Reconcile completion from existing accepted
records after a failed issue write without sending again. Unchecking a task
cannot request a resend.

Persist delivery intent before dispatch under the shared event lock. Accepted
records suppress duplicates; pending or uncertain attempts require investigation.
Only definitive deferral can release a reservation for a safe retry. Preserve
stable recipient IDs and idempotency keys across source edits. Approval never
clears a delivery reservation. Gateway acceptance records request acceptance,
not successful email delivery.

### Notifications and other approval kinds

Reserve introduction approval alerts before posting. Store their Slack message
reference and acknowledge final decisions on that same message. Reaction retries
do not reopen approval or resend mail. Ambiguous post acknowledgement holds the
reservation; GitHub review remains usable when Slack fails.

Thank-you requests use the shared [post-event overview](0004-organizer-workflow.md),
without a separate approval post or reaction. Meetup publication and generated
drafts reuse verification mechanics with their own revision and eligibility
policies. Content approval does not authorize email or initial event publication.

## Alternatives and consequences

An approval label or an editable final checkbox cannot establish immutable,
verified authority for changing inputs. Separate result comments split a request
from its decision. Resetting delivery state to implement retries risks duplicates.

The chosen protocol adds verified history and reservations, but preserves one
review surface and independent delivery evidence. GitHub lacks atomic comment
compare-and-set writes; source rereads and workflow locks reduce, but cannot
eliminate, a final concurrent human edit.

## Decision history

| Original record                                                              | Retained decision or later refinement                                                                                                 |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| [0007: Email completion](archive/0007-automatic-communication-checklists.md) | Separated completion from authorization and durable delivery. Its held-only thank-you gate was extended by the post-event policy.     |
| [0008: Batch requests](archive/0008-admin-confirmation-requests.md)          | Established independent batch approval, fingerprints, permissions, and Slack reservations.                                            |
| [0009: Organizer role](archive/0009-organizer-role-and-slack-channel.md)     | Distinguished internal organizer routing from public announcement channels.                                                           |
| [0010: Verified checkboxes](archive/0010-checkbox-organizer-approval.md)     | Established exact request/editor verification; preserving a mutable human decision was replaced by 0011.                              |
| [0011: Final decisions](archive/0011-final-organizer-decisions.md)           | Persisted final authority in place and acknowledged introductions on Slack; thank-you notifications later joined follow-up attention. |
