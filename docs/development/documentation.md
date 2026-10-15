# Maintain current documentation

Guides are the source of truth for the current implemented and supported system.
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
  Document compatibility only when it is currently supported and useful to the
  reader. Do not change production behavior to match inaccurate prose.
- State required provider capabilities, credentials, deployment prerequisites,
  limits, and manual recovery steps. An implementation in this repository does
  not establish that an external service has deployed a required API.

## Preserve architecture decisions

Keep ADRs under `docs/adr/`, including superseded records. Preserve their
numbering, original context, alternatives, and consequences. Do not delete ADRs
or rewrite past decisions to match the implementation during documentation
cleanup.

When a decision changes, add a new ADR and update the affected records' status
and supersession links. Keep these updates factual, including partial
supersession. The documentation index lists all ADRs separately from current
guides. Readers must be able to determine current behavior from the guides
without reconstructing the decision history.

## Page placement and writing

Keep `README.md` focused on what the project does, who uses it, how to start, and
where to find details. Put detailed guides under `docs/`:

| Location        | Purpose                                                      |
| --------------- | ------------------------------------------------------------ |
| `usage/`        | Tasks for repository maintainers and meetup organizers       |
| `reference/`    | Supported configuration, data formats, and fixed conventions |
| `integrations/` | Service setup, automatic behavior, and operational recovery  |
| `development/`  | Architecture, contributor instructions, and validation       |
| `adr/`          | Preserved architecture decision history and status           |

Keep action and workflow contract references beside their YAML manifests.
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

Use [the development checklist](README.md#choose-checks-for-the-change) for
changes that also affect code or manifests. Documentation-only edits do not
require rebuilding action bundles or adding tests that mirror prose.
