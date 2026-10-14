# ADR 0011: Finalize organizer decisions in place and acknowledge them on Slack

Status: Accepted

Date: 2026-10-14

## Context

Organizers need a visible, final result after choosing whether an email batch
can be sent. Leaving editable approval checkboxes suggests that the decision can
be reversed, even after dispatch. The Slack request should also show its outcome.

## Decision

Keep the pending choices and editor verification from
[ADR 0010](0010-checkbox-organizer-approval.md). Once verified, persist the
decision, organizer login and timestamp in the same request comment before
authorizing mail. Replace the choices with a localized final result. The
decision cannot change for that batch fingerprint. A changed batch reuses the
comment with a fresh request and Slack alert, as defined in
[ADR 0008](0008-admin-confirmation-requests.md).

Treat only bot-authored revisions as trusted stored state. Verify the current
comment through GraphQL. After a human edit, recover the most recent bot
revision from paginated `userContentEdits`, checking the current body and node
identity on every page. GitHub supplies each revision body in `diff`. Missing,
deleted or inconsistent history fails closed. Compare bot identities with and
without the GraphQL/REST `[bot]` suffix. Restore the recorded result after later
edits, including edits that remove its metadata or restore pending choices.
Recheck the recorded organizer's current repository write permission before
approved dispatch. Keep the finalized decision visible if permission is revoked.

The journey owns an `OrganizerApprovalNotification` port. Its Slack adapter
retains the channel and timestamp returned by `chat.postMessage`. Add
`white_check_mark` for approval or `x` for rejection to that original message.
Persist successful reactions; treat Slack's `already_reacted` response as
success. Retry uncertain reactions without duplicating posts. Synchronize
decisions and reactions independently of whether any email task remains.

## Alternatives

Preserving the human edit leaves interactive choices after a decision. Posting
a second result comment separates the outcome from the original request.
Trusting final metadata supplied by a human allows forged or reversed decisions.
These alternatives do not meet the finality and in-place presentation requirements.

## Consequences

Organizers see one request/result comment and a reaction on the corresponding
Slack alert. Slack needs `reactions:write` in addition to `chat:write`. A reaction
failure does not undo a GitHub decision or clear delivery records. Requests
without a stored Slack message reference can finalize on GitHub but cannot add
an automatic reaction safely.

GitHub still permits repository writers to edit or delete comments. Restoring
verified state protects against text edits; comment/history deletion is not a
supported reset. Missing verification blocks dispatch. The existing workflow
lock and pre-write snapshot checks remain necessary: GitHub has no atomic
compare-and-set comment update, so a final concurrent edit can still race a write.

References: [GitHub UserContentEdit](https://docs.github.com/en/graphql/reference/users#usercontentedit),
[Slack chat.postMessage](https://docs.slack.dev/reference/methods/chat.postMessage/),
and [Slack reactions.add](https://docs.slack.dev/reference/methods/reactions.add/).
