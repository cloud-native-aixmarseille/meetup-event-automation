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
on its localized rendering, allowing only validated edits in designated public
parameter regions. Missing identity, altered facts, bots,
ambiguous choices, or unavailable verification cannot authorize an effect.

Persist a verified decision, actor, and time in the original bot request before
authorizing work. Replace choices with the final result. Later edits cannot
reverse that decision for the same semantic revision; recover trusted state
from bot-authored history and fail closed when it is unavailable. Recheck the
recorded organizer's permission before using an approval.

Collapse completed review comments as resolved after persisting the verified
decision. Email approvals stay visible until their delivery report confirms all
requests accepted; pending, rejected or uncertain delivery remains actionable. Retain their content and history. Keep shared follow-up comments visible
until their tasks and uncertain notifications are resolved. Reopen reused
comments when new work appears, preserving unrelated moderation decisions.

### Email batches and completion

Host and speaker emails require independent decisions for both preparation and
thank-you messages. All four types share parameter review, decision verification,
and delivery reporting. The follow-up comment summarizes tasks and links to
pending requests. Fingerprints
cover outgoing inputs, including recipient addresses, templates, placeholders,
event facts, and policy. GitHub email reviews store and display the complete
recipient address, template, idempotency key, and placeholders. Slack retains a
public summary and link. Parameter edits refresh the payload with unchecked
choices before a separate approval. Partial completion and locale changes do not invalidate an
otherwise unchanged batch. Changed material inputs require a new request.

Present, unchecked email tasks participate in planning. Checked or absent tasks
produce no new intent. Introductions require a ready scheduled event today or
later; thank-you eligibility follows the [post-event policy](0004-organizer-workflow.md#lifecycle-and-follow-up).
Ready editable slides and the required feedback links remain independent email
prerequisites. An approval cannot manufacture missing source data.

The journey checks a task only after every intended recipient in its group has
an accepted delivery record. A combined task waits for both recipient groups;
manual work remains separate. Completion equality preserves task names, checked
state, section membership and duplicate counts while ignoring presentation order.
Reconcile completion from existing accepted
records after a failed issue write without sending again. Unchecking a task
cannot request a resend.

Persist delivery intent before dispatch under the shared event lock. Accepted
records suppress duplicates; pending or uncertain attempts require investigation.
Only definitive deferral can release a reservation for a safe retry. Preserve
stable recipient IDs and idempotency keys across source edits. Approval never
clears a delivery reservation. Gateway acceptance records request acceptance,
not successful email delivery.

### Attendee slides delivery

Sending the public PDF through Meetup requires a separate organizer decision
bound to the event URL, date, PDF URL and message language. Recheck approval at
the send boundary. Accepted ledger entries restore completion without another
send; approval cannot clear pending or uncertain reservations. The follow-up
view keeps slide sharing pending until the issue records completion.

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

- 2026-11-07: Checklist completion compares tasks semantically within each group.
  This replaces positional array equality: rendering automated thank-you and
  slide-sharing sections can reorder the tasks without losing any state.
  Removed, renamed, duplicated or toggled tasks still fail the preservation check;
  concurrency checks and accepted delivery reservations remain unchanged.

- 2026-11-07: Explicit organizer requirements replace public-only email summaries
  with complete outgoing values, including email addresses, for all four types.
  This supersedes the earlier rule excluding contacts from approval comments;
  the restriction remains for logs, action outputs, Slack, and unrelated data.
  Parameter edits require a refreshed preview and a separate decision so a stale
  payload cannot authorize delivery. Complete reviews fail closed on size limits.
  Stored decisions and delivery reservations remain authoritative; completed
  emails are neither reopened nor reconstructed from current contact data.

- 2026-11-07: Thank-you emails use the same independent host/speaker approval
  pattern as preparation emails, including editable public parameters and
  read-only recipient feedback links. This replaces the combined thank-you
  approval inside the follow-up overview. Existing overview state and recorded
  decisions remain stored, but cannot authorize a separately scoped request.
  Delivery reservations continue to prevent resending accepted or uncertain work.

- 2026-11-06: Attendee slides delivery requires its own verified approval,
  replacing unconditional dispatch once the public PDF was available. The
  follow-up projection no longer omits slide sharing from pending work. This
  preserves the delivery ledger while separating approval from completion.

- 2026-11-02: Preparation approval is split into host and speaker types,
  superseding the single combined introduction batch. Public date/link parameters
  may be edited before approval; metadata and private recipients remain protected.
  Delivery results are projected into the original approvals and the separate
  ledger view is collapsed after successful projection. The ledger and delivery
  identities remain authoritative, including previously accepted messages.

- 2026-11-01: Final decisions remain in their original comments, now collapsed
  as resolved instead of left expanded. This refines presentation only; persisted
  approval authority and delivery reservations are unchanged.

| Original record                                                              | Retained decision or later refinement                                                                                                 |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| [0007: Email completion](archive/0007-automatic-communication-checklists.md) | Separated completion from authorization and durable delivery. Its held-only thank-you gate was extended by the post-event policy.     |
| [0008: Batch requests](archive/0008-admin-confirmation-requests.md)          | Established independent batch approval, fingerprints, permissions, and Slack reservations.                                            |
| [0009: Organizer role](archive/0009-organizer-role-and-slack-channel.md)     | Distinguished internal organizer routing from public announcement channels.                                                           |
| [0010: Verified checkboxes](archive/0010-checkbox-organizer-approval.md)     | Established exact request/editor verification; preserving a mutable human decision was replaced by 0011.                              |
| [0011: Final decisions](archive/0011-final-organizer-decisions.md)           | Persisted final authority in place and acknowledged introductions on Slack; thank-you notifications later joined follow-up attention. |
