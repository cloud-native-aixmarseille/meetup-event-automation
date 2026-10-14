# ADR 0010: Approve email batches with request checkboxes

Status: Partially superseded by [ADR 0011](0011-final-organizer-decisions.md) for decision persistence, finality and Slack acknowledgement.

Date: 2026-10-14

## Context

Organizers need a direct choice on the request linked from Slack. The issue's
email tasks record completed work and remain separate from permission to send.

## Decision

Put Approve sending and Reject sending checkboxes in the bot's request comment.
Exactly one choice counts. Match the complete comment against either supported
localized rendering and the current batch's public facts. Keep request IDs in
the managed metadata.

Use GitHub GraphQL IssueComment editor and lastEditedAt fields to verify who
made the current edit. Compare its body and node ID with the REST snapshot;
check the editor's current write permission through the REST endpoint. Missing
identity, stale snapshots, malformed choices, bots, and insufficient permissions
do not authorize mail. API failures block dispatch.

Preserve a valid approved or rejected comment without rewriting it. Its last
editor remains the human whose permission is checked on retries and audits.
A changed batch resets the choices under the bot's identity and requires a new
human decision. Approval survives partial completion and locale changes.

Trigger reconciliation with `issue_comment: edited` events from human senders
on bot request comments. The caller lives on the default branch. Exclude bot
edits and pull requests. The daily audit can also process a decision. Slack
notifications link to GitHub, where the organizer makes the decision.

## Consequences

Organizers approve by clicking a checkbox. GitHub comment edit history identifies
the editor, and the current choice remains visible. Both choices checked or an
altered description reset the request to pending. Clearing approval holds future
work but cannot recall accepted or in-flight sends.

The GitHub token needs access to issue comments and repository metadata. No
Slack interaction endpoint or identity mapping is required. Recheck comment
bodies before bot writes, including Slack status updates, to preserve concurrent
human choices. A final race remains possible because these calls are not an
atomic compare-and-set transaction.

API references: [IssueComment fields](https://docs.github.com/en/graphql/reference/issues#issuecomment)
and [issue_comment workflow events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#issue_comment).
