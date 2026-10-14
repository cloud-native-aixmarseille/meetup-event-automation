# ADR 0012: Resolve selected talks and speakers from Conference Hall

Status: Proposed

Date: 2026-10-14

## Context

All meetup talks originate in the recurring
[Cloud Native Aix-Marseille CFP](https://conference-hall.io/team/cloud-native-aix-marseille/meetup-cloud-native-aix-marseille/proposals).
Organizers explicitly select proposals for each meetup. Today they copy talk
text into the issue agenda and maintain speaker identities and contacts in the
[speaker CSV](../reference/referentials.md). Changes in Conference Hall do not
reach event validation, email preparation, or event assets. The CSV also holds
organizer-maintained data such as phone numbers that the proposal export does
not supply. Replacing the entire referential would lose useful local information.

The current agenda contains speaker references and a description, without a
proposal identity. Matching names or titles cannot reliably distinguish renamed
talks, people with the same name, or talks with several speakers.

Conference Hall's [Web API contract][conference-hall-api] exposes event proposals
through `GET /api/v1/event/:event`, authenticated with an event key in the
`X-API-Key` header. Its schedule endpoint is restricted to conference events.
The [proposal serializer][conference-hall-export] includes proposal and speaker
IDs, talk content, public profiles, email addresses, review data, and survey
answers. An authenticated export is therefore not a public publication payload.

## Decision

Use Conference Hall as the source of talk content and speaker profiles for
explicitly selected proposals. Keep a private supplemental speaker referential
for organizer-maintained contact data, including existing phone numbers. Keep
the meetup issue authoritative for proposal selection, agenda order, event date,
host, lifecycle, and participation confirmation for that particular meetup.
This is a proposed integration; the current CSV and agenda contracts remain
supported until migration is delivered.

### Selection and ownership

Configure the CFP slug `meetup-cloud-native-aix-marseille` at the consumer workflow
boundary and provide its API key as an explicit secret. The team dashboard URL
is an organizer link, not an API endpoint. Keep the service origin fixed to the
supported Conference Hall service; issue text cannot choose credential targets.

Add an ordered proposal-reference field to the issue form and versioned codec.
Organizers copy stable proposal IDs from Conference Hall; the implementation must
provide a documented way to obtain these IDs from its Web API settings/export.
Resolve IDs within the configured CFP and render the corresponding agenda.
Do not infer selection from names, titles, acceptance alone, or a published
conference schedule. Reject duplicate, missing, or foreign proposal IDs.

Use namespaced source identities containing the provider, CFP, and proposal or
speaker ID. Preserve these identities across title, name, and affiliation edits.
Resolve every co-speaker, and deduplicate communication recipients across talks
by resolved identity. Never split a display name to invent first/last names.

Conference Hall owns the selected talk's title, abstract, language, format, and
speaker display name, biography, optional affiliation, and delivery email.
The supplemental referential owns phone numbers and other explicitly supported
organizer-maintained contact fields. Missing or empty Conference Hall fields
never clear local supplemental values. Resolve fields by their declared owner,
not a generic last-write-wins merge; missing Conference Hall email blocks the
dependent delivery rather than silently using a legacy address. The issue owns
order and event logistics. Keep host data in the host referential. Render managed
agenda content through the issue codec, preserving unrelated issue sections.
Edits to managed content are corrected at their source or removed from management
through an explicit migration, not treated as competing overrides.

Selection authorizes projecting the selected proposal's allowlisted public
content. A proposal must be accepted before that projection is eligible for
publication; a pending, declined, withdrawn, or unrecognized status produces an
actionable diagnostic. Keep the last valid projection visible and marked stale
when resolution fails. CFP acceptance or speaker confirmation does not imply
availability on this meetup's date: retain the meetup confirmation checks.
Never change proposal status or send Conference Hall result emails.

### Supplemental speaker contacts

Retain `referentials/speakers.csv` in the private consumer repository and evolve
its role toward supplemental contacts and identity mappings. Preserve existing
`speaker-0001` style IDs and explicitly associate them with the provider, CFP,
and speaker identity. An organizer verifies each association; never merge people
by name or automatically reuse a phone number because an email address matches.
Reject conflicting mappings before using the affected contact data.

For migrated speakers, resolve public profile and email fields from Conference
Hall and supplemental fields from their mapped local record. A new Conference
Hall speaker does not require a local row unless supplemental information is
needed. An absent local phone number does not block agenda or email processing.
Organizers can add or update local contact details independently of CFP edits.

Keep unmapped records and all existing supplemental values during migration.
Schema changes must account for existing columns and preserve their data before
retiring any legacy fields. Do not automatically delete records when a proposal
is removed, a speaker disappears from an export, or all issues are migrated.
Retiring duplicated profile lookup does not retire the supplemental referential.
Local contact edits and deletions remain explicit organizer operations.

### Integration boundary and reconciliation

The event domain owns proposal references and the resolved public agenda model.
The referential domain owns a provider-neutral source port for selected talk and
speaker data, with public profiles separated from restricted delivery contacts.
A `conference-hall-proposal-source` adapter implements that port and validates
vendor responses. The referential domain also owns explicit identity mapping and
supplemental-field resolution through a local contact repository port; its CSV
adapter reads the checked-out private records. The journey coordinates
resolution, event rules, publication, and communication; the runtime injects
credentials and adapters. SDK or provider payload types do not enter domains or
application code.

Reconcile on issue changes and scheduled/manual audits under the existing
repository/issue lock. Fetch one complete source snapshot per invocation and
reuse it for participant resolution and planning. Separate action invocations
must resolve their own restricted contacts; never pass the export through action
outputs, artifacts, shared caches, or issue metadata. Check current source inputs
again when preparing a dispatch and apply the existing batch fingerprint and
approval rules. A changed recipient or outgoing content requires a fresh batch
approval; completed delivery records are retained.

Bound requests and response sizes, honor `Retry-After`, and avoid a request per
speaker or proposal. The upstream contract currently limits requests per client
IP; budget the audit fan-out and action invocations together. Rate limiting must
defer affected work with a diagnostic rather than introduce a persisted export
cache. Validate the deployed service's schema and limits before enabling it.

On authentication failures, rate limits, malformed responses, or missing selected
records, preserve issue content and block effects requiring the unresolved data.
Continue independent host validation and organizer diagnostics. Do not silently
fall back to a CSV name match or stale contact information. Recheck the issue
snapshot before writing. A source snapshot is consistent within an invocation;
there is no transaction spanning Conference Hall, GitHub, and delivery providers.

### Privacy and compatibility

Allowlist intended public talk and profile fields. Email addresses stay in
memory and flow only to the approved mail processor. Drop reviews, survey
answers, contact locations, and arbitrary reference fields at the adapter
boundary. Local phone numbers and other supplemental contacts remain private;
do not project them into issues, Slack, Drive assets, action outputs, logs, or
artifacts, and do not upload them to Conference Hall. Only load supplemental
fields needed by an explicitly supported organizer operation. Do not log raw
responses or exceptions. Treat imported text as untrusted and escape it for
Markdown, Slack, and document presentation.

Continue parsing existing issues and stable `speaker-0001` style IDs. Migrate
an issue only after an organizer selects its proposals and verifies its speaker
identity mappings. Store any mapping to legacy recipient identities in the
private consumer repository; never match automatically by name. Preserve ledger
identity and completion so migration cannot resend accepted emails. An unresolved
identity mapping blocks dispatch for the migrated issue.

Conference Hall replaces public profile and email lookup for migrated issues;
the CSV remains the source of their supplemental contact data and legacy identity
mappings. Keep full legacy lookup for unmigrated issues. Update referential
validation and form projection together so migrated speakers do not need duplicate
profile fields or local rows without supplemental data. Retire legacy profile
lookup only after its dependent issues are migrated and historical issues remain
readable. Preserve the supplemental referential and its existing values.
The host CSV remains authoritative. Generate user-facing guidance through the
owning presenter's English/French catalogs and shared action reporting contract.

## Alternatives

- Synchronizing the full CFP into CSV keeps two editable sources and persists
  unnecessary contact data. It does not establish which talks belong to a meetup.
- Deleting the speaker referential after migration discards phone numbers and
  other organizer-maintained information that Conference Hall does not own.
- Matching agenda text by title or speaker name makes updates ambiguous.
- Importing every accepted proposal or using the conference schedule removes the
  organizer's meetup selection and does not fit the recurring CFP.
- Bidirectional synchronization would require conflict policy and write APIs
  beyond the read-only integration needed here.

## Consequences and delivery

Organizers select talks once and correct their content in Conference Hall.
Co-speakers and current email addresses become available to existing journeys,
while local phone numbers and other supplemental contact data remain available
to organizers. Organizers maintain those local fields and identity mappings;
they do not maintain duplicate public profiles for migrated speakers. GitHub
retains event planning and confirmation. API availability becomes a prerequisite
for effects using those records; unrelated work can still proceed.

Deliver the adapter and synthetic contract fixtures first, then versioned agenda
references and public projection, then communication resolution and an explicit
migration path. Update usage, configuration, form, and workflow contracts when
that behavior ships. No new runtime setting is introduced by this ADR alone.

Validate renamed talks and speakers, multiple speakers, duplicate names, missing
contacts, invalid selection/status, source outages, rate limits, concurrent edits,
privacy boundaries, locale changes, and migration without duplicate email.
Also validate preservation of existing phone numbers and unmapped records,
optional supplemental rows, conflicting identity mappings, absent source fields
without local data erasure, and exclusion of local contacts from public outputs.
Run behavior, architecture, public action/workflow, reporting, localization, and
bundle checks for the eventual production changes.

[conference-hall-api]: https://github.com/conference-hall/conference-hall/blob/335d349b51194e3f5abbd809016b779dbdbcc0d5/docs/api.md
[conference-hall-export]: https://github.com/conference-hall/conference-hall/blob/335d349b51194e3f5abbd809016b779dbdbcc0d5/app/features/event-management/proposals-export/services/proposals-export.server.ts
