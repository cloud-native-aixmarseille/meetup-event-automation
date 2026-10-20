# ADR 0021: Separate technical failures from organizer feedback

Status: Accepted

Date: 2026-10-20

## Context

Meetup input can be incomplete or invalid during normal preparation. Treating
these corrections as execution failures makes CI status misleading. Independently
rendered stage comments and Slack alerts repeat consequences and obscure the
specific action an organizer needs to take.

## Decision

Use one application `DiagnosticPolicy` to distinguish organizer corrections,
informational results and technical faults. Expected validation and approval
states block the affected operation without failing CI. Unknown exceptions,
source/API faults and failed persistence fail CI. Diagnostic severity continues
to describe the problem and does not alone determine exit status.

Use the shared runner for concise technical facts, diagnostic codes and safe field
metadata. Organizer prose belongs to scoped comment/notification presenters.
Merge stage diagnostics in the final attention action, remove repeated
prerequisites and fixed items, and update one diagnostic checklist. Slack uses
that checklist with verified approval and recovery state. Retire a separate
communication report only after consolidated persistence succeeds.

The final aggregation is the sole diagnostic checklist writer. An incomplete
stage evaluation cannot clear the previous checklist: replacing diagnostic tasks
requires completed reports from all four stages. Fresh diagnostics wait for a
complete run while technical attention reports failed stages. Pending
external deliveries and final approvals retain their verification and retry
rules. A recoverable write may succeed after authoritative readback confirms its
result; an unconfirmed unexpected fault remains technical.

Publication requires evidence of completed candidate preparation, not merely a
successful step. The speaker synchronization workflow uses the existing
`pr-title` output to gate publication and can report a blocked candidate on the
existing private PR.

## Consequences

Issue edits and scheduled audits share the same failure policy. A green workflow
can mean an operation was safely blocked; organizer tasks remain visible in the
meetup checklist. Technical failures stay visible in CI with concise codes.
Approval controls and delivery records retain their distinct authority while
ordinary diagnostics share one presentation path.
