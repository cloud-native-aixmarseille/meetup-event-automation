# Maintain current documentation

The implementation is the source of truth. Guides describe its supported behavior.
Update the authoritative page for a topic in the same change as its behavior,
configuration, or contract. These rules apply to developer and agent
instructions, user guides, and action and workflow references. ADRs under
`docs/adr/` are the explicit exception: they preserve decision history.

## Content rules

- Describe the final supported behavior in the present tense. Remove historical
  descriptions, deprecated settings, obsolete APIs, superseded decisions,
  completed migration plans, and speculative features from current guides.
- Update explanations in place. Do not append corrections, before/after
  narratives, or dated decision records to guides.
- Keep rationale and trade-offs that explain current constraints in the relevant
  guide. Do not require readers to follow a chain of decisions to determine
  which rule applies.
- Maintain one authoritative explanation per topic; link to it from summaries
  and related guides. Delete redundant guide pages and repair their incoming links.
- Verify behavior against source, tests, package scripts, and public manifests.
  Keep supported rerun, recovery, and data-preservation contracts; remove legacy
  setup and compatibility instructions. Do not change production behavior to
  match inaccurate prose.
- State required provider capabilities, credentials, deployment prerequisites,
  limits, and manual recovery steps. An implementation in this repository does
  not establish that an external service has deployed a required API.

## Preserve architecture decisions

Keep one consolidated record per coherent feature or architectural scope under
`docs/adr/`. Each record states its accepted decisions, context, alternatives,
consequences, and decision history. Add a new scope only for a distinct concern;
do not create a separate record for every implementation adjustment.

Prefix each scope filename with a unique four-digit number, such as
`0001-architecture.md`. Keep assigned numbers stable when adding new scopes.

When a decision changes, update the accepted decision and add a dated history
entry preserving the previous choice, the reason for replacement, and any partial
supersession. Link related scope records when a change affects their boundaries.
Do not erase historical rationale or present dated evidence as current validation.

The original numbered records live under `docs/adr/archive/`. Preserve their
titles, numbers, original context, alternatives, consequences, and evidence.
Do not rewrite their bodies to match later implementation. Keep their supersession
links and links back to the consolidated scope valid. Duplicate historical numbers
are distinguished by title, not renumbered.

The documentation index lists the scope records separately from current guides;
the archive index inventories every original record. Readers must be able to
determine current behavior from the guides without reconstructing decision history.

## Page placement and writing

Root `README.md` files contain only concise end user documentation: purpose, getting
started, basic usage, and links into `docs/`. Keep architecture, development
commands, contributor rules, release mechanics, and history out of them.
Put detailed guides under `docs/`:

| Location        | Purpose                                                                 |
| --------------- | ----------------------------------------------------------------------- |
| `usage/`        | Tasks for repository maintainers and meetup organizers                  |
| `reference/`    | Supported configuration, data formats, and fixed conventions            |
| `integrations/` | Service setup, automatic behavior, and operational recovery             |
| `development/`  | Architecture, contributor instructions, and validation                  |
| `adr/`          | Decisions grouped by scope, with history and an original-record archive |

`docs/README.md` owns the linked document inventory and directory tree.
`CONTRIBUTING.md` and `AGENTS.md` direct contributors to the relevant guides.

Give each page one purpose and one audience. State the task or behavior first,
then prerequisites, steps, expected results, and relevant limitations. Use plain,
direct language and the straight ASCII apostrophe (`'`). Remove filler,
repetition, and implementation details that do not help the reader.

Use synthetic examples and identify required placeholders. Distinguish
automatic work from manual tasks. Keep commands, paths, inputs, outputs,
secrets, permissions, examples, and defaults consistent with their owners in
source and manifests, including generated reference sections.

## Generated references

`actions/**/README.md` and `.github/workflows/*.md` are CI Dokumentor outputs
beside their YAML manifests. Do not edit generated content or append manual
sections. Put task guides, worked examples, setup, and recovery under `docs/`,
and link them from the documentation index.

Change inputs, outputs, secrets, descriptions, and permissions in the owning
YAML. The release job in
[`__main-ci.yml`](../../.github/workflows/__main-ci.yml) calls the pinned reusable
release workflow to regenerate references. Preserve CI Dokumentor's paired
section comments and review its diff against the source manifests. There is no
local generation command; report regeneration as pending until that job runs.
Do not hand-patch its output to simulate a successful generation.

## Review and validation

Before completing a documentation change:

1. Check each changed claim against its implementation or public contract.
   Remove obsolete guide content instead of adding a warning beside it; preserve
   ADR content and verify its status and supersession links.
2. Update every incoming link when a page or heading moves or is deleted. Check
   local links and anchors, and ensure the index and directory tree match the
   files on disk.
3. Parse YAML examples and run the relevant public contract checks with
   `pnpm check:contracts`.
4. Run `make lint` for the repository's Markdown and YAML checks. It requires
   Docker; report checks that could not run.
5. Confirm root readmes remain end user focused, manual details live in `docs/`,
   and decision history lives only in ADRs. If manifests changed, review the
   regenerated references or report the pending release job explicitly.

Use [the development checklist](README.md#choose-checks-for-the-change) for
changes that also affect code or manifests. Documentation-only edits do not
require rebuilding action bundles or adding tests that mirror prose.
