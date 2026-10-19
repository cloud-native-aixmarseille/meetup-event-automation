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

Use the straight ASCII apostrophe (`'`, U+0027) in source text, translations,
tests, and documentation. Do not use typographic apostrophes (U+2019).

Unit tests must live beside their source component and use its exact basename
plus `.test.ts` (for example, `policy.ts` and `policy.test.ts`). Split tests of
independent components into matching files. Import the component directly; put
shared fixtures in package `testing/` folders. Reserve root `tests/*.spec.ts`
for repository-wide integration, architecture, and contract checks. The
structure check enforces unit-test location and naming.

Tests must describe general behavior using synthetic fixtures, without naming
live issues or production incidents. Every test case must have explicit
`// Arrange`, `// Act`, and `// Assert` sections in that order. Keep setup,
execution, and assertions separate. Keep the action outside assertions, and use
separate or parameterized tests for independent input variations. See the test
conventions in `docs/development/testing.md` for exceptions and stateful
sequences.

Production behavior must be owned by focused classes throughout
`packages/**/src`. Use constructor injection for stateful or I/O collaborators;
static methods are allowed for stateless operations and composition. Do not add
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

Every public GitHub Action must follow the Action reporting contract in
[the action reporting guide](docs/development/reporting.md): use
`await ActionRunner.run` with its action title message ID and the explicit
diagnostic-output flag matching its manifest, and return
`ActionReportData` on every normal path, including skips. The shared
runner/reporter owns diagnostic outputs, logs, severity-matched annotations,
escaped job summaries, and redacted exception reporting. Include public outcome
facts and actionable guidance; never expose private records or raw exceptions.
Preserve each action's failure policy explicitly through `report.failure`. Add
or update behavior tests and keep `tests/contracts/action-reporting.spec.ts`
enforcing this for every published action. Do not add action-specific logging or
summary implementations.

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
