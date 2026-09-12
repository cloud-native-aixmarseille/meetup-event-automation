# ADR-0002: Compose dependencies at the runtime boundary

- Status: Accepted
- Date: 2026-09-13
- Builds on: [ADR-0001](0001-centralize-meetup-event-automation.md)

## Context

Runtime actions repeated adapter construction, and journey use cases accepted
configuration-driven repository factories. Event reconciliation rebuilt its rules
and replaced caller-supplied rules. Communication orchestration also lived beside
GitHub transport code, making it depend on credentials, concrete gateways, and
Octokit rather than application capabilities.

## Decision

Use Inversify in the GitHub Actions runtime composition roots. Each invocation
creates a fresh container. Bind ports to explicit dynamic factories and inject
plain constructor dependencies into use cases. Domain, application, and adapter
packages do not import Inversify, container identifiers, or reflection metadata.
Decorators and automatic constructor discovery are unnecessary.

The common composition root binds event and referential ports. Publication and
communication composition roots extend it with the capabilities their actions
need. Bindings are lazy singletons within an invocation; credentials and cached
referential data are never shared across invocations. Replacements must be bound
before resolving dependent use cases. Tests resolve the real containers with
replacement ports and verify behavior and isolation.

The communication journey belongs to the application package. It receives an
approval repository, an approval authorization capability, event and referential
ports, and a delivery use-case factory. Runtime credentials become availability
flags before crossing that boundary. The delivery factory captures the final
dispatch authorization after readiness, approval, and concurrency checks, so the
ledger retains its independent write guard.

Event rules are constructed once by the composition root and honored by the
journey. Asset reconciliation and issue-form synchronization receive their
collaborating use cases explicitly. The GitHub ledger comment client belongs to
the ledger adapter, alongside its transport interface.

## Consequences

- Business policies remain testable without a DI framework, SDK, or network.
- Adding or replacing an adapter changes the composition root and its contract
  tests, rather than the application orchestration.
- Architecture tests prohibit DI imports outside composition roots and
  infrastructure imports in application code, in addition to package dependency
  and cycle checks.
- The public action contracts stay stable; private workspace constructors change.
- Historical issue schema and reference migrations remain supported. Dead YAML
  configuration wiring, its documentation entry, the obsolete Zod error exception,
  decorator parser support, and TypeScript deprecation suppressions are removed.

Inversify uses its documented [explicit binding API](https://inversify.io/docs/api/binding-syntax/).
TypeScript paths are relative to the configuration file after removing the
[deprecated `baseUrl` option](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html).
