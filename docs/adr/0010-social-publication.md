# LinkedIn Page and Slack publication

Status: Accepted on 2026-10-27. Implementation authorized; consumer enablement and
live publication require a released version and verified account access.

Scope: dispatching reviewed meetup announcements and pre-event reminders to the
community's LinkedIn Page and selected Slack channels. Personal LinkedIn profiles,
post-event campaigns, automatic corrections, and engagement analytics are excluded.

## Context

Organizers currently copy public announcements into LinkedIn and Slack. The
`meetups` consumer pins automation 2.3.2 at `5a80cd5`, whose
[communication contract][pinned-communications] keeps public Slack posts manual.
The organizer Slack channel carries internal requests, not public announcements.

Newer automation source has [social drafts and review](0008-draft-generation.md),
including separate announcements, D-7 reminders, and D0 reminders. It explicitly
excludes dispatch and scheduling. Those capabilities are foundations for this
proposal, not features deployed in the pinned consumer. Publishing event pages
on Meetup and OCGroups remains a [separate capability](0009-community-event-publication.md).

The requested LinkedIn author is the community Page. Slack destinations come
from an explicit consumer-configured list of channels, which may span several
workspaces. Their workspace/channel IDs and installation permissions must be
confirmed before enablement. No community name or fixed destination count is
part of the architecture.

## Decision

Add social dispatch to the existing promotion lifecycle through official provider
APIs. Keep GitHub as the organizer's review and delivery record. Publish only an
explicitly authorized revision to explicitly configured destinations. Slack can
be enabled independently while LinkedIn access is being established.

### Ownership and destination configuration

- Communication owns social delivery intents, due-time rules, destination
  completion, and provider-neutral dispatch ports.
- Journey coordinates approved drafts, current event facts, organizer authority,
  managed media, and delivery records under the existing event lock.
- Communication adapters own Slack/LinkedIn transport and GitHub delivery storage.
  Reuse existing approval verification and Slack transport where their contracts
  fit; keep public posting separate from internal organizer notifications.
- Publication retains managed media ownership. Runtime binds explicit credentials,
  locale, and provider adapters. Presenters own localized review and diagnostics.
- The consumer owns the destination allowlist, triggers, secret bindings, and
  release pin. Runtime policies stay in `meetup-event-automation`.

Each destination has a stable key, provider, display label, and remote identity:
Slack workspace ID plus channel ID, or a LinkedIn organization URN. Bind each
Slack workspace to its own installation credential. Store tokens in GitHub
secrets, separately from non-secret target configuration. Reject duplicate remote
targets and mismatched workspace credentials. Never route public posts through
the organizer channel as a fallback.

The configured Slack channel list is the only source of allowed Slack targets.
An empty list produces no Slack publication work; missing configuration cannot
fall back to predefined targets. Reject any requested channel outside the list
and recheck membership immediately before dispatch. Each configured channel has
its own stable destination key and delivery identity and appears explicitly in
review. Do not encode a fixed set of community keys in generation or dispatch.
Adding or replacing a target requires approval of the revised destination set;
removing one blocks its pending sends. A target cannot inherit authority from a
display label.

### Content and authorization

