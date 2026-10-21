# Testing

Run `pnpm test` for the full suite. Run a matching component while developing:

```sh
pnpm exec vitest run packages/domain/event/src/domain/lifecycle.test.ts
```

Domain and application tests use deterministic inputs, fixed clocks, and
injected collaborators. They do not require live services. Adapter tests use
synthetic data and controlled provider responses. Cover observable behavior,
including invalid input, retries, ambiguous failures, concurrency checks,
privacy, and idempotency when relevant to the change.

## File placement

| Test                                                   | Location                                                           |
| ------------------------------------------------------ | ------------------------------------------------------------------ |
| Component unit test                                    | Beside its source, with the exact basename plus `.test.ts`         |
| Tooling unit test                                      | Beside the script: `scripts/check.mjs` and `scripts/check.test.ts` |
| Shared package fixtures/builders                       | The package's `testing/` directory                                 |
| Repository integration, architecture, or contract test | `tests/**/*.spec.ts`                                               |

Import the component directly. Split independently tested components into
matching files. Do not put unit tests under root `tests/` or name them
`.spec.ts`. `pnpm check:structure`, lint, and contract tests enforce placement
and sibling source names. Production TypeScript configurations exclude unit
tests; spec configurations include them.

## Arrange, Act, Assert

These rules apply to every `*.test.ts` and `*.spec.ts` test case.

1. Name the general behavior using synthetic examples and stable identifiers. Do
   not name tests after live issues, customers, production runs, or incidents.
   Contract tests may assert documented product defaults.
2. Include `// Arrange`, `// Act`, and `// Assert` comments in that order, with
   an empty line between sections.
3. Arrange inputs, expected values, dependencies, and mocks before execution.
   Shared fixtures or hooks may supply setup; explain that in Arrange when no
   extra local setup is needed.
4. Act by calling the behavior and capturing the result. Keep execution outside
   assertions. For synchronous exceptions, define a named callback in Act and
   pass it to `expect` in Assert. For a rejected promise, capture the promise in
   Act and immediately await the rejection assertion in Assert.
5. Assert outcomes and observable side effects. Do not change fixtures or start
   another scenario in Assert. Split independent variations into separate tests
   or use `it.each`. For a stateful sequence, run the sequence in Act and
   capture intermediate observations for assertions afterward.

Helpers, mock implementations, and setup/cleanup hooks do not need artificial
AAA sections. The comments separate phases within each test case.

```typescript
it("rejects a non-positive issue identifier", () => {
  // Arrange
  const input = "0";
  const parser = new RuntimeInput();

  // Act
  const parse = () => parser.positiveIntegerInput("issue-number", input);

  // Assert
  expect(parse).toThrow("issue-number must be a positive integer");
});
```

## Repository checks

When changing action interfaces, enforce the
[action interface rules](README.md#action-interface-rules) in contract coverage:
every declared input has `required: true` and no `default` key, and every output
has an identified real consumer. Check caller wiring and runtime input validation
alongside the manifest. Tests and dummy workflow reads do not count as consumers;
remove unused outputs from runtime emission and metadata together.
Reject flags with one operational value and inputs that are always null, false,
or empty. Logging and optional verbose reads cannot establish output use.
The focused `pnpm check:interfaces` command also runs in local and CI lint.

| Check                                                                        | What it verifies                                                                   |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| [Architecture](../../tests/architecture.spec.ts)                             | Dependency layers, package entrypoints, cycles, adapter names, DI boundaries       |
| [Code structure](../../tests/contracts/code-structure.spec.ts)               | Biome limits, class ownership, unit-test layout, unsafe JSON casts and comparisons |
| [Public actions](../../tests/contracts/public-actions.spec.ts)               | Action inputs, outputs, runtime, dispatch authorization                            |
| [Action interfaces](../../tests/contracts/action-interfaces.spec.ts)         | Required inputs without defaults, explicit caller wiring, consumed outputs         |
| [Action reporting](../../tests/contracts/action-reporting.spec.ts)           | Shared runner, public reports, failure policy, and safe rendering                  |
| [Localization](../../tests/contracts/localization.spec.ts)                   | Catalog ownership, locale wiring, and diagnostic coverage                          |
| [Public workflows](../../tests/contracts/public-workflows.spec.ts)           | Reusable workflow interfaces, permissions, secrets, pinned dependencies            |
| [Event safeguards](../../tests/contracts/event-side-effects.spec.ts)         | Shared concurrency lock, audit gating, issue-form validation                       |
| [Attention safeguards](../../tests/contracts/attention-side-effects.spec.ts) | Final execution after failure, typed outcomes, and shared concurrency              |
| [Feedback safeguards](../../tests/contracts/feedback-side-effects.spec.ts)   | Feedback action credentials and workflow gating                                    |
| [Internal CI](../../tests/contracts/internal-ci.spec.ts)                     | Shared CI, action checks, release documentation wiring                             |
| [Journey integration](../../tests/journey-referential-integration.spec.ts)   | Event, catalog, codec, and issue-form behavior together                            |

[`__check-actions.yml`](../../.github/workflows/__check-actions.yml) exercises
bundled actions in CI using a synthetic issue and catalog fixtures. Its cleanup
job closes the test issue, including when fixture preparation fails after creation.
Preparation waits for the created issue to appear in the same open, labeled
issue listing used by the action. This bounded check allows GitHub's listing to
reflect the new fixture before action checks start; API failures remain failures.
Do not replace these fixtures with live meetup issues.
Communication integration checks use a synthetic issue with its introduction
task already completed and assert that diagnostics contain no errors. Runtime and
journey tests verify planning and dispatch counts with controlled collaborators.

`pnpm test:cov` enforces the aggregate thresholds in
[`vitest.config.ts`](../../vitest.config.ts): 90% lines/statements and 85%
branches/functions. Tests, shared fixtures, and runtime bootstrap entrypoints
are excluded from coverage. Coverage percentages do not replace assertions about
failure paths or data privacy.

Use [the development checklist](README.md#choose-checks-for-the-change) to
select checks and rebuild bundles after production changes.

## Meetup solver

The browser adapter's Python boundary has adjacent `solve_test.py` tests using
synthetic pages and agents. No Gemini key or live Meetup account is needed.
With Python 3.14, run from
`packages/adapter/meetup-event-gateway/python`:

```sh
python -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python -m unittest discover -p '*_test.py'
```

Shared CI runs these checks separately from the TypeScript suite. TypeScript
adapter tests cover solver deadlines, subprocess isolation, cleanup, and login
ordering. A live organizer publication run is separate from these synthetic tests.

## Meetup browser editor

Install Chromium with `pnpm exec playwright-core install chromium` before running
the TypeScript test suite. CI uses `playwright-core install --with-deps chromium`
to install browser system dependencies as well. The editor tests run real
Chromium against intercepted synthetic pages; every request is fulfilled locally.
No organizer credentials, Gemini requests, or live Meetup writes are used.
