# Agent instructions

Start with [the development guide](docs/development/README.md) and follow its
architecture, quality, and test conventions.

Use the [documentation index](docs/README.md) to find guides relevant to the
change. Current development guides and executable architecture and contract
checks under `tests/` define the supported conventions. Follow the
[documentation rules](docs/development/documentation.md) for every documentation
change.

Keep this overview focused on documentation entry points. Maintain the document
inventory in the documentation index instead of listing individual guides here.

Prefer minimal, deterministic changes and keep documentation in sync with code.

Apply the mandatory [Clean Architecture, Clean Code, and SOLID criteria](docs/development/architecture.md#clean-architecture-clean-code-and-solid)
and complete the [design review](docs/development/architecture.md#required-design-review)
for every implementation, refactor, and code review. Identify the owning layer
and responsibilities before editing; inspect affected callers before completion.
Separate business policies, external codecs, presentation, authorization, and
effects according to their reasons to change. A class wrapper, an extracted
helper, or passing numeric checks is not evidence of separation of concerns.
Fix violations introduced or expanded by the change and report any remaining
concern explicitly. Include concise responsibility/dependency review evidence
alongside validation results in the PR description or handoff. Do not claim
Clean Architecture or SOLID compliance from automated checks alone.

Use the straight ASCII apostrophe (`'`, U+0027) in source text, translations,
tests, and documentation. Do not use typographic apostrophes (U+2019).

Unit tests must live beside their source component and use its exact basename
plus `.test.ts` (for example, `policy.ts` and `policy.test.ts`). Split tests of
independent components into matching files. Import the component directly; put
shared fixtures in package `testing/` folders. Use `tests/**/*.spec.ts`
for repository-wide integration, architecture, and contract checks. Test-owned
helpers have adjacent `.test.ts` files under their architecture, contract, or
integration owner. The structure check enforces unit-test location and naming.

Follow [repository tooling ownership](docs/development/architecture.md#repository-tooling-ownership)
when adding build tools, checkers, or CI fixtures. Place them beside their owner,
keep business behavior in production packages, and keep production imports
independent of test and packaging implementations. Do not create a root tooling
catchall or duplicate repository checks in standalone CLIs.

Tests must describe general behavior using synthetic fixtures, without naming
live issues or production incidents. Every test case must have explicit
`// Arrange`, `// Act`, and `// Assert` sections in that order. Keep setup,
execution, and assertions separate. Keep the action outside assertions, and use
separate or parameterized tests for independent input variations. See the test
conventions in `docs/development/testing.md` for exceptions and stateful
sequences.

Production behavior must be owned by focused classes throughout
`packages/**/src`. Use required constructor injection for every collaborator, including stateless
policies, parsers, codecs, and presenters. Do not use static service methods,
module singletons, fallback concrete collaborators, or inline construction to hide dependencies.
Do not allocate collaborators or define factory callbacks in parameter defaults.
Bind clocks and provider functions in composition, and supply reusable policies
as narrow instances. Review each factory's operation-specific input or lifetime.
Use narrow structural contracts and inject typed factories when creation requires
operation-specific inputs. Follow the narrow value-factory and composition
exceptions in [constructor injection](docs/development/architecture.md#constructor-injection). Do not add
module-level functions or callbacks. Keep package `src/index.ts` files limited
to imports and reexports. Respect the enforced limits: one class per file, 300
nonblank lines per file, 60 nonblank lines per method/function, and cognitive
complexity 15. Do not suppress these rules or pack statements to evade them. Run
`pnpm lint`, `pnpm build`, the behavioral/architecture/contract tests, and
rebuild/check action bundles after production changes. Responsibility and
dependency review remains necessary even when numeric checks pass.

Enforce the [action interface rules](docs/development/README.md#action-interface-rules)
for every owned action and workflow, including manual inputs: all inputs must
declare `required: true`, with no `default`
key, and callers must supply them explicitly. Do not add optional inputs or
runtime defaults that conceal missing required values, including for `locale`
and booleans. Audit operational callers, excluding tests: remove flags that always
select the same behavior and make that behavior unconditional. Remove inputs
that are always null, false, or empty, and delete their unused behavior, parsers,
types, and tests. Do not retain a required dummy value to preserve an unused path.
Declare and emit only outputs with an identified, actual operational consumer;
documentation, tests, debugging, logging, optional verbosity, and hypothetical
future use do not establish one. Trace forwarding chains to their final effect.
Remove unused outputs and update runtime code, callers, documentation, and
contract checks together. Do not create dummy consumers to preserve an output.
Keep `pnpm check:interfaces` in both local and CI lint commands. Its checks must
reject constant flags, empty-only inputs, and logging-only output references;
new script consumers need reviewed data-flow checks rather than a blanket bypass.

For actions that use AI, enforce the shared
[AI configuration contract](docs/reference/configuration.md#ai-configuration)
and its runtime `AiInput` parser, as required by the
[development guide](docs/development/README.md#action-interface-rules).
Keep provider-specific credential mapping at the adapter boundary and omit AI
inputs from actions that do not use AI.

Every public GitHub Action must follow the Action reporting contract in
[the action reporting guide](docs/development/reporting.md): use
`await runner.run` on the composed `ActionRunner` instance with its action title message ID and the explicit
diagnostic-output flag matching its manifest, and return
`ActionReportData` on every normal path, including skips. The shared
runner/reporter owns diagnostic outputs, technical logs, escaped job summaries,
and redacted exception reporting. Never expose private records or raw exceptions.
Do not add action-specific logging or summary implementations.

Enforce these [feedback rules](docs/development/reporting.md#required-feedback-rules)
in every implementation, refactor, and review:

1. CI must report concise technical facts. Expected organizer corrections must
   not fail jobs; use the shared `DiagnosticPolicy` to distinguish them from
   unexpected technical failures.
2. Issue comments and Slack must share concise, deduplicated actions from the
   merged checklist. Do not create separate reports of the same organizer task.
3. Incomplete runs must preserve unresolved tasks. Missing, skipped, failed, or
   concurrently invalidated stages are not evidence of resolution.

Add or update focused behavior coverage for changed feedback behavior using
the [reporting validation requirements](docs/development/reporting.md#validation).
Keep `tests/contracts/action-reporting.spec.ts` enforcing shared reporting
ownership for every published action.

Generated user-facing text must use its presenter's scoped translator and
owner-local English/French ICU catalogs. The shared
packages/presentation/localization package provides only generic FormatJS
infrastructure and catalog types; never put feature wording or a global
message-key registry there. Keep catalogs, argument types, and catalog tests
beside the presenter. Pass locale across package boundaries; do not import
another presenter's catalogs. Follow
[the localization guide](docs/development/localization.md).

Do not hardcode new report, guidance, comment, or notification prose outside
owner catalogs. Domain/application diagnostics retain canonical English machine
messages; translate at the presentation boundary. Preserve identifiers,
redaction, and escaping. Do not enable formatter logging that could reveal
interpolation values. Actions must require an explicit `locale` input without a
default. Reusable workflows must forward their resolved locale to all owned
actions. Keep catalog, behavior,
architecture, and localization contract tests passing.

## Documentation rules

Developer guides, agent instructions, user guides, and action and workflow
references must describe only the current implemented and supported system.
ADRs under `docs/adr/` are the explicit exception: preserve their decision
history.

- Maintain one authoritative explanation per topic. Update it in place with the
  code change, and link to it from other pages.
- Remove obsolete, deprecated, superseded, historical, and speculative content
  from current guides. Update explanations in place instead of appending
  migration narratives or corrections.
- Preserve ADRs, their numbering, context, alternatives, and consequences. Do
  not delete or rewrite past decisions during cleanup. Record changed decisions
  in new ADRs and update the affected records' status and supersession links.
- Keep current architectural rationale and constraints in the relevant guide.
  Verify documented behavior against source, tests, and public manifests; do not
  change production behavior to make an inaccurate document true.
- Follow the [documentation guide](docs/development/documentation.md) for page
  placement, writing, and validation. Update the index, directory tree, and all
  incoming links when adding, moving, or deleting pages.
