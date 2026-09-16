# Agent instructions

Start with `docs/developer-guide.md` and follow its
architecture, quality, and test conventions.

Use the architecture ADR and the executable tests as the source of truth:

- `docs/adr/0001-centralize-meetup-event-automation.md`
- `docs/adr/0003-production-code-structure.md`
- `tests/architecture.spec.ts`
- `tests/contracts/code-structure.spec.ts`
- `tests/contracts/*.spec.ts`

Prefer minimal, deterministic changes and keep documentation in sync with code.

Unit tests must live beside their source component and use its exact basename
plus `.test.ts` (for example, `policy.ts` and `policy.test.ts`). Split tests of
independent components into matching files. Import the component directly; put
shared fixtures in package `testing/` folders. Reserve root `tests/*.spec.ts` for
repository-wide integration, architecture, and contract checks. The structure
check enforces unit-test location and naming.

Tests must describe general behavior using synthetic fixtures, without naming
live issues or production incidents. Every test case must have explicit
`// Arrange`, `// Act`, and `// Assert` sections in that order. Keep setup,
execution, and assertions separate. Keep the action outside assertions, and use
separate or parameterized tests for independent input variations. See the test
conventions in `docs/developer-guide.md` for exceptions and stateful
sequences.

Production behavior must be owned by focused classes throughout `packages/**/src`.
Use constructor injection for stateful or I/O collaborators; static methods are
allowed for stateless operations and composition. Do not add module-level
functions or callbacks. Keep package `src/index.ts` files limited to imports and
reexports. Respect the enforced limits: one class per file, 300 nonblank lines
per file, 60 nonblank lines per method/function, and cognitive complexity 15.
Do not suppress these rules or pack statements to evade them. Run `pnpm lint`,
`pnpm build`, the behavioral/architecture/contract tests, and rebuild/check action
bundles after production changes. Responsibility and dependency review remains
necessary even when numeric checks pass.
