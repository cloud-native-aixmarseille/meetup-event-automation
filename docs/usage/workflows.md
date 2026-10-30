# Choose a workflow

Public workflows follow the event journey. Reconcile one event after issue
changes, or audit active events on a schedule. Generation and publication are
explicit organizer operations. Lifecycle phases can overlap; they do not change
the event's occurrence status.

| Phase         | Workflow                                                                                                 | Purpose                                                                                                                                          |
| ------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Preparation   | [event-preparation-generate-drafts.yml](../../.github/workflows/event-preparation-generate-drafts.yml)   | Generate any combination of title, description and four cover candidates for review.                                                             |
| Publication   | [event-publication-reconcile.yml](../../.github/workflows/event-publication-reconcile.yml)               | Reconcile Meetup and OCGroups destinations and publish each after approval. See [publication setup](../integrations/event-publication.md).       |
| Promotion     | [event-promotion-generate-post.yml](../../.github/workflows/event-promotion-generate-post.yml)           | Draft an announcement, D-7 reminder or D0 reminder for a configured Slack channel or LinkedIn Page.                                              |
| Promotion     | [event-promotion-reconcile.yml](../../.github/workflows/event-promotion-reconcile.yml)                   | Publish due approved social posts for one event.                                                                                                 |
| Promotion     | [event-promotion-reconcile-active.yml](../../.github/workflows/event-promotion-reconcile-active.yml)     | Scan active events for approved social announcements and reminders.                                                                              |
| Promotion     | [event-promotion-recover.yml](../../.github/workflows/event-promotion-recover.yml)                       | Record an organizer-approved delivery recovery.                                                                                                  |
| Across phases | [event-reconcile.yml](../../.github/workflows/event-reconcile.yml)                                       | Refresh one event, prepare and review event copy, reconcile feedback and assets, evaluate due email and PDF export, then report organizer tasks. |
| Across phases | [event-reconcile-active.yml](../../.github/workflows/event-reconcile-active.yml)                         | List active issues and run reconciliation for each.                                                                                              |
| Referentials  | [referential-reconcile-speakers.yml](../../.github/workflows/referential-reconcile-speakers.yml)         | Prepare a speaker catalog and issue-form review PR.                                                                                              |
| Referentials  | [referential-check-catalog-and-form.yml](../../.github/workflows/referential-check-catalog-and-form.yml) | Validate catalogs and issue-form choices in a consumer PR.                                                                                       |
| Issue form    | [issue-form-reconcile.yml](../../.github/workflows/issue-form-reconcile.yml)                             | Open a PR with issue-form choices projected from current catalogs.                                                                               |

All entry points are reusable workflows. The consumer owns issue, schedule,
pull-request and manual triggers. Follow [repository setup](setup.md) for complete
callers, pin every call to the same published revision, and supply every declared
input and secret. One-event workflows require an explicit `issue-number`.
The active-event audit selects its issues.

One-event reconciliation covers preparation, event day and follow-up. Domain
policies choose the eligible email and whether presentation PDF export is due;
callers do not select a phase or force an operation early. Readiness, organizer
approval and source freshness still gate effects. The shared feedback link is
reconciled under its own repository-wide lock. Keep the scheduled audit enabled
to evaluate due work even when nobody edits an issue.

Event-day link selection opens the day before the event and includes event day.
Reconciliation outside that window does not force a redirect. See
[feedback behavior](../integrations/feedback.md) for target selection and recovery.

Routine reconciliation prepares title, description, and four cover proposals
automatically, reusing unchanged drafts and approvals. Explicit preparation can
select individual targets; social post generation uses the promotion workflow. Social dispatch uses a separate
[publication approval and workflow](../integrations/social-publication.md). See
[content generation and review](../integrations/content.md) for targets, timing,
attachments and approvals.

Files beginning with `__` implement CI, repository maintenance or shared workflow
steps. Consumers call the public entry points above. Action paths remain scoped
by responsibility, independently of lifecycle grouping; see
[architecture](../development/architecture.md#action-and-workflow-ownership).
