# Conference Hall

Conference Hall is authoritative for linked speaker profiles and selected talk
content. Each event run reads the current CFP export and combines its
speaker names, companies, email addresses and picture URLs with committed local
IDs and organizer-maintained fields such as phone numbers. Profile and selected
proposal edits take effect on the next reconciliation without a CSV merge.
Issues without proposal references retain manually maintained talk text; linked
speaker profiles still refresh from Conference Hall.

## Configure the source

In Conference Hall, open the CFP's **Settings > Web API** page. Generate an event
key and inspect its example response from `GET /api/v1/event/<event-slug>`.
Copy proposal `id` values and each speaker's `id`; proposal numbers and dashboard
URLs are not IDs. The API exports event-scoped speaker identities shared across
proposals. Verify that the deployed service returns the documented full export
before enabling synchronization. Do not save or upload the raw response.

Set `conference-hall-event` to `meetup-cloud-native-aix-marseille` in the consumer
workflow and provide `conference-hall-api-key` explicitly from a repository
secret. Both settings are required by both event workflows and every action
that refreshes profiles or proposals. Omitted or blank values fail before
reconciliation. Forward both settings explicitly. Requests always use
`https://conference-hall.io`; issue content cannot choose a credential target.
The adapter uses a 15-second timeout, a 5 MiB response limit and no redirects.

Run the active-event audit on a schedule as well as issue changes and manual
requests. Source edits alone do not trigger GitHub Actions; propagation occurs
on the next successful audit. Pass the source settings to every event, feedback,
asset and communication invocation so they apply the same authority policy.
Active-event audits persist the refreshed managed agenda and profile
names in the issue under the shared event lock.

Conference Hall's [profile save operation][profile-save] updates its event speaker
records. Edit talk content in the **submitted proposal for this CFP**: the
[proposal update][proposal-update] changes the exported record, whereas editing
only the [personal talk library][library-update] does not update existing
submissions. Speaker proposal editing depends on the CFP being open. The
integration inherits what the event export exposes; it does not change upstream
records or proposal status.

## Register identities and maintain the CSV snapshot

Use the [speaker synchronization workflow](../../.github/workflows/synchronize-conference-hall-speakers.md)
from a private consumer repository. Its GitHub App needs Contents: write and
Pull requests: write for that repository. Add scheduled and manual callers:

```yaml
name: Synchronize speakers
on:
  schedule:
    - cron: "17 5 * * *"
  workflow_dispatch:
permissions: {}
jobs:
  synchronize:
    uses: cloud-native-aixmarseille/meetup-event-automation/.github/workflows/synchronize-conference-hall-speakers.yml@REPLACE_WITH_FULL_COMMIT_SHA
    with:
      locale: en
      github-app-client-id: ${{ vars.MEETUP_AUTOMATION_APP_CLIENT_ID }}
      conference-hall-event: meetup-cloud-native-aix-marseille
    secrets:
      github-app-private-key: ${{ secrets.MEETUP_AUTOMATION_APP_PRIVATE_KEY }}
      conference-hall-api-key: ${{ secrets.CONFERENCE_HALL_API_KEY }}
```

Replace the revision placeholder with the pinned automation commit and use your
existing GitHub App variable and secret names. Add a default-branch `push` caller
for `check-active-meetup-issues.yml` filtered to `referentials/speakers.csv` and
`referentials/speaker-sync-state.json`. Forward its existing required settings
and credentials plus the Conference Hall settings. This reevaluates active event
approvals after a catalog merge; pull requests keep using the referential/form
validation workflow.

Before the first import, review existing people and add `source_provider`,
`source_event`, and `source_speaker_id` to their existing CSV rows. Never replace
`speaker_id`. A possible match with an unlinked name or email stops import for
mapping review; it does not merge identities. Different people with the same
name need distinct local and source IDs. See the [CSV schema](../reference/referentials.md).

The workflow maintains `chore/synchronize-conference-hall-speakers`. It merges
the current default branch before importing, validates the complete candidate,
and updates the CSV, allocation state, and form together. Local phone numbers,
structured names, extra columns and absent source records survive import. New
IDs are retained in the open branch. The first run reserves historical IDs from
the fetched Git history; subsequent allocations are recorded in
`referentials/speaker-sync-state.json`; preserve this file so removed IDs cannot
be reused. Absent, empty or null source-owned affiliation and picture fields
clear their projected values; invalid image references fall back to text and
are never downloaded. Organizer-owned fields are preserved.

