# Community event publication

Status: Proposed. No OCGroups adapter is implemented.

Scope: creating, reviewing, publishing, and reconciling the CNCF Open Community
Groups (OCG) event associated with a meetup issue.
Follow the shared [architecture](0001-architecture.md),
[action contracts](0002-action-contracts.md), and
[organizer approval](0003-organizer-approvals.md) decisions.

## Context

Organizers currently publish the CNCF event manually and paste its public URL
into **CNCF Link**. `CommunityEventUrlPolicy` validates configured URL prefixes;
`ManualPublicationPolicy` treats a community link as publication completion.

[Meetup publication](../integrations/meetup-publication.md) already addresses the
same need through the organizer site: save a draft, retain its identity,
request approval, publish the approved revision, and verify remote state before
recording completion. Its browser integration demonstrates a repository pattern,
not proof that OCG authentication or editor behavior works with a live account.

## Proposed decision

Use an OCG-specific browser adapter with Playwright and Chromium, following the
Meetup publication lifecycle. A supported write API can replace the adapter
later; its availability is not a prerequisite for implementation. Authenticate
with an explicitly configured organizer account authorized for the target group.
Verify the deployment's login method and permissions before enabling the caller.

Reuse publication policies, approval verification, reporting, and recovery
mechanics where their contracts fit. Keep OCG login, navigation, editor controls,
provider identity, and verification separate from the Meetup adapter. Do not
call undocumented dashboard routes as if they were a stable integration API.

### Ownership and reusable contracts

- Publication owns managed event values, identity validation, and remote state
  contracts. Start from the separate `save` and `publish` operations in
  [`ScheduledEventGateway`](../../packages/domain/publication/src/application/scheduled-event-ports.ts).
  Saving must never publish a draft. Extend narrow contracts where OCG needs a
  stable remote ID, organizer review URL, and public URL; do not force those
  identities into the current single-URL Meetup representation.
- Journey coordinates source evaluation, the content-review gate, approval,
  recovery, and issue projection. Follow
  [`ManageMeetupPublication`](../../packages/application/journey/src/use-cases/manage-meetup-publication.ts),
  extracting shared lifecycle collaborators only where both consumers need them.
  OCG prerequisites and projections remain separate from Meetup venue lookup,
  URL parsing, and field limits.
- A proposed `packages/adapter/publication/ocgroups-event-gateway` owns browser
  operations and maps observed provider values into publication contracts.
  Runtime composition injects its credentials, collaborators, and settings.
- GitHub adapters own versioned journal and approval representations. Give OCG
  records a separate provider identity and approval kind. Existing Meetup
  journals and decisions must retain their meanings and remain readable.
  Presenters own English/French review and diagnostic wording.

### Draft, approval, and publication

1. Load and evaluate the issue without normalizing unrelated fields. Require an
   open, future scheduled event, confirmed host and speakers, approved event
   copy, resolved agenda, explicit times, and configured public venue data.
   Missing Meetup, CNCF, or Drive links must not block creating an OCG draft.
   Skip closed, cancelled, postponed, and held events. Automatic cancellation,
   deletion, unpublishing, and series operations are outside this proposal.
2. Reconcile only the declared managed fields: title, description with public
   talk/speaker information, date, start/end times, event timezone, in-person
   type, configured category, and public venue. Validate OCG-required fields
   before submission. Creation settings must explicitly define registration
   and other required choices; never derive them from private host addresses or
   silently enable paid tickets, recurring events, or automatic meetings.
   Preserve unmanaged settings, registrations, and attendee records on updates.
3. Reserve creation in a trusted bot-authored journal before saving. Save one
   draft through the editor and record its observed stable identity immediately,
   before field verification or issue writes. OCG's preview is not a save.
   Reopen the saved draft and verify all managed fields, group, and draft status.
4. Request a distinct OCG publication approval using the existing trusted-comment,
   repository-permission, and Slack notification mechanisms. Bind its revision
   to the provider/group, stable event identity, review URL, complete managed
   projection, and creation settings. State that publishing can trigger OCG's
   native notifications. Meetup or event-copy approval grants no OCG authority.
   Changed draft content or identity requires a new request; rejection leaves
   the draft unpublished.
5. Immediately before publishing, reread the issue, recheck trusted approval and
   current organizer permission, and verify the saved remote revision. Publish
   only that existing draft. Reopen it and verify both publication status and
   saved fields; a click, redirect, or successful request alone is insufficient.
6. Project the verified public URL into **CNCF Link** through the versioned event
   codec, after checking the issue is still current. Retain draft editor links
   in the journal and approval request only. Current readiness and promotion
   consumers treat a valid CNCF link as published, so exposing draft links there
   would require a separate publication-status contract across those consumers.

If a supplied **CNCF Link** resolves to a draft, first retain its verified identity
in the journal and clear the field with a guarded codec patch. Request approval
against the updated issue snapshot. A manually pasted draft must not satisfy
publication readiness either.

An unchanged rerun performs no remote save or publish. Existing published events
are verified and updated in place, preserving their publication status. Their
managed updates can trigger OCG's native reschedule notifications; document that
effect when enabling synchronization. Do not issue separate announcements from
the automation. Cancellation and postponement stay manual remote operations.

Keep the `publish-community-event` organizer task until publication is verified.
Its wording can direct organizers to review or recover the automated draft;
the existence of an adapter does not establish completion. Until the integration
is released and configured, the current manual workflow remains supported.

### Identity, retries, and recovery

