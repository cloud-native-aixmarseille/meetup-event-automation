# Architecture, dependency injection, and presentation

Status: Accepted decisions consolidated on 2026-10-23.

Scope: repository ownership, package boundaries, production structure, composition,
privacy, and localization. Implementation conventions live in the
[architecture guide](../development/architecture.md) and
[localization guide](../development/localization.md).

## Context

Meetup rules originally spanned the automation and consumer repositories, workflow
expressions, issue parsing, and provider clients. Centralizing files alone would
retain that coupling. Large codecs and implicit collaborators also made local
responsibilities difficult to change or test independently.

## Accepted decisions

`meetup-event-automation` owns event behavior, schemas, orchestration, adapters,
actions, and reusable workflows. The consumer owns event issues, private catalogs,
configuration, credentials, permissions, and thin trigger workflows pinned to an
automation revision. Private workspace packages are implementation details;
actions and workflows are the public delivery surface.

Release orchestration belongs to internal workflows. Shared CI validates the
release commit; pinned upstream actions own semantic version planning, changelog
generation, and GitHub publication. Gemini credentials stay at that external
action boundary. The [release guide](../development/releases.md) owns operation
and recovery instructions.

Internal CI owns the JavaScript/TypeScript CodeQL configuration and passes it to
the shared Node.js workflow through the JSON `code-ql` input. It excludes only
generated action bundles while retaining authored source, tests, tooling, and
the default security queries. Bundle freshness and dependency checks remain
separate gates; CodeQL no longer analyzes bundled third-party internals.

Business rules belong to event, referential, communication, and publication
domains. Journey coordinates their public APIs. Each port has one owner, and
vendor payloads remain inside adapters. Dependencies follow these boundaries:

| Layer        | Allowed workspace dependencies             |
| ------------ | ------------------------------------------ |
| Domain       | None                                       |
| Application  | Domain                                     |
| Presentation | None                                       |
| Adapter      | Domain, application, presentation          |
| Runtime      | Domain, application, adapter, presentation |

The [generation gateway](0008-draft-generation.md#ownership-and-provider-boundary)
has a narrower application-only dependency contract. Adapters are grouped by
business or capability scope and named for their technology and responsibility.
Package entrypoints expose supported declarations; deep imports, dependency
cycles, adapter-to-adapter imports, and generic utility packages are excluded.

Production behavior uses focused classes with explicit constructor dependencies,
including stateless policies, codecs, parsers, and presenters. Composition assembles
collaborators; use cases receive narrow capabilities. Inject factories only for
operation-specific inputs or lifetimes. Static service calls, hidden singletons,
and fallback construction conceal dependencies and are prohibited. The narrow
composition and immutable-value exceptions remain defined in the development guide.

Runtime composition owns Inversify and external credentials. Containers and lazy
bindings are isolated per invocation; business packages do not import the DI
framework. Plain constructor injection keeps policies testable without a network.

One class per file, 300 nonblank lines per file, 60 per method, and cognitive
complexity 15 provide guardrails. These checks complement responsibility review;
splitting files or wrapping unrelated behavior in classes does not establish SRP.

### Presentation and private data

The shared localization package owns generic FormatJS formatting, locale policy,
and catalog contracts. Each presenter owns its English/French wording, keys,
arguments, and tests. Domain diagnostics retain stable codes and canonical machine
messages; presentation translates and escapes them. Locale is explicit at public
boundaries, with defensive English fallback for unsupported values.

The separate presentation templating package owns authored expression parsing,
exact occurrence ranges, literal rendering, and localized calendar-date formats.
It has no business field registry. Domains supply allowlisted values through
owned ports; runtime composition injects the locale, and provider adapters retain
their location and mutation rules. The [asset decisions](0007-assets.md) describe
its filename, Slides, and Docs consumers.

Stable participant IDs identify people; names and CSV line links are presentation
data. Private contact records remain in the consumer and authorized delivery
boundary. Prompts, issues, Slack, assets, logs, and outputs receive only the public
projection they need. Versioned codecs preserve supported stored representations.
Provider revisions, workflow locks, and durable reservations protect effects;
they do not make GitHub writes transactional with human edits.

## Alternatives and consequences

Copying workflow scripts unchanged would retain scattered business rules.
A single action would combine unrelated credentials and failures. Generic
technical packages would obscure business ownership. Moving private catalogs
into the automation repository would breach the data boundary.

Explicit ownership adds packages and composition code, but makes dependencies
replaceable and behavior independently testable. One release versions the
automation surface; consumers choose when to adopt it. Current quality commands
and release mechanics belong in the development guide rather than this record.

## Decision history

On 2026-10-29, JavaScript/TypeScript CodeQL gained a configuration excluding
generated bundles. Completed main job
[123422078457](https://github.com/cloud-native-aixmarseille/meetup-event-automation/actions/runs/40865859490/job/123422078457)
took 22m35s and extracted all 21 generated action bundles, duplicating source and
vendored dependencies. The new configuration excludes `actions/**/dist/**` from
analysis, preserving the default queries and source coverage. The initial
validation used a repository-owned CodeQL job because the pinned upstream
interface could not accept a configuration. That approach was superseded by
[upstream PR #557](https://github.com/hoverkraft-tech/ci-github-nodejs/pull/557),
which extends `code-ql` to accept a language string or a JSON object containing
`languages` and `config-file`, so the shared workflow retains CodeQL execution.
This replaces the unconfigured whole-checkout scan; it does not replace
dependency vulnerability checks or establish that excluded dependency code is safe.

On 2026-10-25, weekly and manual GitHub release publication was added alongside
the existing generated-reference workflow. Both triggers require default-branch
CI and use its exact commit. The pinned release actions support Gemini summaries,
so no repository-specific AI client or release script was introduced. The
existing GitHub App publishes tags so they trigger documentation updates.
Summary failures block publication and can leave a draft for a later retry.

On 2026-10-23, authored template processing became a dedicated presentation
capability. This replaces the filename-only parser and duplicated document
expression scanning, while keeping domain packages independent of presentation
imports. ICU catalog wording and provider mutation ownership retain their
separate contracts.

| Original record                                                                 | Retained decision or later refinement                                                                                                                                       |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [0001: Centralization](archive/0001-centralize-meetup-event-automation.md)      | Established repository ownership, domains, stable identities, privacy, and versioned delivery. Its initial action and approval designs evolved in the linked scope records. |
| [0002: Runtime DI](archive/0002-runtime-dependency-injection.md)                | Confined containers and credentials to runtime composition.                                                                                                                 |
| [0003: Production classes](archive/0003-production-code-structure.md)           | Established focused class ownership and size limits. Its allowance for static policies was narrowed by 0022.                                                                |
| [0004: Localization](archive/0004-localize-generated-messages.md)               | Separated generic formatting from presenter-owned catalogs. Optional locale inputs were replaced by the explicit [action contract](0002-action-contracts.md).               |
| [0022: Stateless collaborators](archive/0022-inject-stateless-collaborators.md) | Required instance injection for stateless collaborators and operation-specific factories.                                                                                   |

The archive preserves original contexts, dates, migration plans, alternatives,
and dated evidence. Consolidation changes navigation, not business policy.