Keep the accepted [social formats](0008-draft-generation.md#social-announcements)
and [reminder formats](0008-draft-generation.md#pre-event-reminders). Dispatch
consumes reviewed human-authored or generated content; it does not generate or
rewrite copy. LinkedIn uses the reviewed announcement image, distinct from the
cover artwork. Slack needs no image. Interactive LinkedIn mentions remain manual.

Add a distinct "Approve publication" decision using the existing
[organizer approval safeguards](0003-organizer-approvals.md). Existing content
approvals and completion checkboxes never authorize a public send. Show the
exact destination, final provider rendering, registration link, media preview,
publication time, and expiry. Approval binds the text, immutable media bytes,
source revision, language, author/targets, event occurrence, purpose, and timing.
One review can present several destinations, with independent decisions and
delivery results. Announcements and each reminder require separate authority.

Persist the verified decision before effects. Recheck current organizer
permission, source revision, configured targets, and eligibility immediately
before each send. Require current public event facts, confirmed host and
speakers, and a validated published registration link. Missing or failed source
refreshes block dependent posts. Changes to facts, content, media, target, or
timing invalidate affected unsent approvals; an approval cannot fill missing data.

Only allowlisted public facts enter posts or previews. Exclude private contact
fields and provider credentials from comments, logs, summaries, and artifacts.
Disable automatic mass-mention parsing and validate provider text/media limits
before approval; do not silently truncate or replace approved content.

### Timing and workflow

Use a `communication/reconcile-social` action composed by an
`event-promotion-reconcile.yml` reusable workflow, plus an active-event scan and
an explicit recovery workflow. Dispatch requires no AI credential. Inputs and secret
bindings follow the existing explicit [action contracts](0002-action-contracts.md).

Consumer callers run on publication approval edits, relevant issue changes,
manual recovery, and a scheduled scan of open meetup issues. Use a 15-minute scan
as the initial cadence; GitHub Actions scheduling is best effort, so exact-time
delivery is not promised. The dispatcher evaluates due times, not cron syntax.

Announcements become due after publication approval. D-7 and D0 use the reviewed
local date/time and IANA timezone, `Europe/Paris` for this consumer. Store the
resolved instant and reject ambiguous or nonexistent local times during planning.
Allow a delayed reminder only on its intended local calendar day, before event
start; otherwise mark it expired and request organizer action. Announcements also
expire at event start. Never replay missed countdowns on a later date.

Cancellation, postponement, issue closure, removed authorization, or an event
that has started blocks unsent posts. Rescheduling invalidates pending plans and
requires fresh review without erasing previous publication records. Already
published corrections or cancellations remain explicit organizer tasks.

Hold `meetup-event-REPOSITORY_ID-ISSUE_NUMBER` with
`cancel-in-progress: false`, matching other event effects. Reread source and
approval before each external write. Keep durable state in the consumer's
trusted bot-managed records, not runner files or caches. No additional service,
database, or provider-side scheduled queue is needed for this volume.

### Delivery, partial failures, and recovery

Use one durable intent per repository, issue/event occurrence, purpose, and
destination. Track the approved revision within that intent; changing a content
hash must not create permission to resend an already published announcement.
Extend the journal with provider post identity and media state without changing
the meaning of existing email or organizer-notification records.

1. Validate eligibility, approval, destination, and payload before reserving work.
2. Persist an attempt reservation before a provider call. For LinkedIn, track
   image preparation separately from public post creation, retaining the uploaded
   media identity and approved byte fingerprint across retries.
3. Record provider success and remote identity immediately: Slack workspace,
   channel, and message `ts`; LinkedIn post URN. Retain a usable post link when
   available. A failed GitHub checklist update must not cause another send.
4. Resume definitive non-acceptance only when the provider response proves retry
   is safe, with bounded backoff and any `Retry-After`. Authentication/permission
   failures require correction. Timeouts, ambiguous server failures, or a crash
   after reservation leave an uncertain attempt and block automatic retry.
5. Recover uncertainty through supported provider reads or a trusted organizer
   decision backed by the remote post reference. If publication cannot be ruled
   out, keep the reservation. A retry after confirmed non-publication needs an
   explicit recovery decision and valid current approval. Never delete history
   or uncheck a completion task to force a send.

Process destinations independently. Successful delivery to one configured Slack
channel remains complete when another rejects its token or LinkedIn is pending.
Report each destination's result through the existing shared checklist/attention
pipeline, preserving unresolved work when a stage is incomplete.

Complete a named announcement task only after all of its selected channels have
successful records, or a verified organizer records manual completion. Preserve
existing checked tasks during adoption; do not backfill announcements for them.
Track reminder completion separately. Unchecking a completed task never resends.

This provides duplicate suppression and explicit recovery, not an exactly-once
guarantee across GitHub and provider writes. Human edits can still race a final
source reread. Missing or tampered delivery history must block automatic replay.

### Provider feasibility

**Slack:** use [`chat.postMessage`][slack-post] with a bot installation in every
target workspace, `chat:write`, and membership in each selected channel. Community
administrators must allow the installation. Persist `channel` and `ts` from an
`ok: true` response. Respect workspace/channel [rate limits][slack-limits]. An
[OAuth installation][slack-oauth] supplies the workspace credential; the existing
organizer token does not establish access to another community. No broad history
scope is required for normal dispatch; recovery can remain organizer-assisted.

**LinkedIn:** use the [Posts API][linkedin-posts] at `/rest/posts`, with the
community organization as author, `w_organization_social`, and an authorized Page
administrator/content administrator. Maintain a supported `LinkedIn-Version` and
the required Rest.li protocol header in the adapter. Upload approved bytes through
the [Images API][linkedin-images], verify ownership and `AVAILABLE` status, and
then create the post. Retain the returned `x-restli-id`; obtain
`r_organization_social` if automated post readback/recovery is enabled.

Direct LinkedIn access is an enablement prerequisite, not an assumption. The
current [app-review guidance][linkedin-review] restricts Community Management
access to registered legal organizations and commercial use cases. Establish
whether this community or its sponsoring organization is eligible before
investing in the adapter. [Development access][linkedin-access] is for building
and testing; production requires the appropriate Standard tier approval.
Owning the Page alone does not prove API access.

Assign an owner for LinkedIn OAuth renewal and revocation handling. Do not assume
refresh tokens are available: [programmatic refresh][linkedin-refresh] depends
on the application's approval. Expired credentials block that destination and
create an organizer task without replaying delivered posts. Keep signed upload
URLs and tokens out of journals and diagnostics.

If direct LinkedIn access is unavailable, keep its reviewed draft/manual task and
consider an approved publishing service in a later decision after verifying its
API, cost, Page support, and recovery contract. Slack delivery remains useful
independently. Browser session automation is not the proposed fallback.

## Alternatives and consequences

- Continuing manual publication has no new credential or integration cost but
  keeps repetitive copying and inconsistent delivery tracking.
- A third-party scheduler could avoid owning the LinkedIn application approval
  process. It adds another account, possible subscription costs, and a delivery
  authority to reconcile. Evaluate it if direct access proves unavailable.
- Slack incoming webhooks are simple per-channel integrations, but Web API posts
  give the dispatcher a direct message identity for recovery and fit the existing
  Slack transport. Neither option removes workspace installation approval.
- Sending whenever an issue changes would avoid a review step but could publish
  incomplete drafts or repeat announcements. Separate publication authority adds
  organizer review while allowing unattended delivery of approved reminders.

The chosen approach reuses GitHub review, locking, and reporting. It adds provider
maintenance, token renewal, a social delivery journal, and occasional manual
recovery. Independent targets avoid making Slack availability depend on LinkedIn.

## Enablement and acceptance criteria

Enable each destination only after its prerequisites are verified. Slack needs
its workspace/channel IDs and approved app installation. LinkedIn additionally
needs the Page URN, API eligibility and access, and the announcement image
exported into immutable reviewed bytes; a mutable Drive link is insufficient.
Start with one authorized Slack destination and announcements; expand to the
remaining targets after their contracts are verified. Confirm planned times
before enabling scheduled reminders. LinkedIn readiness does not block Slack.

Implementation must cover empty channel lists, rejection of unlisted channels,
removal of a channel after approval, exact approval binding, unauthorized edits,
changed media/targets, cross-workspace routing, concurrent runs, successful reruns,
partial failures, rate limits, expired tokens, uncertain responses, crashes
around journal writes, manual completion, cancellation/rescheduling, and missed
reminder windows including daylight-saving changes. Verify that diagnostics
cannot expose secrets or private fields and that completed targets never resend
because another target failed.

Use synthetic provider tests first. Live posts require a separately authorized
pilot, followed by a no-duplicate rerun and recovery check. Then release the
automation, update consumer pins/callers, and document the implemented setup and
recovery behavior. Consumer enablement is separate from the implementation and synthetic checks.

## Decision history and evidence

2026-10-27: proposed for the community LinkedIn Page and an explicit configured
list of Slack channels. Following review, fixed community destinations were
replaced with channel-list configuration, aligned with the refinement in
[draft generation](0008-draft-generation.md#decision-history).
It extends the scope excluded from
[draft generation](0008-draft-generation.md), preserving content review and
[organizer authority](0003-organizer-approvals.md). The channel-list refinement is
accepted in that record. The user subsequently accepted this decision and
authorized implementation. The local implementation uses configured destinations,
separate publication/recovery approvals, durable provider receipts, and scoped
social reporting. Delivery identity follows the remote target rather than its
editable key or label. Setup and recovery belong in the
[social publication guide](../integrations/social-publication.md).

Local source and the official provider documentation linked above were reviewed
on this date. Provider account permissions, installations, OAuth grants, uploads,
and live publication were not tested. Live acceptance checks remain outstanding; synthetic validation does not establish
account eligibility or permission to post.

[pinned-communications]: https://github.com/cloud-native-aixmarseille/meetup-event-automation/blob/5a80cd5013781ff071bea0dfda49044bc4071c5f/docs/integrations/communications.md
[slack-post]: https://docs.slack.dev/reference/methods/chat.postMessage/
[slack-limits]: https://docs.slack.dev/apis/web-api/rate-limits/
[slack-oauth]: https://docs.slack.dev/authentication/installing-with-oauth/
[linkedin-posts]: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api?view=li-lms-2026-10
[linkedin-images]: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/images-api?view=li-lms-2026-10
[linkedin-review]: https://learn.microsoft.com/en-us/linkedin/marketing/community-management-app-review?view=li-lms-2026-03
[linkedin-access]: https://learn.microsoft.com/en-us/linkedin/marketing/increasing-access?view=li-lms-2026-10
[linkedin-refresh]: https://learn.microsoft.com/en-us/linkedin/shared/authentication/programmatic-refresh-tokens
