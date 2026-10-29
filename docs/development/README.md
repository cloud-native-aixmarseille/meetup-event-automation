# Development

This is a TypeScript pnpm workspace. The public deliverables are the GitHub
Actions in `actions/` and reusable workflows in `.github/workflows/`.

Read the [architecture rules](architecture.md) before changing package
responsibilities and the [test conventions](testing.md) before adding tests. Use
[action reporting](reporting.md) and [localization](localization.md) for
generated messages. Follow the [documentation rules](documentation.md): guides
describe only the current implemented and supported system, while ADRs preserve
decision history. Keep root readmes concise and end user focused; put details in
`docs/`. Action and workflow references are generated: update their source
manifests and regenerate them, without manual additions. [AGENTS.md](../../AGENTS.md)
also applies to agent-assisted work.

## Design and review

The [Clean Architecture, Clean Code, and SOLID criteria](architecture.md#clean-architecture-clean-code-and-solid)
are mandatory for implementations and refactors. Identify responsibility and
layer ownership before editing, then complete the
[design review](architecture.md#required-design-review) before presenting the
change as ready. Include concise evidence of the affected boundaries and relevant
checks in the PR description. CI complements this review; it cannot establish
responsibility cohesion or correct business-policy placement on its own.

## Setup

Use Node.js 24 and the pnpm version in [`package.json`](../../package.json).
Action bundles target Node.js 24; the package's minimum supported development
runtime is Node.js 22.12.0.

```sh
pnpm install --frozen-lockfile
```

`make setup` runs the same install. Dependencies, including Biome, come from
`pnpm-lock.yaml`; do not substitute globally installed lint tools or force
incompatible transitive versions to silence dependency warnings.

## Commands

Run commands from the repository root.

| Command                   | Purpose                                                                                           |
| ------------------------- | ------------------------------------------------------------------------------------------------- |
| `pnpm lint`               | Check formatting, Biome rules, class/test structure, and unused code/dependencies                 |
| `pnpm build`              | Type-check the root TypeScript project without emitting files                                     |
| `pnpm workspace:build`    | Type-check workspace projects through Nx                                                          |
| `pnpm test`               | Run all unit, integration, architecture, and contract tests                                       |
| `pnpm test:watch`         | Run Vitest in watch mode                                                                          |
| `pnpm test:cov`           | Run tests with coverage thresholds                                                                |
| `pnpm check:architecture` | Check dependency boundaries, structure, and architecture rule helpers                             |
| `pnpm check:contracts`    | Check action, workflow, and CI contracts and their analysis helpers                               |
| `pnpm check:interfaces`   | Reject optional/defaulted inputs, constant flags, empty-only inputs, and unused outputs           |
| `pnpm check:structure`    | Check class ownership, entrypoints, and unit-test placement                                       |
| `pnpm check:knip`         | Find unused code and dependencies                                                                 |
| `pnpm package`            | Rebuild committed action bundles                                                                  |
| `pnpm check:dist`         | Rebuild bundles and fail if their bytes were stale or missing                                     |
| `pnpm quality`            | Run lint, root/workspace type checks, architecture/contracts, packaging, tests, and bundle checks |

Use `pnpm format` to apply formatting and `pnpm lint:fix` for Biome lint fixes.
Both can edit files; review the resulting diff.

The [Makefile](../../Makefile) provides wrappers for these checks. `make lint`
and `make lint-fix` additionally build and run the repository's Super-linter
Docker image. They require Docker. Super-linter's Biome checks are disabled;
`pnpm` runs the lockfile version. The linter container masks the workspace's
`node_modules` directory so its bundled tools and presets do not load
host-installed dependencies. This matches hosted linting before dependency
installation.

The linter mounts the shared Git directory read-only so these commands also work
from a linked Git worktree.

## Choose checks for the change

- **Production code:** run `pnpm quality` and include changed action bundles.
  Run focused tests while developing; the full command covers behavior,
  architecture, public contracts, and packaging before review.
- **Action metadata or workflow YAML:** run `pnpm check:contracts` and
  `make lint`. Regenerate the adjacent action or workflow reference through the
  release workflow and update the relevant guide under `docs/`.
- **Documentation only:** follow the [documentation review checklist](documentation.md#review-and-validation),
  including source verification, links and anchors, the index and tree, YAML
  examples, `pnpm check:contracts`, and `make lint`. Do not add
  implementation-mirroring tests or rebuild bundles for prose changes.

[`packages/runtime/github-actions/packaging/build-actions.mjs`](../../packages/runtime/github-actions/packaging/build-actions.mjs) owns the bundle
entrypoints and build settings. Edit source, then run `pnpm package`; never edit
`actions/**/dist/index.js` directly. `check:dist` compares files before and
after its own rebuild, including missing files, independently of Git staging.
See [repository tooling ownership](architecture.md#repository-tooling-ownership)
for placement of build tools, repository checks, and CI fixtures.

## CI and public documentation

Main and pull-request CI use
[`__shared-ci.yml`](../../.github/workflows/__shared-ci.yml). It runs the shared
linter, Node.js checks, bundle verification, and action integration tests
against a synthetic issue. Pull-request CI runs for every target branch, so
each layer of a stacked pull request is validated regardless of its base name.
`lint:ci` emits SARIF; `test:ci` emits JUnit and
coverage reports. These reporting entrypoints must remain compatible with the
shared CI workflows.

The Node.js check workflow passes [its scan configuration](../../.github/codeql/config.yml)
to the shared workflow through the JSON `code-ql` input, with `languages` and
`config-file` fields. CodeQL scans authored
source, tests, and tooling with the default security queries, excluding only
`actions/**/dist/**`. Those generated bundles duplicate source and third-party
dependencies; `check:dist` verifies their bytes against a fresh build. Bundled
dependency internals are outside this CodeQL scan. Dependency review and
Dependabot remain separate dependency checks, and the shared linter scans GitHub
Actions. The shared Node.js workflow owns CodeQL initialization and analysis.
CodeQL and bundle checks run for pull requests and main CI;
dependency review runs on pull requests.

Keep action inputs and outputs in `action.yml`, and workflow inputs, outputs,
and secrets in the corresponding YAML. Their adjacent Markdown references are
generated; do not edit them manually or append guides. The release job in
[`__main-ci.yml`](../../.github/workflows/__main-ci.yml) delegates documentation
updates to the pinned reusable release workflow. Keep manual documentation under
`docs/`. See [generated references](documentation.md#generated-references) for
ownership and regeneration. There is no local documentation generator.

The release GitHub App needs Contents, Pull requests, and Workflows write
permissions; the reusable release workflow requests those permissions explicitly.

GitHub releases run weekly and manually through
[`__release.yml`](../../.github/workflows/__release.yml), after shared CI succeeds.
See [publishing releases](releases.md) for credentials, changelog generation, and
recovery.

### Workflow organization

Public workflow names follow the [lifecycle use cases](../usage/workflows.md).
Prefix internal CI, maintenance, and implementation helpers with `__`. Keep
workflow files flat under `.github/workflows/`; phases are filename prefixes.
Business timing, readiness, approval, and delivery policies stay in their owning
packages. See [workflow ownership](architecture.md#action-and-workflow-ownership)
for composition and locking.

Contract checks trace local calls from public entry points through internal
helpers and forwarded outputs. A reachable helper is an operational caller;
isolated CI fixtures are not. Do not exempt operational helpers merely because
their filenames begin with `__`.

### Action interface rules

Apply these requirements to every owned action and workflow input and output,
including manual workflow inputs:

- Every input must declare `required: true` and omit the `default` key entirely.
  Optional inputs, omitted `required`, and defaults are prohibited, including
  for `locale`, booleans, credentials, and execution settings.
- Callers must pass each input explicitly. Validate required values at the
  runtime boundary; do not hide a missing input behind a runtime default, an
  empty string, or an implicit environment value. Keep fixed internal values
  out of the public input contract.
- Trace values through operational callers, excluding tests and examples. If a
  flag or mode always selects the same behavior, remove it and make that behavior
  unconditional. If an input is always null, false, or empty, remove it and its
  unused behavior. Delete the associated parsers, types, branches, tests, and
  documentation. Requiring an explicit dummy value does not make an input useful.
  Required data such as locale and identifiers can legitimately have one current
  value; this does not justify constant behavioral switches.
- Declare and emit an output only when an identified caller actually consumes
  it. Trace the value to a workflow expression, downstream action, or supported
  external caller. A declaration, readme entry, test assertion, or hypothetical
  future use is not a consumer. This applies to result envelopes, diagnostics,
  counts, flags, and URLs as well as feature-specific outputs.
- Debugging, logging, summaries, and optional verbose output are not operational
  consumers. Follow exported values through wrappers to the final decision,
  downstream input, or published artifact. A reference alone is insufficient.
- Remove unused outputs from the manifest and runtime together, and update
  callers, source descriptions, current guides, and contract tests in the same change.
  Keep information intended for people in the shared logs, annotations, and
  job summary; reporting alone does not justify a public output.
- Review the contract tests when changing an interface. Assert that every input
  is required and has no default, and verify the real consumer of every retained
  output. Do not add dummy reads or tests solely to make an unused output appear
  consumed.

`pnpm check:interfaces` runs in both `pnpm lint` and `pnpm lint:ci`. It verifies
required inputs without defaults, explicit action callers, operational flag
values, and consumed outputs. Internal integration tests do not establish
production use. It recognizes owned action inputs, operational conditions and
matrices, and checked shell data flows into published pull requests. Unknown
script or third-party consumers need a reviewed rule and regression coverage;
do not accept arbitrary environment bindings or logging as evidence.

Reusable workflows require inputs explicitly too and forward them to actions.
See [localization](localization.md) and [action reporting](reporting.md) for the
corresponding runtime responsibilities.

Actions that use AI must follow the shared
[AI configuration contract](../reference/configuration.md#ai-configuration)
and parse its configuration through runtime `AiInput`. Reusable workflows must
require and explicitly forward the applicable contract. A workflow composing text and image
generation requires separate `ai-text-model` and `ai-image-model` inputs and
binds each to the relevant action's `ai-model`; provider and secret remain shared.
Publication adapters take their conditional `ai` object from the required
`publication-credentials` bundle and validate it with the same `AiInput.validate`
contract. Require AI only for the enabled Meetup adapter; OCGroups needs none.
Inject the validated configuration through
runtime composition; keep provider-specific credential mapping at the provider
adapter boundary. Do not add AI settings to actions that do not use them.
Update the shared parser and its validation when changing supported providers;
do not add an action-specific parser or provider-specific public inputs.

Keep current architectural rationale in the relevant development guide.
Preserve [ADRs](../README.md#architecture-decisions) as decision history, with
clear status and supersession links. Follow the
[documentation guide](documentation.md) for page ownership and validation.