Scope the journal to repository, issue, provider, and configured community/group.
OCG identifies saved events by UUID, while public URLs use a slug. Retain the
observed stable ID and verified URLs; never infer identity from a title, list
position, or a generated slug. Verify a changed public slug against that same
remote ID. A pending creation without a saved identity blocks automatic creation
on every rerun; an idempotency key alone cannot deduplicate browser submissions.

Reuse a valid supplied event only after verifying its target group and identity.
Conflicting issue and journal identities, duplicate or corrupt journals, missing
linked events, and uncertain remote outcomes require organizer recovery. Never
create a replacement automatically. Existing manually published events must be
linked before first synchronization. A legacy URL accepted by the manual URL
policy is not automatically an editable OCG identity.

Recover an interrupted save or publish by inspecting the recorded event before
retrying. Recover draft identity into the provider journal, not **CNCF Link**.
Document a validated organizer recovery procedure during implementation; remove
a pending reservation only after confirming that creation did not occur.
Keep journal identity even when field verification or the GitHub patch fails.

### Authentication and workflow boundary

Use a verified account with event-write permission in the intended OCG group.
Credentials are explicit consumer secrets passed only to the publication step.
Validate HTTPS origin, account, selected community/group, and permissions before
writing. Use fresh browser sessions with bounded timeouts and cleanup. Do not
persist credentials, cookies, session state, page dumps, traces, or videos in
caches, logs, summaries, or artifacts.

Do not assume the deployed instance enables password login because upstream
supports it. Unsupported SSO, MFA, challenges, or changed pages block the run
with organizer guidance. Reuse browser-authentication capabilities only after
establishing an actual OCG need and testing their boundary; do not add AI inputs
or solver dependencies merely because Meetup uses them.

Expose a thin `publication/reconcile-community-event` action and a dedicated
publication lifecycle caller, proposed as
`event-publication-reconcile-community.yml`. Keep this work out of the general
event normalization and active-event audit workflows. Trigger it on relevant
issue changes, edits of OCG approval comments, and explicit recovery runs. It
shares `meetup-event-REPOSITORY_ID-ISSUE_NUMBER` with other event effects and
sets `cancel-in-progress: false`. Direct callers must hold the same lock.

Require explicit locale, target configuration, credentials, and consumed inputs
without defaults or a redundant mode flag. Select the writable OCG target
explicitly and validate it against the consumer's accepted community URL
prefixes; do not hardcode a chapter or choose the first legacy prefix. Use the
event's timezone and consumer-configured wall-clock times and host mappings.
Return `ActionReportData` through the shared `ActionRunner` on every normal path,
including skips. Expected corrections stay organizer tasks; unexpected browser,
source, or verification failures remain technical failures with redacted details.

## Alternatives and consequences

- Waiting for an API avoids browser selector maintenance but leaves publication
  manual indefinitely. A deployed, documented write API with suitable credentials
  remains a possible future adapter, not the current dependency.
- Replaying internal HTTP routes couples the integration to session and form
  internals without exercising the organizer UI. The browser approach accepts
  UI maintenance and browser runtime cost instead.
- Copying Meetup wholesale would confuse provider identities, draft URLs, venue
  rules, notifications, and approval state. Shared policy with separate provider
  adapters preserves those boundaries.
- Publishing immediately after draft creation removes organizer authority. The
  review step adds latency but binds publication to the exact approved event.
- Workflow locks and source rereads reduce races but cannot make GitHub and OCG
  writes transactional. Uncertain outcomes require recovery, not blind retries.

## Implementation acceptance

These are requirements for a future implementation, not completed validation:

- Synthetic journey tests cover missing prerequisites, content-review blocks,
  stale issues, independent provider approvals, changed revisions, rejection,
  verified completion, and preservation of unrelated issue fields.
- Chromium tests cover actual draft saving, preview without persistence,
  scoped identity capture, managed-field verification, approved publication,
  published updates, unchanged reruns, wrong accounts/groups, unsupported login,
  changed selectors, and preservation of unmanaged settings.
- Recovery tests cover interrupted creation, saved identity before verification,
  interrupted publication, unknown outcomes, corrupt/conflicting journals,
  supplied event adoption, slug changes, and isolation from Meetup state.
- Contract tests cover explicit action inputs, approval-comment routing, shared
  locking, scoped credentials, localized reporting, and redaction. Readiness and
  promotion tests prove that an unpublished OCG draft cannot satisfy completion.
- Before enabling the consumer caller, an authorized live organizer run must
  establish login, draft persistence, review access, identity capture, publication
  and notification behavior on the deployed instance. Fixture tests and upstream
  source inspection do not establish those capabilities.

## Supporting evidence

Source review on 2026-10-23: OCG revision
[`8821a744`](https://github.com/cncf/open-community-groups/tree/8821a7440e39ffe3016c3658c2252f2b08e92d79)
documents draft saving and separate publication in its
[event operations guide](https://github.com/cncf/open-community-groups/blob/8821a7440e39ffe3016c3658c2252f2b08e92d79/docs/guides/event-operations.md).
Its [event handlers](https://github.com/cncf/open-community-groups/blob/8821a7440e39ffe3016c3658c2252f2b08e92d79/ocg-server/src/handlers/dashboard/group/events.rs)
distinguish database-free preview from creation and publication, and include
native publication/reschedule notifications. This is upstream source evidence,
not a live CNCF deployment check. The
[read-only API request](https://github.com/cncf/open-community-groups/issues/449)
does not establish a deployed event-write API.
