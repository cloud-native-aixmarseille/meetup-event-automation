# Developer guide

This repository treats documentation, executable rules, and developer tooling as
part of the product.

## Source of truth

- `README.md` explains the repository shape and public delivery surface.
- `docs/adr/0001-centralize-meetup-event-automation.md` defines the intended
  architecture and dependency direction.
- `tests/architecture.spec.ts` and `tests/contracts/*.spec.ts` encode the
  structural rules that must stay deterministic.
- `AGENTS.md` is the repository source of truth for agent behavior, and
  `.github/copilot-instructions.md` should remain a symlink to it.
- `tests/architecture.spec.ts` uses ArchUnitTS for clean-architecture and
  cycle rules, while `tests/contracts/*.spec.ts` keeps repository-specific
  boundaries honest.

## Daily workflow

Use the repository entrypoints instead of ad hoc shell commands:

- `make setup`
- `make lint`
- `make check-knip`
- `make check-structure`
- `make quality`
- `make check-architecture`
- `make check-contracts`
- `make package`
- `make test`
- `make check-dist`

Biome linting and formatting use the version installed from `pnpm-lock.yaml`.
`pnpm lint` and `pnpm lint:ci` include `pnpm format:check`; `make lint-fix`
applies formatting and lint fixes. Super-linter's bundled Biome is disabled in
the Makefile and shared CI workflow because it cannot read the repository's
newer Biome rules. Super-linter still runs the other repository checks.

## Quality rules

- Prefer small, inward-facing changes that preserve dependency direction.
- Keep business rules in domain and application packages.
- Keep adapters and runtime entrypoints thin and explicit.
- Update documentation and tests together when behavior or contracts change.
- Prefer deterministic checks and named tasks over one-off commands.
- Treat generated action and workflow documentation as source-controlled output
  that must stay in sync.

## Action reporting contract

Every public action must use the shared GitHub Actions reporting boundary:

- Register its bootstrap as `await ActionRunner.run("action.<group>.<action>", operation)`.
  The English title must match the action manifest name. The runner passes one
  resolved ActionMessages into the operation. Entrypoints follow `src/entrypoints/<group>-<action>.ts` and are included in
  `scripts/build-actions.mjs`.
- Return `ActionReportData` on every normal path, including skipped actions.
  Select public facts explicitly: outcome, mode, counts, persistence status,
  affected files, and useful next steps. Explain skipped or blocked work.
- Return redacted `PublicDiagnostic` values with the original severity, code,
  message, optional field, and optional `fixApplied` flag. The runner owns the
  `diagnostics` output; the action still owns its other documented outputs.
- `ActionReport` renders the same facts and diagnostics in logs, severity-matched
  annotations, and an HTML-escaped job summary. Successful runs with no
  diagnostics still receive a report. Do not duplicate this rendering in actions
  or hide essential explanations exclusively in machine-readable outputs.
- Exceptions pass through `RuntimeInput.publicErrorMessage` and receive a failure
  annotation, redacted diagnostic output, and summary. Never log raw exceptions,
  provider responses, contact records, credentials, or whole use-case results.
  A summary-write error must preserve the action outcome and existing log
  diagnostics; emit a safe warning without exposing the write error.
- Keep exit status separate from diagnostic severity. Set `report.failure` only
  when the action's documented policy requires failure. For example, referential
  validation fails on invalid catalogs. Issue-form synchronization fails on error
  diagnostics in either mode. Projection drift fails check mode by default;
  `fail-on-drift: false` reports drift without failing, as used by the pull-request
  check workflow because synchronization runs after merge. Successful updates in
  fix mode do not fail. Communication reconciliation fails on error
  diagnostics. Actions own these policies through the shared runner; calling
  workflows do not need separate enforcement steps. Reporting changes must not
  silently change these policies.

`tests/contracts/action-reporting.spec.ts` discovers every action manifest and
enforces the shared runner and reporting ownership. The runner's typed operation
requires report data on every returned path. Add behavioral tests beside the
changed action for public facts, diagnostics, redaction, and relevant skip/failure
paths; shared renderer and runner tests cover transport and exception behavior.
Update action descriptions and generated readmes, then rebuild all affected
bundles and run the quality checks above.

## Localization contract

Follow [the localization guide](localization.md) and
[ADR 0004](adr/0004-localize-generated-messages.md). Keep generated wording,
message IDs, parameter types, and catalog tests with the presenter that owns
them: action reporting, managed comments, issue-form guidance, or organizer
notifications. The shared localization package wraps FormatJS and contains no
feature catalogs or global message-key registry.

ActionRunner injects ActionMessages into actions; composition passes the resolved
locale to adapters, which construct their own scoped translators. Every public
action and reusable workflow exposes and forwards the same English-default
locale input. Do not introduce global locale state or translation dependencies
in domain/application rules. Preserve canonical diagnostic JSON and identifiers.

