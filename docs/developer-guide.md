# Developer guide

This repository treats documentation, executable rules, and developer tooling as
part of the product.

## Source of truth

- `README.md` explains the repository shape and public delivery surface.
- `docs/adr/0001-centralize-meetup-event-automation.md` defines the intended
  architecture and dependency direction.
- `tests/architecture.spec.ts` and `tests/contracts.spec.ts` encode the
  structural rules that must stay deterministic.
- `.github/copilot-instructions.md` inherits from this guide for agent behavior.
- `tests/architecture.spec.ts` uses ArchUnitTS for clean-architecture and
  cycle rules, while contract tests keep repository-specific boundaries honest.

## Daily workflow

Use the repository entrypoints instead of ad hoc shell commands:

- `make setup`
- `make lint`
- `make check-knip`
- `make quality`
- `make check-architecture`
- `make check-contracts`
- `make package`
- `make test`
- `make check-dist`

## Quality rules

- Prefer small, inward-facing changes that preserve dependency direction.
- Keep business rules in domain and application packages.
- Keep adapters and runtime entrypoints thin and explicit.
- Update documentation and tests together when behavior or contracts change.
- Prefer deterministic checks and named tasks over one-off commands.
- Treat generated action and workflow documentation as source-controlled output
  that must stay in sync.

## Dependency injection and domain boundaries

The runtime uses Inversify through `composition.ts`,
`communication-composition.ts`, and `publication-composition.ts`. Create a new
container for each invocation and resolve the action's use case there. Keep
container lookups and identifiers outside application, domain, and adapter code;
use explicit constructor dependencies and owned ports instead of decorators.

Event, referential, communication, and publication are separate bounded contexts.
Cross-context orchestration belongs to `application/journey`. Inject repositories,
clocks, and use-case collaborators; keep deterministic rules and value operations
inside their owning context. Application code receives capabilities, not SDK
clients or credentials. See [ADR-0002](adr/0002-runtime-dependency-injection.md)
for lifetimes, replacement bindings, and the communication authorization boundary.

Before removing compatibility code, check its callers and historical fixtures.
Run Knip, architecture tests, and behavioral tests after changing dependencies.
Do not suppress dependency warnings by forcing incompatible transitive versions.

`scripts/build-actions.mjs` owns the action entrypoints and build settings. It
builds when executed directly and exports its functions without building on import.
`check-dist` compares bundle bytes before and after a rebuild, including missing
or untracked bundles, so its result is independent of Git diff size and staging.

## Agent guidance

Agents should read this guide before editing code. When code and documentation
conflict, update the relevant documentation or call out the mismatch rather than
silently ignoring it.
