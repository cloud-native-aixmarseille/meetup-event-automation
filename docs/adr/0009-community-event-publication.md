# Event publication destinations

Status: Accepted. Implemented in this branch; live deployment validation is pending.

Scope: creating, reviewing, publishing, and reconciling the events associated
with a meetup issue on Meetup.com and CNCF Open Community Groups (OCGroups).
Follow the shared [architecture](0001-architecture.md),
[action contracts](0002-action-contracts.md), and
[organizer approval](0003-organizer-approvals.md) decisions.

## Context

The existing manual workflow publishes the CNCF event and stores its public URL
in **CNCF Link**. `CommunityEventUrlPolicy` validates configured URL prefixes;
`ManualPublicationPolicy` treats a community link as publication completion.

[Meetup publication](../integrations/event-publication.md) already addresses the
same need through the organizer site: save a draft, retain its identity,
request approval, publish the approved revision, and verify remote state before
recording completion. Its browser integration demonstrates a repository pattern,
not proof that OCG authentication or editor behavior works with a live account.

## Decision

Treat event publication as one business capability. A provider implements remote
operations; a destination binds that provider to an explicit group, settings,
credentials, journal, and approval scope. Compose the destinations as a collection
and run one shared lifecycle for each: recover, save, review, publish, verify,
and project the result onto the issue.

Meetup and OCGroups implement the same publication gateway using Playwright and
Chromium. Keep login, navigation, editor controls, and remote verification in
their adapters. A supported write API can replace either browser implementation
without changing the lifecycle. Verify the deployed login method and permissions
before enabling a caller; do not treat internal dashboard routes as a stable API.

### Ownership and reusable contracts

- Publication owns managed event values, identity validation, and
  [`EventPublicationGateway`](../../packages/domain/publication/src/application/event-publication-ports.ts).
  Its operations are `inspect`, `save`, and `publish`. Saving creates drafts and
  preserves an existing event's status. Both adapters return a stable ID,
  organizer review URL, optional public URL, and explicit draft/published status.
- Journey's
  [`ReconcileEventPublications`](../../packages/application/journey/src/use-cases/reconcile-event-publications.ts)
  evaluates shared readiness and processes the configured collection sequentially.
  Each destination uses
  [`ReconcileEventPublication`](../../packages/application/journey/src/use-cases/reconcile-event-publication.ts)
  for recovery, creation reservation, approval, publication, and issue projection.
  Destination policies supply typed event projections, field limits, identity
  validation, approval revisions, and issue-field mappings. The lifecycle contains
  no provider dispatch or browser operations.
- `packages/adapter/publication/ocgroups-event-gateway` owns browser
  operations and maps observed provider values into publication contracts.
  Runtime composition injects its credentials, collaborators, and settings.
- GitHub adapters own versioned journal and approval representations. Give OCG
  records a separate provider identity and approval kind. Existing Meetup
  journals and decisions must retain their meanings and remain readable.
  Presenters own English/French review and diagnostic wording.

### Collection execution and provider differences

Hold the existing event lock for the entire collection. Carry forward issue
patches in the invocation's source snapshot and check that snapshot before and
after each destination, as well as immediately before remote writes. A changed
source or invalidated content review stops further effects. A pending approval,
uncertain creation, or provider failure produces a destination-specific result
and allows the other destination to proceed. Successful remote operations remain
durable if another destination fails; there is no cross-provider transaction.

Each destination owns its journal and approval scope. Preserve existing Meetup
journal identities and decode existing records, normalizing its URL into a numeric ID
and review/public URLs at the adapter boundary. OCGroups retains its UUID and
editor URL independently of the public slug. Shared approval mechanics never
allow one provider's approval to authorize another provider.
Meetup's publication revision also binds the approved cover identity, byte
fingerprint, and source revision. Extending the managed content requires fresh
approval; an approval for text and schedule alone does not authorize artwork.
Recovery policies also retain their boundaries: Meetup can recover a pending
creation through a verified organizer-supplied link; OCGroups requires the saved
identity in its journal before resuming an uncertain creation.

Meetup projects draft URLs into Meetup Link and keeps its publication checkbox.
OCGroups projects only verified published URLs into CNCF Link. The collection
rejects duplicate destinations and destinations that would write the same issue
field. The supported issue model has one destination for each provider.

Use one `publication/reconcile-event` action and one
`event-publication-reconcile.yml` workflow for the collection. Read the common
schedule and public venue mapping once per configuration load from
`.github/event-publication.json`; content review uses that same schedule.
`destinations` selects Meetup, OCGroups, or both, with at most one of each.
Provider settings remain typed and local to their configured destination.
An explicit empty collection supports content review with manual publication.

