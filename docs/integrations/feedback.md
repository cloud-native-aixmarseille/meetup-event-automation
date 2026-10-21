# OpenFeedback and the shared feedback link

The issue-update and daily-audit workflows create missing OpenFeedback events,
synchronize their titles, talks and speakers, save their public URLs in the issue, and point the
shared Kutt link to the event from the day before its date through the event day.

## Configure

The integration requires the talk and speaker resource API available in
[OpenFeedback v0.36.0](https://github.com/HugoGresse/open-feedback/releases/tag/v0.36.0)
and documented in the [API reference](https://api.openfeedback.io/). It uses
paginated reads, creation with stable IDs and updates with per-record revisions.

Follow [repository setup](../usage/setup.md), then pass these settings to both
`update-meetup-issue.yml` and `check-active-meetup-issues.yml`:

| Consumer setting                 | Reusable workflow parameter   | Requirement                                                                          |
| -------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------ |
| Secret `KUTT_API_KEY`            | Secret `kutt-api-key`         | Required; key belonging to the owner of the existing link on the configured instance |
| Variable `KUTT_BASE_URL`         | Input `kutt-base-url`         | Required; HTTPS base URL of the Kutt instance, without `/api/v2`                     |
| Variable `KUTT_FEEDBACK_LINK_ID` | Input `kutt-link-id`          | Required; the link's API `id`, not its short address                                 |
| Secret `OPENFEEDBACK_API_KEY`    | Secret `openfeedback-api-key` | Required organization key beginning with `oforg_`                                    |

All four settings are required, including for issues with an
existing feedback URL. A missing or malformed OpenFeedback key fails feedback
reconciliation. Use an organization key beginning with `oforg_`; an event-specific
`ofproj_` key is not accepted.

Set `KUTT_BASE_URL` to the instance hosting the existing short link, for example
`https://short.example.test`. There is no default endpoint. The URL must use
HTTPS and have no embedded credentials, query string, or fragment. An optional
path prefix is supported, such as `https://short.example.test/shortener`;
trailing slashes are normalized. The adapter appends `/api/v2` and rejects
redirects. The API key must belong to that instance.

Create the Kutt short link before enabling the workflows. Missing Kutt settings
fail feedback reconciliation. The automation does not create or replace a
missing short link.

A valid existing **OpenFeedback Link** is reused. Supported URLs are
`https://openfeedback.io/<event-id>`, optionally followed by `/YYYY-MM-DD` or `/0`.
Query strings and fragments are rejected. The URL field can remain empty until
the automation fills it; the API key is always required.

Feedback reconciliation also requires the three [publication URL inputs](../reference/configuration.md#publication-url-inputs)
used by event evaluation. Forward the same values as issue updates and audits.

## Prepare the event

When the field is empty, the workflow creates an event
through the [OpenFeedback events API](https://api.openfeedback.io/#tag/events).
It uses the meetup title, limited to 100 characters, and the GitHub issue URL as
the schedule link.

Creation requires a valid event date, a title, at least one talk subject and
resolved speaker references. Talk subjects become OpenFeedback talk titles;
only public speaker names and stable identities are sent. Private catalog
contacts and source locations are excluded. The automation supports up to 100
issue talks and 100 speakers, with titles up to 2,000 characters and names up to 200. It follows API pagination and limits reads to 200 existing records of each
type. Larger events require manual synchronization.

Subsequent runs synchronize the event name and agenda from the issue. Existing
matching speakers and talks keep their OpenFeedback IDs, including records
created manually. A title edit keeps its talk ID when the speaker group matches
unambiguously; a speaker change keeps the talk ID when the title matches uniquely.
Imported record IDs are preserved. Incomplete records and references to deleted
speakers do not block synchronization of other talks; unrelated records remain
untouched.
Edit one talk at a time when several talks share the same speakers;
ambiguous matches block agenda writes and appear as
`publication.feedback.conflict` in the organizer checklist without failing CI.
Changes to both the title and speaker group can create a new talk. Review such
changes in OpenFeedback.

Talks and speakers remain editable in OpenFeedback. The issue owns synchronized
titles and names; changes to these fields in OpenFeedback can be overwritten on
the next run. Manage photos, schedules, tags and other settings there. The
automation never deletes talks, speakers or votes. Remove obsolete talks manually
after reviewing their feedback. It does not convert events backed by JSON or
Hoverboard to OpenFeedback storage.

An incomplete agenda preserves an existing poll, reports a diagnostic, and still
allows title and due Kutt updates. New polls wait for a complete agenda. Each
talk or speaker update checks that record's last-read revision. A conflict stops
the run and requires a fresh read on retry. Closed, cancelled, postponed and
unrelated issues are skipped.

## Update the shared link

The shared Kutt link can change from the start of the calendar day before the
event through the end of the event day in `Europe/Paris`. For example, a meetup
on September 30 gets its redirect updated on September 29; a run on September 30
can catch up if the earlier run was missed or failed. Runs before September 29
or after September 30 leave the target unchanged. The link keeps its short
address; only its target changes. If the target already matches, no update is
made.

Keep the daily audit enabled. A manual audit on the event day can repair a missed
update. If both eligible days pass without a successful update, update Kutt
manually.

An active meetup happening today takes priority over one scheduled for tomorrow,
so tomorrow's audit does not replace today's feedback link. The
future event reports `publication.feedback.current-event` and can switch on its
own event day. Closed, cancelled, and postponed meetups do not block the switch.
If several active meetups share the event date, the workflow reports
`publication.feedback.ambiguous-date`; choose the target manually.

## Resolve failures

A failed issue update after successful event creation can be retried. The event
ID is stable for the repository and issue. A retry finds the same event and
updates its name, schedule link and agenda, preserving existing identities,
settings and votes. Speakers are synchronized before talks. Each write is atomic
for one record; a later failure leaves earlier successful writes in place. A retry
reads those records, skips unchanged ones and resumes using the same IDs.
Creation conflicts stop the current run instead of overwriting an existing
record; rerun after reviewing the conflict.

For a missing Kutt link, verify its API ID and the key's owner. For an
OpenFeedback authorization error, verify that the organization key has access to
the event, including when its URL was entered manually. Failed updates never
replace an existing event. If the issue changed during a run, rerun after editing
is complete.

The direct
[feedback action](../../actions/publication/reconcile-feedback/README.md)
reconciles feedback on every invocation. Call it under the shared event workflow
lock used by the reusable workflows.
