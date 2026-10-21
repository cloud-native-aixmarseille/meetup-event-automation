# ADR-0022: Inject stateless collaborators

- Status: Accepted
- Date: 2026-10-21
- Partially supersedes: [ADR-0003](0003-production-code-structure.md)
- Builds on: [ADR-0002](0002-runtime-dependency-injection.md)

## Context

A static policy or codec is a dependency even when it holds no state. Direct
calls conceal that dependency from constructors and prevent consumers from
substituting behavior through their contracts. Moving those calls to inline
construction would preserve the same problem.

## Decision

Production services use instance methods and required constructor collaborators,
including stateless rules, codecs, parsers, and presenters. Consumers declare
narrow structural contracts. Operation-scoped creation uses an injected typed
factory. Package-local composition assembles internal collaborators; runtime
composition owns containers, external capabilities, and action-handler assembly.

Static behavior is restricted to explicit composition and immutable value
factories. Readonly static data constants remain allowed. Error values can be
constructed at failure sites. The development guide defines the exact boundaries
and their executable structure checks.

## Consequences

Dependency graphs are visible and replaceable without static-method mocks.
Composition adds explicit wiring and must remain separate from business behavior.
Factories preserve operation-specific lifetimes rather than introducing global
singletons. Constructors and private workspace APIs change together with their
callers; action inputs, outputs, and organizer behavior remain unchanged.
