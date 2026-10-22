# Architecture

This guide defines the current package boundaries, implementation rules, and
constraints for contributors. [ADRs](../README.md#architecture-decisions)
preserve the decision history.

`meetup-event-automation` owns meetup rules, orchestration, adapters, actions,
and reusable workflows. The consuming repository owns event issues, private
host/speaker CSV data, the issue form, workflow triggers, variables, secrets,
and permission grants. Consumer workflows delegate behavior to a pinned
automation revision.

Reusable workflows load their owned actions from that same automation revision
so action implementations match the calling workflow's contract. Catalogs and
the issue form come from the consumer checkout.

Defaults are defined by
[`AutomationConfigFactory`](../../packages/application/journey/src/config/automation-config.ts).
The runtime receives integration credentials and fixed-name repository variables
at the GitHub Actions boundary. See the
[configuration reference](../reference/configuration.md) for the supported
consumer settings.

Publication URL prefixes are independent caller inputs. Runtime reads and
validates each setting separately, then binds it to its domain policy. Application
services receive configured policy capabilities, not deployment configuration.
Full event readiness evaluation uses all three policies; next-event selection
uses only Meetup and community policies. Listing and referential operations need
none. Domain policies contain no community-specific URL defaults.

## Package ownership

| Package area                                  | Responsibility                                                                                                                             |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `packages/domain/event`                       | Event model, field rules, readiness, lifecycle, reconciliation, event/document/comment ports, clock                                        |
| `packages/domain/referential`                 | Catalog validation, stable participant IDs, reference resolution, issue-form choices, catalog port                                         |
| `packages/domain/communication`               | Due-message planning, attention conditions/episodes/reminders, delivery state and ports                                                    |
| `packages/domain/publication`                 | Publication URL rules, manual checklist evaluation, asset reconciliation, text/image contracts and ownership, content/asset/feedback ports |
| `packages/application/journey`                | Cross-domain orchestration, configuration defaults, public diagnostics, issue-form projection port                                         |
| `packages/application/browser-authentication` | Provider-neutral CAPTCHA inspection and resolution port                                                                                    |
| `packages/adapter/*/*`                        | Concrete implementations of owned ports: GitHub, CSV, YAML, Drive, OpenFeedback, Kutt, Slack, system time                                  |
| `packages/presentation/localization`          | Generic locale normalization, ICU formatting, and catalog contracts                                                                        |
| `packages/runtime/github-actions`             | Input parsing, credentials, dependency composition, action execution, output serialization                                                 |

A domain package owns its model, use cases, and ports. Journey code coordinates
those APIs without redefining their rules. Each port has one owner. Adapters
explicitly implement the owned interface and translate vendor payloads into
application/domain values.

Adapters live under `packages/adapter/<scope>/<technology>-<responsibility>`.
Group packages by the business or capability scope they serve, independently of
the provider. Package names use `<technology>-<responsibility>`, with matching
`scope:`, `technology:`, and `responsibility:` tags in `project.json`.

| Scope                    | Responsibility                                                         |
| ------------------------ | ---------------------------------------------------------------------- |
| `browser-authentication` | Browser CAPTCHA resolution                                             |
| `communication`          | Delivery records, mail dispatch, organizer attention and notifications |
| `event`                  | Event persistence, issue-document codecs and diagnostic comments       |
| `journey`                | Organizer approvals and issue-form projection                          |
| `publication`            | Event publication, assets, content, feedback and publication state     |
| `referential`            | Speaker and proposal sources, catalog persistence                      |
| `time`                   | System clocks for event and communication ports                        |

The scope folder groups packages; it does not define a new dependency layer or
permit adapter-to-adapter imports. Adapters serving several ports keep their
cohesive responsibility in one package. Keep unrelated responsibilities in
separate adapters. Do not introduce generic `utils`, `helpers`, or `shared`
packages; keep behavior in the context that owns it.

## Repository tooling ownership

Repository tooling belongs to the concern it supports:

| Location                                     | Responsibility                                                         |
| -------------------------------------------- | ---------------------------------------------------------------------- |
| `packages/runtime/github-actions/packaging/` | Action bundle entrypoints, build settings, and bundle freshness checks |
| `tests/architecture/`                        | Repository structure, dependency boundaries, and workspace discovery   |
| `tests/architecture/rules/`                  | Syntax and placement rules used by architecture assertions             |
| `tests/contracts/`                           | Public interface assertions and their analysis helpers                 |
| `tests/integration/github-actions/`          | Synthetic GitHub Actions integration fixtures and polling              |

Place new tools with their owner; do not introduce a root `scripts/`, `tools/`,
or `helpers/` catchall. Keep business policies and runtime effects in production
packages. Production modules must not import test or packaging implementations;
the architecture checks enforce that direction.

Test-owned analysis helpers use TypeScript and adjacent `.test.ts` files. Node
entrypoints used without compilation use `.mjs`. The integration issue poller
is dependency-free because CI loads it before installing workspace dependencies.
Packaging commands run from the repository root and own only the action build.

Root package commands delegate to these owners. `pnpm check:structure` runs
the repository assertions in `tests/architecture/structure.spec.ts`; do not
duplicate their discovery or orchestration in another CLI.
`pnpm check:architecture` also runs boundary assertions and the rule helpers' tests.
See [testing](testing.md) for test placement and [commands](README.md#commands)
for the supported entrypoints.

## Dependency direction

The workspace dependency rules are enforced by
[`tests/architecture/boundaries.spec.ts`](../../tests/architecture/boundaries.spec.ts).

| Layer        | Allowed workspace dependencies             |
| ------------ | ------------------------------------------ |
| Domain       | None                                       |
| Application  | Domain                                     |
| Presentation | None                                       |
| Adapter      | Domain, application, presentation          |
| Runtime      | Domain, application, adapter, presentation |

Import other packages through their entrypoints. Deep imports and source or
package dependency cycles are prohibited. Keep internal collaborators out of
package entrypoints unless another package needs them.

Domain code must remain independent of SDKs, filesystems, GitHub Actions,
serialization libraries, DI containers, and the system clock. Application code
receives capabilities through ports, not SDK clients or credentials. Neither
layer depends on presentation infrastructure. Presenters own their catalogs and
use [the localization package](localization.md) for formatting. Reusable
workflows coordinate actions, permissions, and concurrency; business rules
belong in TypeScript.

## Runtime composition

The runtime composition roots create a fresh Inversify container per invocation.
Bindings resolve lazily as singletons within that invocation; credentials and
cached catalogs do not carry into another invocation. Bind replacements before
resolving dependent use cases.

`GithubActionsComposition` owns an Inversify container for shared runtime input,
configuration, and reporting services. Each action composition reuses one
instance. Explicit `toResolvedValue` bindings declare their dependencies without
reflection metadata. Locale-specific messages, date formatters, presenters, and
repository-bound organizer feedback use typed factory bindings: each factory
call receives its operation inputs and creates a separate instance. Tests can
use `GithubActionsComposition.createContainer()` to replace services before
resolving their consumers.

Inversify imports, container identifiers, and lookups stay in runtime
composition roots. Use explicit constructor dependencies elsewhere; do not add
decorators or automatic constructor discovery. Package-local composition classes
assemble internal collaborators without a container; runtime roots assemble
packages and own all container lookups. Action handlers receive the operations
they need through typed constructor contracts.

The common composition root supplies event and referential dependencies.
Communication, publication, and feedback roots add their required capabilities.
Event reconciliation requires the Conference Hall CFP slug and API key.
Document-only listing and attention composition do not bind the reconciliation
journey or consume source credentials. Conference Hall resolution uses a
provider-neutral referential port and
a bounded, allowlisting adapter. Each invocation holds one source snapshot;
linked speaker profiles and delivery addresses come from Conference Hall. A
provider-neutral repository composes those profiles with checked-out local IDs,
identity mappings and organizer-maintained fields. The same source instance
supplies selected talks and speaker profiles. Source failures invalidate catalog
use instead of falling back to cached contacts. Reviewed snapshot synchronization
registers identities and preserves local fields and allocation history. The event codec
owns proposal selection and managed agenda projection. Stale proposals block
talk-dependent mail and feedback effects. See [Conference Hall](../integrations/conference-hall.md).

Speaker synchronization uses provider-neutral catalog entries and reserved IDs.
The CSV adapter owns column names, unknown local-column preservation and the
allocation file schema. It reloads the source revision before saving; callers
do not carry CSV rows or storage schema versions through domain ports.

Communication planning and participant resolution share the same catalog
snapshot. The runtime converts available credentials into capabilities before
calling the journey. Its delivery factory receives the final dispatch
authorization, and the ledger independently checks that authorization before
writing.

## Constructor injection

Dependencies are required constructor inputs. Stateless behavior still has an
owner and a contract: inject it as an instance, using a port or a narrow `Pick`
of the methods the consumer needs. Private implementation details stay instance
methods of their owner. Do not replace static calls with inline `new`, hidden
module instances, service locators, or defaults that construct missing collaborators.

Parameter defaults must not construct services or define factory callbacks. Bind
provider functions, clocks and transport clients in composition and pass them
explicitly. Pass stateless policies as narrow instances; a factory must have an
identified lifetime or input that is specific to the operation. The structure
check rejects calls, construction and callbacks in parameter defaults outside
composition. Data defaults remain subject to the action interface rules.

Construction belongs in named `*-composition.ts` modules. These modules only
assemble dependencies; they do not own business decisions or execute effects.
They respect the same package dependency directions as other production code.
Runtime bootstrap entrypoints may construct composition classes and obtain the
shared runner and action handler. They await the runner with the handler's bound
operation. Bind container replacements before resolving a use case.

`CaptchaResolver` is an application-owned, session-bound capability with
`inspect()` and `resolve()` operations. Its contract contains no Playwright
types, provider names, or credentials. The Meetup adapter receives an injected
factory that binds a resolver to each browser page; login owns account and
one-time-code checks. `hcaptcha-captcha-resolver` implements CAPTCHA detection,
response verification, and the bounded Python solver. Runtime composition alone
selects that adapter and supplies AI configuration. Resolver inspection never
starts a solver attempt; unresolved verification remains `required`, and
technical failures reject. A cleared CAPTCHA does not establish authentication.

Inject an instance for a reusable collaborator. Inject a typed factory when an
object needs operation-specific data or lifetime, such as a browser page or an
authorized delivery. The factory is provided by composition; consumers never
supply missing dependencies themselves. Configuration and external records remain
ordinary method or constructor inputs.

Keep independent settings independent. A consumer receives only the values or
configured capabilities it uses; do not pass a broad configuration object through
unrelated services. Combine policies at the composition root for an operation
that actually uses them together. Do not construct unused policies and filter
them by identifiers later.

Static service methods, static getters, function-valued static fields, and static
initialization blocks are prohibited. Exceptions are limited to composition entry
methods and immutable value factories: a value has a private constructor with
readonly data parameters, exposes only getters, and its factory returns that value
or `undefined`. Readonly static data constants are allowed. These exceptions do
not permit service access through a value object or composition calls inside
business policies.

`pnpm check:structure` rejects static service behavior and direct construction of
imported workspace collaborators outside composition. Error values may be created
where a failure occurs. Unit tests must demonstrate replacement through injected
contracts; avoid mocking static methods or module constructors to replace a policy.
Architecture review still checks contract size, ownership, and meaningful factory
lifetimes; a syntactic check cannot prove those properties.

## Production code structure

All behavior in `packages/**/src/**/*.ts` belongs to a focused class. Use
required constructor injection for every collaborator, including stateless
policies, parsers, codecs, and presenters. Module-level functions,
function-valued variables, callbacks, and object method implementations are
prohibited. Callbacks and helpers inside classes are allowed. Data, constants,
interfaces, type aliases, and port function types may remain at module scope.
Tests and repository tooling are outside this class-only convention.

Package `src/index.ts` files contain imports and reexports only. Put
implementation and side-effect imports in named modules. Action entrypoints
invoke the runtime runner class.

Biome and the structure checks enforce:

| Limit                                       | Maximum |
| ------------------------------------------- | ------- |
| Classes per production file                 | 1       |
| Nonblank lines per production file          | 300     |
| Nonblank lines per method or function       | 60      |
| Cognitive complexity per method or function | 15      |

Do not suppress these rules, compress statements, or gather unrelated behavior
in a class to bypass them. Review responsibility and dependency direction even
when numeric checks pass. Split parsing, validation, presentation, persistence,
and orchestration when they have different reasons to change.

## Clean Architecture, Clean Code, and SOLID

These are required design criteria for implementation, refactoring, and review.
Passing lint, complexity limits, type checks, or tests does not establish that
responsibilities are correctly separated. Apply the criteria to the affected
behavior and its callers; avoid unrelated repository-wide rewrites.

### Responsibility boundaries

Give each component one cohesive responsibility and one reason to change.
Explain that responsibility in terms of behavior, not a vague name such as
`Record`, `Manager`, or `Helper`. Moving methods into extra files or putting
functions behind a static class does not by itself create a useful boundary.

Assign behavior to its owner:

- Domain models and policies own business invariants, semantic equality, and
  valid state transitions.
- Application use cases coordinate those policies and effects through ports.
  They do not interpret vendor payloads or format channel-specific messages.
- Adapter codecs own external representations, schema versions, and structural
  validation. Parsing and encoding the same representation can belong together.
  Business eligibility and approval decisions belong outside the codec.
- Presenters own output formatting and their catalogs. Reading an organizer's
  choice, verifying their permission, and deciding whether an effect is allowed
  are separate responsibilities.
- Effectful adapters own provider access. Runtime composition wires dependencies;
  it does not become a second implementation of business rules.

For example, an approval comment codec can decode JSON metadata and encode its
escaped marker. Request matching, business validation, identity generation,
permission verification, and notification delivery have separate reasons to
change and must not accumulate in that codec.

Distinguish structural validation at an external boundary from business
invariants enforced by the owning model or policy. Do not make inner-layer
contracts change merely to fit a storage format. Keep persistence fields in
adapter-owned records and explicitly map them to application data.

### Apply SOLID to concrete behavior

- **Single responsibility:** split behavior when it has different owners or
  reasons to change. Keep cohesive operations together; do not create a class
  for every condition or field.
- **Open/closed:** isolate varying policies and provider implementations behind
  the existing contracts that own them. Repeated kind/provider switches across
  validation, persistence, and orchestration indicate missing boundaries.
  One exhaustive dispatch over a closed discriminated union can be appropriate
  at a boundary. Introduce a strategy or registry only for an actual variation.
- **Liskov substitution:** each implementation must honor its port's accepted
  inputs, results, failures, and retry/idempotency guarantees. Do not silently
  ignore unsupported operations or add hidden preconditions. Test substitutable
  implementations against the behavior callers rely on.
- **Interface segregation:** ports expose the capabilities their callers need.
  Split unrelated capabilities rather than forcing callers or test doubles to
  implement irrelevant methods. An adapter may implement several focused ports.
- **Dependency inversion:** inner layers depend on their owned abstractions;
  outer adapters implement them. Inject stateful and effectful collaborators,
  including clocks and identity sources when behavior depends on them.
  Deterministic local transformations do not need an interface solely to satisfy
  a pattern.

### Clean Code at data and effect boundaries

- Parse external input as `unknown` and narrow its shape before reading fields.
  A type assertion such as `JSON.parse(text) as StoredRecord` is not validation.
  Validate required fields, variants, and contradictory states before exposing
  typed data or performing effects.
- Use explicit state variants and named predicates for business concepts.
  Prefer small guard clauses and focused validation steps to mixed boolean
  expressions that combine shape checks, permissions, and business rules.
- Define equality in terms of the fields and normalization rules that matter.
  Do not use `JSON.stringify` as a shortcut for domain equality. If serialized
  bytes are intentionally the contract, document canonicalization and test
  ordering, omitted fields, and relevant variants.
- Keep queries, validation, and encoding free of hidden writes or identity/time
  generation. Make effects explicit at their owning boundary; a static method
  is not pure merely because its class has no instance state.
- Use descriptive names and narrow inputs. Introduce named failure categories
  when callers must distinguish invalid data, denied authorization, and uncertain
  external outcomes. Preserve those distinctions through orchestration.
- Tests verify observable contracts, including invalid input, state transitions,
  retries, and data preservation where applicable. Tests that reproduce private
  branching or only prove a method delegates do not establish sound design.

### Required design review

Before implementing a behavior change, identify its owning layer, the
responsibilities that change, and the contracts crossing those boundaries. Before
marking it ready for review:

1. Review each affected component and relevant caller for one cohesive
   responsibility. Check that policies are not hidden in codecs, presenters,
   persistence helpers, or runtime wiring.
2. Trace dependencies and data across ports. Verify input validation, state
   invariants, semantic equality, and explicit effects independently of file
   placement and class size.
3. Check relevant SOLID contracts and failure behavior. Preserve approval
   integrity, permission checks, concurrency guards, idempotency, and recovery
   when moving code.
4. Fix violations introduced or expanded by the change. If an existing concern
   remains outside its scope, identify it explicitly; do not imply that the
   component is fully compliant.
5. Include concise evidence in the PR description or handoff: the affected
   owners and boundaries, any material trade-off, and the checks actually run.
   Reference the implementation and behavior tests where useful.

CI enforces dependency layers, cycles, public contracts, and structural limits.
The structure check also rejects JSON parsing asserted directly into model types
and equality comparisons through `JSON.stringify`. It cannot establish that a
custom decoder validates every invariant or that a fingerprint includes every
material field; those contracts need behavior tests and review.
Responsibility cohesion, meaningful abstractions, and correct policy placement
also require code review. Do not claim that a passing architecture suite proves
Clean Architecture or SOLID compliance.

## Action reports and generated messages

All actions use the shared runner to produce technical logs, failure annotations,
consumed diagnostic outputs, and escaped job summaries. Actions return concise
technical facts; the shared `DiagnosticPolicy` owns failure classification.
They do not implement their own logging or summaries. Follow
[the reporting contract](reporting.md).

Each presenter owns its English/French ICU catalogs, argument types, and tests.
The runtime resolves locale once and passes it through composition. Domain
diagnostics and protocol identifiers remain stable. See
[localization](localization.md).

## State, retries, and concurrent writes

GitHub issue text is a projection of the event model. The codec owns Markdown
parsing, versioned metadata, compatible representations, and minimal patches.
Stable catalog IDs identify participants; display names and CSV line links are
presentation data. Preserve codec round trips and supported schema parsing when
changing representations. Check callers and fixtures before removing
compatibility code.

Time-dependent rules receive an explicit clock and time zone. A past date does
not prove an event happened. Occurrence comes from issue state and explicit
status labels; lifecycle is derived from those facts. `PostEventPolicy` separately
enables follow-up after the event date without projecting a held label. Planning,
recipient selection, feedback preparation, approval and attention use that phase.

Official side-effecting event jobs share a repository/issue concurrency group
and use `cancel-in-progress: false`. Reconciliation reloads and compares issue
snapshots before writing or dispatching. GitHub issue writes have no
transactional compare-and-set guarantee, so a final race with a human edit
remains possible.

Communication delivery uses the current event and unfinished email tasks.
Use `organizer` for the meetup management role in domain models, ports, and
presentation. GitHub's `admin` value remains a repository permission returned by
the API; it is not a second meetup role. Organizer notifications receive their
explicit destination through `slack-organizer-channel-id`. Public Slack
announcement tasks are manual and do not share this routing.

The journey's `OrganizerApproval` port gates email batches and Meetup publication.
Journey policies own request eligibility, matching and revision fingerprints.
They also own whether a request can be reviewed, the non-authorizing follow-up
placeholder and post-event progress. Rendering and checkbox parsing consult the
same review policy; neither independently interprets recipient counts or stopped
follow-up state as authorization.
The GitHub comment codec owns the versioned representation; a separate factory
receives its identity source explicitly. Persistence, decision finalization and
notification delivery are separate collaborators. Follow-up persistence and
attention synchronization expose their own capabilities.
The GitHub adapter owns trusted request comments, GitHub GraphQL editor/history
verification, and current write-permission checks. Its comment presenter delegates
to explicitly injected email and Meetup renderers through a complete kind map.
The outer presenter encodes metadata once; the kind-specific renderers format
their content. Slack uses its own injected renderer map and catalogs.
A decision parser compares checkbox edits
against exact localized requests rendered from trusted metadata; decision resolution
verifies the editor's identity and permission separately. It durably records the
verified human identity and final decision in the original bot comment before
authorizing the action.
Later human edits recover state from the most recent bot-authored revision;
missing or deleted history fails closed. Both supported catalogs are recognized
when checking pending request integrity, so locale changes preserve approval.
Only a content fingerprint and public facts cross this boundary. Requests are independent
of delivery records: approval never clears a delivery reservation. Partial
completion does not invalidate the full batch fingerprint. Slack notification
reservations prevent automatic retries after ambiguous acknowledgements. The
journey's `ApprovalNotificationPolicy` selects standalone approval notifications
and projects their public facts. Thank-you approvals use follow-up attention, so
the policy excludes their separate posts and decision reactions. The GitHub
notification coordinator consumes this injected policy and owns durable
reservations, acknowledgements, and retries without branching on approval kinds.
The journey's `OrganizerApprovalNotification` port accepts public approval facts and
the approval comment URL, and returns an opaque message reference for accepted
requests. The Slack adapter owns notification formatting and its English/French
catalogs. It uses the message reference for idempotent decision reactions on the
original message. Synchronization finalizes choices
and retries reactions even when no email task remains. Slack failures do not
undo durable decisions. See the
[communication integration guide](../integrations/communications.md#confirm-an-email-batch).
The journey maps task names to recipient groups, and records completion through the
event codec only after all recipients in a group have durable accepted records.
It rechecks the source before dispatch and before updating completion. Delivery
reserves an intent as `pending` before calling a gateway and marks it `accepted` after acknowledgement. Pending
and uncertain intents are not automatically resent. A definitively deferred
attempt releases its reservation for a safe retry. The GitHub ledger depends on
the shared workflow lock; do not dispatch outside the official workflows or
claim exactly-once delivery.

Meetup publication approval binds the complete projected event and draft URL to
a SHA-256 revision. The browser publishes only an existing matching draft after
rechecking the issue snapshot and trusted approval. Publication is verified before
the issue checkbox is checked. Draft creation and publication are separate gateway
operations; a saved URL and approval are independently durable for retries.

The caller's `meetup-event-url-prefix` supplies the HTTPS origin and group.
The publication domain validates canonical group and event URL identities and
enforces membership in that configured group. The journey, URL policy, and
approval adapter use these types instead of maintaining provider URL patterns.
The browser adapter owns login, account, scheduling, and editor routes; it removes
query and fragment data only from browser redirects before resolving an event
identity. Stored and organizer-supplied identities reject that data. The isolated
Python solver verifies the caller-selected HTTPS page and empty credential fields
at its process boundary.

Organizer attention has separate domain-owned conditions, episodes, reminder windows,
and notification reservations. The journey gathers typed stage outcomes and
reloads the event; failed evidence stays unknown. The GitHub attention adapter
verifies bot authorship and revision history, validates and persists state, and
projects localized tasks alongside the event diagnostic checklist before the Slack
adapter posts or updates a message. Diagnostic writes retain only verified
bot-authored attention metadata and task content through an injected retention
collaborator. Consolidation persists reservations before removing a separate
attention comment; equal copied states allow recovery after an interrupted removal.
Runtime composition injects the clock and ports. A pending post blocks further
posts across days and requires operator investigation. Existing mail records and
approval decisions remain independent. Once follow-up begins, the approval adapter
stores the attention record inside the single thank-you approval and task comment.
The communication domain owns attention invariants, equality, task selection and
the action represented by an approval resource. Presenters consume those decisions.
GitHub decodes the verified diagnostic checklist into typed tasks. GitHub and
Slack presenters render that shared selection with their own catalogs. Runtime
composition supplies these capabilities without adapter-to-adapter dependencies. A placeholder
with zero recipients shows task progress while a safe email batch is unavailable;
it cannot authorize mail. Progress writes first verify and finalize any human
choice. Migration persists notification reservations before retiring the earlier
attention view. Thank-you requests use grouped attention notifications, without
separate Slack approval posts or reactions. See
[organizer attention](../integrations/communications.md#organizer-attention).

OpenFeedback creation uses a stable source key to recover events on retries.
Agenda synchronization reuses matching talk and speaker IDs, preserves votes and
manual metadata, and checks the last-read revision of each record before updating.
The adapter maps the issue's agenda to OpenFeedback's talk and speaker resources.
It resolves all identities before writing speakers, then talks. Each write is
atomic for one record; conflicts stop the run and retries read current state to
resume after partial completion. Unchanged records are skipped, and records are
never deleted automatically. See the
[feedback integration guide](../integrations/feedback.md) for required API
capabilities, identity matching, and recovery.
Preserve idempotency and failure behavior for all external effects. Operational
recovery is documented under [integrations](../README.md#integrations).

Publication owns versioned content contracts, render plans and ownership rules.
The journey projects public event fields and explicit stable speaker assignments;
the runtime asset presenter owns localized dates and agenda text. Drive stores
copies and binding sidecars; separate Docs and Slides adapters implement the
content port. The HTTPS image adapter bounds retrieval and validates media.
Content batches use provider revision controls and a persisted pending intent.
Recovery transitions and anchor equality belong to publication policies.
Recovery fingerprints use explicit ordered fields and recognize the persisted
identities of completed operations, so JSON property order cannot repeat a recovery.
The asset journey determines whether slides are ready for communication from
their URL and reconciled content status. The action emits that decision without
reinterpreting content states. Text can recover by matching pending fingerprints; uncertain images require
explicit recovery when embedded observations cannot prove success. File URLs and
content readiness remain separate; communication holds pending managed slides.
See [managed asset content](../integrations/assets.md#author-managed-content).

Presentation PDF exports have separate publication policies and ports for source
observation, binary persistence and export state. Journey evaluates follow-up
eligibility with `PostEventPolicy` and the injected clock before requesting an
export. The Drive adapter owns bounded byte validation, derived-file metadata and
the export-state codec. Pending state reserves a stable PDF ID before upload;
recovery requires observed content fingerprints. Publication requests placement
of verified PDFs through its binary repository port. The Drive adapter moves
only the PDF into the configured shared `public` folder and verifies the move;
editable sources and export state remain in the event folder. Runtime injects
the required destination ID. PDF readiness never changes
the editable slides readiness or the communication link contract. See
[PDF export and recovery](../integrations/assets.md#export-the-presentation-pdf).

## Privacy and trust boundaries

- Store real catalogs and contact records only in the consuming repository. Use
  synthetic fixtures in this repository.
- Public event data may include intended display names and published event
  details. Keep email addresses, phone numbers, private addresses, contact-only
  names, raw CSV rows, credentials, and provider payloads out of public issues,
  logs, summaries, outputs, caches, and artifacts.
- Restricted contact data may pass through the ephemeral runner and approved
  delivery processors only. Downstream mail processors must deduplicate the
  idempotency key, suppress payload logging, and document retention before
  dispatch is enabled.
- Use safe diagnostic templates and codes at output boundaries. Do not publish
  raw exception messages or arbitrary diagnostic field paths. Public
  communication identifiers and ledger keys use SHA-256 digests.
- Trust managed diagnostic and ledger comments only when authored by
  the configured GitHub App bot. A marker alone does not establish trust.
- Read local catalog supplements from the checked-out revision; resolve linked
  profiles through the configured source. Parse action inputs at the
  boundary and pass issue text through typed APIs or data files/environment
  values, never executable shell interpolation.
- Pin external actions and consumer workflow references to full commit SHAs. Use
  `persist-credentials: false`. Grant minimum workflow permissions and
  independently restrict each job's GitHub App token to its repositories and
  required scopes; workflow permissions do not restrict an App token.
- Pass delivery secrets explicitly. Use the GitHub App to create separate
  consumer and mailings repository tokens with the permissions each needs.
  Event workflows require the OpenFeedback organization key as well as Kutt,
  Drive, and Slack credentials.

The [test guide](testing.md) identifies the executable checks for these rules.