Require one `publication-credentials` JSON secret with exactly the enabled
provider keys. Meetup supplies email, password, and an AI configuration validated
by the shared `AiInput` contract; OCGroups supplies username and password only.
Mask the bundle and its decoded values before validation. Bind credentials and
provider selection in `PublicationAdapterComposition`; the application receives
owned ports. A small `publication/prepare-runtime` action derives whether the
workflow needs Python and the challenge solver from the same configuration.
The workflow installs Chromium once and forwards credentials only to the
reconciliation action. OCGroups-only callers need no AI configuration.

### Draft, approval, and publication

1. Load and evaluate the issue without normalizing unrelated fields. Require an
   open, future scheduled event, confirmed host and speakers, approved event
   copy, resolved agenda, explicit times, and configured public venue data.
   Missing Meetup, CNCF, or Drive links must not block creating an OCG draft.
   Skip closed, cancelled, postponed, and held events. Automatic cancellation,
   deletion, unpublishing, and series operations are outside this integration.
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
Use the [organizer recovery procedure](../integrations/event-publication.md#recover-an-interrupted-run);
remove a pending reservation only after confirming that creation did not occur.
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

Keep the shared publication action and workflow separate from general event
normalization and active-event audits. Trigger publication on relevant issue
changes, edits of either provider's approval comments, and explicit recovery runs. It
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

## Implementation and validation

The [event publication guide](../integrations/event-publication.md) defines the
implemented configuration, approval, update, and recovery behavior. The browser
adapter records the UUID from the save response before reloading; the public URL
is optional until the saved editor is verified. It navigates the full dashboard
through its controls, verifies the selected UUIDs and public group link, and
observes browser responses without calling internal endpoints directly.
Registration creation uses one free public ticket tier. Draft verification also
rejects automatic online meetings and recurring series.

Synthetic journey, journal, approval, configuration, and Chromium tests cover
source and approval guards, UUID recovery, verified URL projection, provider
isolation, published updates, and blocked unsupported states. Public contract
checks cover explicit inputs, approval routing, shared locking, localized
reporting, credential forwarding, and conditional challenge runtime preparation. Existing readiness and promotion consumers
retain their URL semantics; draft URLs are kept outside CNCF Link.

Before enabling a consumer caller, an authorized organizer run must establish
login, draft persistence, review access, publication, and notification behavior
on the deployed instance. The live checks recorded below do not establish
unattended login, publication, or notification behavior.

## Decision history

### 2026-10-28: include approved Meetup cover artwork

The event gateway previously managed title, description, schedule, and venue,
while cover approval only fed generated assets. The organizer's draft check
identified the missing event photo. Extend the Meetup-specific event projection
with the current authorized cover and recheck that projection before writes.
OCGroups retains its existing managed fields.

Reuse the trusted Meetup publication journal for a group-scoped image fingerprint
and remote photo ID. Preserve the event reservation and identity while writing
photo state. Validate the exact reviewed bytes before uploading, reserve before
the effect, and record the observed photo ID before saving the event. Verification
compares the persisted photo ID against this mapping because Meetup transforms
uploaded images and their bytes cannot be compared directly with the source.

The earlier decision to retain unchanged Meetup approval fingerprints applies
only to unchanged managed content. Cover-aware revisions supersede text-only
approvals. Existing journals without photo metadata remain readable.

The live picker created a new photo identity when an existing group photo was
selected and its crop confirmed. Blindly selecting it again after an interrupted
save could create duplicates. Stop on pending or detached photo identities and
require recovery. Normal saved-event reruns reuse the confirmed attached photo.

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

### 2026-10-28: Meetup authentication checks

The earlier validation relied on synthetic tests. An organizer-authorized
interactive login subsequently allowed the production adapter to save and
verify an unpublished synthetic draft, including its cover. An unchanged rerun
made no event submissions. This validates draft editing in that authenticated
session, not fresh unattended login.

The [hosted authentication-only check](https://github.com/cloud-native-aixmarseille/meetups/actions/runs/40711508843)
completed the pre-credential CAPTCHA, but Meetup rejected the submitted token
with `invalid_captcha_error`. The submitted token matched the solver's result.
One diagnostic retry with a fresh challenge produced the same rejection; this
retry is not part of production behavior.

The [one-use local runner check](https://github.com/cloud-native-aixmarseille/meetups/actions/runs/40714552034)
stopped earlier: the solver did not complete the CAPTCHA, and no credentials
were submitted. It does not isolate the hosted runner's network as the cause.
Neither authentication check changed an event. The temporary runner unregistered
after its one job, and its local credentials and workspace were removed.

Unattended authentication remains unverified. Preserve the fresh-session and
credential-isolation policy; interactive verification in another browser cannot
make a subsequent workflow authenticated.
