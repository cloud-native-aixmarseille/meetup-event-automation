# ADR 0015: Render explicit participant, venue, and next-meetup fields

Status: Accepted. Next-meetup lookup failure handling is superseded by
[ADR 0021](0021-separate-technical-and-organizer-feedback.md).

Date: 2026-10-17

## Context

The existing presentation and announcement templates contain individual talk
titles, summaries, speaker names, public venue details, several date formats,
and next-meetup information. ADR 0014's initial text allowlist cannot populate
those locations. Replacing them with an aggregate agenda would lose their
authored layout. Agenda positions are unstable identities, and host contact
addresses are private contact data rather than a public venue source.

## Decision

Extend the renderer's closed token set as documented in the
[asset guide](../integrations/assets.md#author-managed-content). Keep contract
version 1 and the existing binding, revision, recovery, and readiness semantics.
This extends ADR 0014's text allowlist and aggregate-only agenda choice; its
other decisions remain in force.

Talk text fields use explicit slots assigned to the complete selected proposal
identity (`provider`, `event`, `id`). Titles and abstracts come from the current
Conference Hall snapshot, and names come from the validated current agenda.
Speaker-name slots reuse the same stable speaker assignment as portraits.
Reordering leaves assignments intact; removals, ambiguous identities, invalid
references, and stale source data follow required/fallback policies. Insert
values literally, never evaluate them as template expressions.

Public venue address, postal code, and city come from an explicit host-ID map
in the committed asset configuration. Never fall back to host contact addresses.
Dates have named, fixed formats with localized month/weekday names and a
`DD/MM/YYYY` numeric form, preserving the event's calendar day.

The journey selects the next meetup only when a contract uses its fields. It
reads open meetup issues in the same repository, validates dates and hosts,
requires scheduled status, host confirmation, and a supported publication URL,
then orders strictly later dates by date and issue number. It resolves the host
through the validated catalog and the city through the public venue map.
Incomplete listings, failed reads, or limits leave the result missing. Rendering
adapters receive only the public projection and never fetch unrelated issues.

## Alternatives

- Positional talk and speaker indices would silently switch identities after
  agenda reordering or removal.
- Copying contact addresses would expose data with no public-venue designation.
- Generic expressions or arbitrary date patterns would expand the contract
  beyond a reviewable set of supported values.
- Selecting the first returned future issue would depend on API pagination and
  ordering and could announce an unpublished or cancelled meetup.

## Consequences

Consumers must author whole-shape Slides tokens, explicit participant mappings,
public venues, and non-empty optional fallbacks. More talks or co-speakers need
additional authored slots; no shapes are generated automatically. Abstracts can
require layout changes to fit. Existing enrolled copies keep their bound
contract; template edits do not migrate them automatically.

The lookup adds bounded repository reads when next-meetup fields are declared.
Failures preserve the renderer's missing-field behavior rather than selecting
from partial results. Live template conversion still requires the Google Slides
API and file access; local tests do not establish provider enablement or layout
quality in the real templates.
