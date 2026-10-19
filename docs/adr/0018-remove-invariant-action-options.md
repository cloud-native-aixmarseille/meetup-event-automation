# ADR 0018: Remove invariant options and require operational output consumers

Status: Accepted

Date: 2026-10-17

## Context

Requiring an input does not establish a useful choice. Operational event callers
all select `fix`, while every attention caller supplies `null` for recovery.
Tests exercise other values but do not establish production use. Similarly, an
output referenced only in logging or a summary does not affect the workflow.

## Decision

Remove action flags that select the same behavior in every operational caller.
Make that behavior unconditional. Remove inputs that are always null, false, or
empty and delete their unused implementation paths. Audit through forwarding
layers, and exclude tests and examples as evidence of operational variation.

Event reconciliation always applies safe changes; remove its `mode` input and
caller settings. Internal event evaluation still supports both checking and
persistence because asset, feedback, and communication journeys need read-only
evaluation. Issue-form mode and communication error reporting remain inputs:
their operational callers select both behaviors. Slides readiness is computed
from actual asset results and continues to gate email dispatch.

Remove attention's `recover-post` input, parser, command type, recovery handler,
and unused tests. Pending ambiguous notifications remain held to prevent duplicate
posts; rerunning does not clear their reservations. Delivery evidence used to
show unresolved email problems remains independent of this removed command.

Require inputs without defaults in reusable and manual workflows as well as
actions, including locale. Retain outputs only when they feed operational inputs,
decisions, or published artifacts. Debugging, summaries, test assertions,
optional verbose output, and unused forwarding do not justify an output.

Run `pnpm check:interfaces` in local and CI lint. Check caller values, required
metadata, runtime reads, and operational output data flows. Recognize only
reviewed script consumers and reject arbitrary environment or logging references.
The [development guide](../development/README.md#action-interface-rules) owns the
current policy; agent instructions require it.

## Consequences

This supersedes ADR 0006's event action mode and ADR 0017's explicit null recovery
and optional workflow locale decisions. Callers remove the two deleted inputs and
explicitly supply locale. Existing consumer workflows already supply locale.
The public outputs retained by ADR 0017 all have operational consumers and remain.
New options need evidence of real use; new output consumers need checks of their
final effect rather than text references alone.