New messages require complete English/French translations, typed parameters,
owner-local catalog samples, and relevant behavior tests. Unknown diagnostic
fallbacks must already be redacted. Translations never bypass escaping, and
formatter error handlers must not expose interpolation values.
Localization contracts enforce catalog ownership, public locale wiring, and
diagnostic coverage. Catalog tests enforce key, ICU syntax, and argument parity.
Update public reference docs and rebuild bundles when catalogs change.

## Production code structure

All production behavior in `packages/**/src/**/*.ts` belongs to a focused class.
Use instance methods and explicit constructor dependencies for collaborators
with state or I/O. Stateless rules, parsers, value operations, and composition
factories may use static methods. Module-level functions, function-valued
variables, and object methods are prohibited. Local callbacks and helpers inside
classes are allowed; ports may declare function types without implementing them.
Data, constants, interfaces, and type aliases may remain at module scope.
Tests and build/tooling scripts are outside this production convention.

`pnpm check:structure` (also `make check-structure`) parses TypeScript with
`@babel/parser` to enforce class ownership. Package `src/index.ts` files only
expose existing declarations through imports and reexports; implementation and
side-effect imports belong in named modules. Action bootstrap files call the
runtime runner class. The check runs in `pnpm lint`, `pnpm quality`, and the
contract tests included in CI's test command.

Biome enforces these production limits as errors:

| Rule                                        | Limit                      |
| ------------------------------------------- | -------------------------- |
| Classes per file                            | 1                          |
| Lines per file                              | 300, excluding empty lines |
| Lines per function or method                | 60, excluding empty lines  |
| Cognitive complexity per function or method | 15                         |

`noStaticOnlyClass` is disabled only for production TypeScript to support the
chosen class-only convention. Existing import, dependency-direction, cycle, and
unused-code checks remain enabled. Do not bypass the limits with suppressions,
compressed statements, generic utility classes, or unrelated private methods.

Line limits catch growth, but cannot prove a single responsibility. Review each
class for a cohesive purpose and split parsing, validation, presentation,
persistence, and orchestration when they have different reasons to change.
Keep internal collaborators out of package entrypoints. Preserve observable
behavior with synthetic tests, including idempotency and failure paths, when
moving code. See [ADR-0003](adr/0003-production-code-structure.md).

## Test conventions

These rules apply to developers and agents across every `*.test.ts` and
`*.spec.ts` file, including unit, integration, architecture, and contract tests.

- Keep each unit test beside the source component, using the exact basename
  followed by `.test.ts`: `src/domain/policy.ts` and
  `src/domain/policy.test.ts`. Tooling follows the same convention:
  `scripts/check.mjs` and `scripts/check.test.ts`. Import the component directly.
- Split suites that independently test several components into their matching
  files. Shared test builders and fixtures belong in the package's `testing/`
  directory. Keep repository-wide integration, architecture, and public contract
  suites under `tests/` using `.spec.ts`; do not use that directory for unit tests.
- `pnpm check:structure`, lint, and CI contract tests reject misplaced unit tests,
  `.spec.ts` unit filenames, and names without a matching sibling source file.
  Package Vitest and Knip discover `src/**/*.test.ts`; production TypeScript
  configurations exclude tests and spec configurations include them.
- Describe behavior in test names. Use synthetic fixtures and stable example
  identifiers; do not name tests after a live issue, production run, customer,
  or incident. A regression should exercise the general condition that caused
  it. Contract tests may assert the product's documented configuration defaults.
- Structure every test with `// Arrange`, `// Act`, and `// Assert` comments,
  in that order, with a empty line between sections.
- Arrange inputs, expected values, dependencies, and mocks before exercising
  the behavior. Shared fixtures and hooks may provide setup; state that in the
  Arrange section when no additional local setup is needed.
- Act by calling the behavior under test and capturing its result. Keep calls
  out of assertions. For synchronous exceptions, define a named callback in
  Act and pass it to `expect` in Assert; for rejected promises, capture the
  promise in Act and await the rejection assertion immediately in Assert.
- Assert outcomes and observable side effects. Do not change fixtures or
  exercise another scenario in the Assert section. Split independent scenarios
  into separate tests or use `it.each`. For a stateful sequence, perform the
  sequence in Act and capture intermediate observations for later assertions.
- Helpers, mock implementations, and setup/cleanup hooks do not need artificial
  AAA sections; the comments separate the phases of each test case.

```typescript
it("rejects a non-positive issue identifier", () => {
  // Arrange
  const input = "0";

  // Act
  const parse = () => RuntimeInput.positiveIntegerInput("issue-number", input);

  // Assert
  expect(parse).toThrow("issue-number must be a positive integer");
});
```

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
Apply the test conventions above to every test added or modified.
