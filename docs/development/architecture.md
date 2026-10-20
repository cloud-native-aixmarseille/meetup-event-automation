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

## Package ownership

| Package area                         | Responsibility                                                                                                                             |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `packages/domain/event`              | Event model, field rules, readiness, lifecycle, reconciliation, event/document/comment ports, clock                                        |
| `packages/domain/referential`        | Catalog validation, stable participant IDs, reference resolution, issue-form choices, catalog port                                         |
| `packages/domain/communication`      | Due-message planning, attention conditions/episodes/reminders, delivery state and ports                                                    |
| `packages/domain/publication`        | Publication URL rules, manual checklist evaluation, asset reconciliation, text/image contracts and ownership, content/asset/feedback ports |
| `packages/application/journey`       | Cross-domain orchestration, configuration defaults, public diagnostics, issue-form projection port                                         |
| `packages/adapter/*`                 | Concrete implementations of owned ports: GitHub, CSV, YAML, Drive, OpenFeedback, Kutt, Slack, system time                                  |
| `packages/presentation/localization` | Generic locale normalization, ICU formatting, and catalog contracts                                                                        |
| `packages/runtime/github-actions`    | Input parsing, credentials, dependency composition, action execution, output serialization                                                 |

A domain package owns its model, use cases, and ports. Journey code coordinates
those APIs without redefining their rules. Each port has one owner. Adapters
explicitly implement the owned interface and translate vendor payloads into
application/domain values.

Adapter names use `<technology>-<responsibility>`, with matching `technology:`
and `responsibility:` tags in `project.json`. Keep unrelated responsibilities in
separate adapters. Do not introduce generic `utils`, `helpers`, or `shared`
packages; keep behavior in the context that owns it.

## Dependency direction

The workspace dependency rules are enforced by
[`tests/architecture.spec.ts`](../../tests/architecture.spec.ts).

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

Inversify imports, container identifiers, and lookups stay in runtime
composition roots. Use explicit constructor dependencies elsewhere; do not add
decorators or automatic constructor discovery. Static methods are allowed for
stateless operations and composition.

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

Communication planning and participant resolution share the same catalog
snapshot. The runtime converts available credentials into capabilities before
calling the journey. Its delivery factory receives the final dispatch
authorization, and the ledger independently checks that authorization before
writing.

## Production code structure

All behavior in `packages/**/src/**/*.ts` belongs to a focused class. Use
constructor injection for stateful or I/O collaborators. Module-level functions,
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

The journey's `OrganizerApproval` port gates each due email batch. The GitHub
adapter owns trusted request comments, localized approval choices and final
results, GitHub GraphQL editor/history verification, current write-permission
checks, and issue/Slack presentation. It durably records the verified human
identity and final decision in the original bot comment before authorizing mail.
Later human edits recover state from the most recent bot-authored revision;
missing or deleted history fails closed. Both supported catalogs are recognized
when checking pending request integrity, so locale changes preserve approval.
Only the communication domain's batch fingerprint and public facts cross this
boundary. Requests are independent
of delivery records: approval never clears a delivery reservation. Partial
completion does not invalidate the full batch fingerprint. Slack notification
reservations prevent automatic retries after ambiguous acknowledgements. The
journey's `OrganizerApprovalNotification` port returns an opaque message
reference for accepted requests. The Slack adapter uses it for idempotent
introduction decision reactions on the original message. Synchronization finalizes choices
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
The attention adapter still owns validation and presentation; runtime composition
supplies these capabilities without adapter-to-adapter dependencies. A placeholder
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
Text can recover by matching pending fingerprints; uncertain images require
explicit recovery when embedded observations cannot prove success. File URLs and
content readiness remain separate; communication holds pending managed slides.
See [managed asset content](../integrations/assets.md#author-managed-content).

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
