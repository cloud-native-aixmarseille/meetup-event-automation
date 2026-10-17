# ADR 0017: Require explicit action inputs and consumed outputs

Status: Accepted

Date: 2026-10-17

## Context

Action defaults hide caller decisions, and optional values require fallback paths
in the runtime. Published outputs include result envelopes, counts, and URLs that
no operational caller uses. Forwarding those values through reusable workflow
outputs does not establish a consumer.

## Decision

Every action input must declare `required: true` without a `default` key. Runtime
reads must reject missing values, and every caller must pass the complete input
set explicitly. This includes locale, booleans, credentials, and recovery settings.
An explicit JSON `null` selects no attention recovery; a verified recovery object
selects recovery. An omitted or blank input is invalid.

Declare and emit only outputs with actual operational consumers. Remove unused
outputs and forwarding-only workflow exports together. Retain diagnostics where
organizer attention consumes them, asset file links and readiness where email
reconciliation consumes them, issue numbers for the audit matrix, and the values
used to create referential pull requests. Logs, annotations, and job summaries
continue to describe action outcomes without requiring public outputs.

Reusable workflow inputs retain their own explicit contracts. In particular,
workflow locale defaults remain supported, and workflows pass their resolved
locale to every action.

The [development guide](../development/README.md#action-interface-rules) owns the
current rules. Agent instructions require them, and contract tests check all
published action manifests, runtime input reads, caller inputs, and operational
output consumers. Integration assertions and dummy reads cannot justify outputs.

## Alternatives

- Keeping optional inputs would preserve implicit behavior at the action boundary.
- Keeping outputs for possible future consumers would retain unnecessary contracts.
- Declaring required inputs while supplying runtime defaults would conceal missing
  caller values and fail to enforce the rule.

## Consequences

This is a breaking action interface change. Direct callers must explicitly pass
locale and all other declared inputs, including slides readiness, the presentation
URL, OpenFeedback credentials, and attention recovery where applicable. Callers
cannot rely on removed outputs. The bundled actions, reusable workflows, reference
documentation, and integration checks change together. Existing localization
fallback for explicitly supplied unsupported locales remains supported.
