# Reconcile event-day registrations

Reporting participants to OCGroups is mandatory after each event. Both membership
of the intended group and registration for the corresponding event must be
verified for every recorded participant.

Use [event-reconcile-registrations.yml](../../.github/workflows/event-reconcile-registrations.yml)
to reconcile event-day participants with OCGroups group membership and
registration for the corresponding event. Source validation is the first step:
the workflow reads the selected Google Sheet tab and reviewed row range,
validates email identities, and reports counts.

Reconciliation is currently **blocked** because supported OCGroups operations
for this process are unavailable. The current implementation does not read,
compare, or write remote membership or registration state. Both outcomes remain
unverified. It does not update Meetup registrations, send invitations, or perform
OCGroups check-in.

## Collect responses during the event

Ask participants to fill in the attendance Google Form during the meetup,
including those who registered through Meetup.com. Its responses populate the
attendance Sheet. Preserve the existing questions, response headers, and data.

The attendance form contains `Horodateur`, `Adresse e-mail`, the question about
already being registered on the current OCGroups event, the first-participation
question, `Prénom`, and `Nom`. The registration answer is self-reported; it does
not verify either OCGroups group membership or event registration. Names and
timestamps do not establish the destination event.

## Configure the source

Enable the Google Sheets API for the service-account project and share the
restricted response spreadsheet with its service-account email as a viewer.
Store the service-account JSON in a GitHub secret and pass it as
`google-credentials`. Authentication requests only the `spreadsheets.readonly`
scope. Keep participant records and progress restricted to organizers, outside
GitHub issues, repository files, logs, and artifacts.

Set the consumer variable `GOOGLE_SHEETS_REGISTRATIONS_URL` to the response
spreadsheet URL including its tab's `gid`, and bind it to
`registrations-sheet-url`. The reader resolves that exact tab; it never chooses
the first tab. Conflicting query and fragment tab IDs are rejected.

Pass `email-column` as the exact header in row 1: `Adresse e-mail` for the
attendance form described above. No additional form fields are required by the
reader.

## Select the event and responses

The consumer owns the manual trigger and calls the reusable workflow with every
declared input and secret, pinned to its published automation revision. Bind
`locale`, `issue-number`, `registrations-sheet-url`, `email-column`,
`first-data-row`, and `last-data-row`; grant `contents: read` and `issues: read`.
The workflow shares the event's reconciliation lock and uses no write token.

1. Review the responses privately and identify those belonging to this event.
   The form has no event identifier. The submission timestamp alone must not
   select a destination. Do not include responses for another meetup.
2. Select an open meetup issue with occurrence status `held` and its
   **CNCF Link** set.
   Verify the OCGroups group and event separately; the current implementation
   only requires the stored link and does not verify the remote destination.
   Keep the reviewed row-to-event association in the restricted Sheet.
3. Supply the first and last reviewed data row, inclusive. Row numbering starts
   at 1; row 1 contains headers, so the first data row must be at least 2.
   Select at most 1000 rows. The reader supports the first 64 columns and refuses
   a range outside the selected tab's grid.
4. Keep the tab ordering stable until the run finishes. If responses are
   interleaved across events, use a restricted reviewed tab with row 1 headers
   and only this event's responses, and configure its `gid` explicitly.
   Preserve the original response tab and its data.

## Interpret the result

The result describes reconciliation status:

- `blocked`: source records passed validation, but OCGroups operations are
  unavailable. Neither membership nor event registration has been verified.
- `invalid`: the event or selected responses need correction before retrying.
- `skipped`: the issue is not an eligible open meetup confirmed as held; no
  responses were read.

Duplicate emails are counted once after trimming and case normalization; dots
and plus suffixes remain part of the address. Invalid emails, missing or
duplicate email headers, and empty selections require review. Any invalid
selected record invalidates the whole selection. Blank rows are ignored.

The summary contains counts and fixed diagnostic codes, without participant
names, emails, or raw provider errors. Source access failures fail the job;
expected organizer corrections remain visible without a technical failure.
The issue is reread after source validation; concurrent changes invalidate the run.
Reruns are read-only and cannot create duplicate memberships or registrations.

Source validation does not complete reconciliation. The workflow never checks
**Sync attendees from tally sheet to CNCF** or closes the issue. Keep that task
unchecked and the issue open until both OCGroups outcomes are verified for every
participant. Invalid records, unresolved mappings, unavailable provider
operations, partial failures, and uncertain outcomes keep reporting pending.

Record group membership and event registration progress separately in the
restricted Sheet. Preserve existing members and registrations; a participant
attending another event retains group membership and needs registration for that
event. A form submission, Meetup RSVP, or invitation does not verify either
OCGroups outcome. If records are missing, retain the private source and progress
and request a supported import route from the platform maintainers.

See the [registration reconciliation decision](../adr/0011-registration-reconciliation.md)
for the required provider capabilities and reconciliation guarantees.