Review and merge the private PR to register new identities and update the CSV
snapshot and generated form choices. Existing linked profiles are live from
Conference Hall regardless of whether a later snapshot PR has merged. An
unchanged snapshot creates no new diff or PR. A failed snapshot sync leaves local
files unchanged and does not establish live source freshness.

Event evaluation and recipient preparation share one in-memory source snapshot
and one local catalog revision per invocation. Email uses the current source
address and display name for linked speakers, including greetings when local
structured names are older. Phone numbers and local IDs are retained. Changed
unfinished outgoing batches require fresh approval through the existing
fingerprint; accepted delivery records are never reset or resent.

A concurrent default-branch update aborts publication. The push uses an exact
branch-head lease. Merge conflicts and a human-authored synchronization branch
head stop the run without overwriting edits. Reconcile those changes manually,
merge the reviewed PR, then delete the synchronization branch before the next
run. GitHub and the source API do not share a transaction; in-flight event runs
keep their own source snapshot and checked-out local supplements.

## Select talks

Use the `conference_hall_proposals` textarea from the
[issue form template](../../__tests__/meetup-issue-template.yml), with the heading
`Conference Hall proposals`, as the form's only talk input. Omit the manual
`agenda` textarea and the `<!-- Available speakers -->` Markdown block.
Enter one proposal ID per line in presentation order. The first successful
reconciliation adds **Agenda** to the issue; subsequent runs refresh it from the
selected proposals. Leaving the selection blank keeps the draft incomplete until
talks are selected. Only selected, accepted proposals are projected. Declined
speaker confirmation, unknown states, missing IDs, duplicate selections and missing
committed speaker mappings stop the refresh. Acceptance does not confirm meetup
availability; keep the existing host and speaker confirmation labels.

The codec owns the generated agenda and a versioned `meetup-proposals` marker.
Correct managed talk text in Conference Hall. Public speaker names and optional
HTTPS picture references come from the same live Conference Hall snapshot. Pictures are available to
presenters; current issue and form presenters use text and do not download or
embed portraits. Unrelated issue sections remain intact.

Failed refreshes preserve the last agenda verbatim, mark it stale, and publish
English/French recovery guidance. Mail dispatch and feedback synchronization
requiring those talks stop. Independent host/date asset work can continue. To
explicitly return an issue to manual management, remove both the proposal field
contents and the `meetup-proposals` marker, then review the manual agenda and
stable speaker references before reconciliation.

## Request budget and recovery

The CFP with linked rows requires a successful profile refresh. An
unavailable source, invalid export, conflicting identity or missing linked
speaker blocks catalog use and dependent mail and feedback work. Old CSV profile
values are not a fallback. No local rows are deleted: repair the source/mapping,
or explicitly remove a mapping if the speaker should become locally managed.
Unlinked rows and rows for other CFPs retain their local values. Standalone CSV
validation and form projection continue to operate on the committed snapshot.

The documented API limit is 60 requests per hour per client IP. Each action
invocation shares one in-memory snapshot; event, feedback, asset and communication
actions resolve independently. Budget up to four requests per event,
plus speaker sync, and allow capacity for other runners sharing an IP. Stagger
or reduce consumer audit frequency for larger catalogs. No persisted export
cache, artifact or raw-output channel is used.

A 429 response defers work without an immediate retry. The synchronization action
exposes `retry-after-seconds`; wait at least that delay before rerunning. Event
runs report a rate-limit diagnostic and require a later source refresh. For
other failures, check the key, CFP slug, schema, selection status, and merged
mappings. Reports contain safe codes/counts only; contact changes are visible
only in the intended private CSV diff.

[profile-save]: https://github.com/conference-hall/conference-hall/blob/335d349b51194e3f5abbd809016b779dbdbcc0d5/app/features/speaker/settings/services/speaker-profile.server.ts
[proposal-update]: https://github.com/conference-hall/conference-hall/blob/335d349b51194e3f5abbd809016b779dbdbcc0d5/app/features/event-participation/speaker-proposals/services/speaker-proposal.server.ts
[library-update]: https://github.com/conference-hall/conference-hall/blob/335d349b51194e3f5abbd809016b779dbdbcc0d5/app/features/speaker/talk-library/services/speaker-talk.server.ts
