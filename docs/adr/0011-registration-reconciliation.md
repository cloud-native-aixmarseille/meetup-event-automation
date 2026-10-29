# Event-day registration reconciliation

Status: Accepted. Source validation is implemented; remote reconciliation is
blocked on supported OCGroups provider operations.

Scope: reconciling event-day participants into OCGroups chapter membership and
registration for the corresponding event. Creating and publishing the event
itself follows [event publication destinations](0009-community-event-publication.md).

## Context

Participants may register through Meetup and fill in a Google Form during the
event. Its responses populate an attendance Sheet. Reporting these participants
to OCGroups is a mandatory organizer process, including both chapter membership
and event registration. A form submission, Meetup RSVP, or self-reported
OCGroups registration answer does not prove either remote outcome.

## Decision

After each event, reconcile the reviewed Google Sheet records with OCGroups.
For every selected participant, ensure membership of the configured chapter and
registration for the corresponding OCGroups event. Source validation is an
internal step of reconciliation, not its completion criterion.

OCGroups is the only destination. This process does not update Meetup
registrations, send invitations, or perform OCGroups check-in. Invitations
requiring participant acceptance cannot substitute for verified registration.

Resolve participant, chapter, and event identities explicitly. Names and
response timestamps must not determine the destination. Read existing remote
state, preserve existing memberships and registrations, and create only missing
records. A returning participant reuses membership and needs registration for
each event. Retain restricted progress for partial failures and reconcile
uncertain outcomes before retrying so reruns cannot create duplicates.

Reporting is complete only when both OCGroups outcomes are verified for every
selected participant. Invalid records, unresolved mappings, failed operations,
and unavailable provider capabilities keep the task unresolved. Keep
**Sync attendees from tally sheet to CNCF** unchecked and the meetup issue open
until reporting is complete.

## Source selection and configuration

Use the consumer variable `GOOGLE_SHEETS_REGISTRATIONS_URL` for the response
Sheet URL, including its spreadsheet ID and exact tab `gid`. Bind it to the
workflow's `registrations-sheet-url` input and keep Google credentials in a
separate secret. Do not hardcode the source or select a tab implicitly.

The attendance form has no event identifier. Organizers explicitly associate a
reviewed row range with the meetup issue and verify its OCGroups destination.
The configured email header must match the source. Preserve original responses;
use a restricted reviewed tab when responses for different events are interleaved.
The [registration guide](../integrations/registrations.md) owns source headers,
bounds, setup, and organizer instructions.

## Ownership and consequences

Consumer repositories own configuration and workflow bindings. This automation
repository owns the decision, organizer guidance, response decoding,
reconciliation policy, provider operations, and retry behavior.

The publication domain validates source identities; the Google Sheets adapter
owns authentication, bounded reads, and response decoding. The journey checks
event eligibility and source freshness. Runtime composition binds the workflow
and localized reports. Future OCGroups transport belongs in a provider adapter;
reconciliation and completion policy remain outside provider transport.

Keep participant records and reconciliation progress in restricted storage and
approved processors. Never expose private contact data in GitHub issues, logs,
outputs, or artifacts. Aggregate source counts cannot establish remote success.

## Implementation status

[`event-reconcile-registrations.yml`](../../.github/workflows/event-reconcile-registrations.yml)
and [`publication/reconcile-registrations`](../../actions/publication/reconcile-registrations/action.yml)
call `ReconcileMeetupRegistrations`. Source validation reads the exact tab and
bounded rows, validates and deduplicates emails, checks issue freshness, and
reports aggregate counts. The issue must be an open meetup with occurrence
status `held` and a stored CNCF Link.

Valid source records produce `blocked` because supported OCGroups membership
and event-registration operations are unavailable. The implementation does not
read, compare, write, or verify remote membership or registration state. It never
completes the CNCF checklist task. Source validation does not replace mandatory
reporting.

Activation requires a published automation release, a consumer workflow
binding, and Google read credentials. Live Sheet access remains unverified.
Completing reconciliation requires supported provider operations, verified
identities, safe recovery and retries, and verification of both remote outcomes.
