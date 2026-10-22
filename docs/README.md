# Documentation

These guides describe the current supported behavior. Use the authoritative
page for each topic below.

## Usage

- [Set up a repository](usage/setup.md): prerequisites, files, credentials, and
  workflow callers.
- [Organize a meetup](usage/organize-meetup.md): create an event, resolve
  diagnostics, track email completion, and complete follow-up.

## Reference

- [Configuration](reference/configuration.md): settings, fixed conventions, and
  labels.
- [Host and speaker referentials](reference/referentials.md): CSV columns,
  stable IDs, and issue-form updates.

## Integrations

- [Conference Hall](integrations/conference-hall.md)
- [Google Drive assets](integrations/assets.md)
- [OpenFeedback and Kutt](integrations/feedback.md)
- [Email and Slack](integrations/communications.md)
- [Meetup event publication](integrations/meetup-publication.md)

## Workflow contracts

| Workflow                                                                                              | Purpose                                                    |
| ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| [Create or update Meetup event](../.github/workflows/reconcile-meetup-event.md)                       | Create/update drafts and publish after organizer approval. |
| [Synchronize Conference Hall speakers](../.github/workflows/synchronize-conference-hall-speakers.md)  | Prepare a private catalog and form review PR.              |
| [Update meetup issue](../.github/workflows/update-meetup-issue.md)                                    | Process issue changes.                                     |
| [Check active meetup issues](../.github/workflows/check-active-meetup-issues.md)                      | Run the scheduled or manual audit.                         |
| [Update meetup issue form](../.github/workflows/update-meetup-issue-form.md)                          | Open a pull request with updated host and speaker choices. |
| [Check referentials and issue form](../.github/workflows/check-meetup-referentials-and-issue-form.md) | Validate consumer pull requests.                           |

## Action contracts

| Action                                                                                  | Purpose                                                                                |
| --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| [Create or update Meetup event](../actions/publication/reconcile-meetup/README.md)      | Create a draft or update the event described by a meetup issue.                        |
| [Reconcile event](../actions/event/reconcile/README.md)                                 | Validate and normalize one meetup issue.                                               |
| [List active events](../actions/event/list-active/README.md)                            | Select issues for an audit.                                                            |
| [Synchronize speakers](../actions/referential/sync-speakers/README.md)                  | Prepare a validated private speaker catalog from Conference Hall.                      |
| [Validate referentials](../actions/referential/validate/README.md)                      | Check host and speaker catalogs.                                                       |
| [Synchronize issue form](../actions/referential/sync-issue-form/README.md)              | Update the checked-out form choices.                                                   |
| [Reconcile assets](../actions/publication/reconcile-assets/README.md)                   | Prepare Drive folders, template copies and post-event PDFs.                            |
| [Reconcile feedback](../actions/publication/reconcile-feedback/README.md)               | Synchronize OpenFeedback events, talks and speakers, and update the shared short link. |
| [Reconcile organizer attention](../actions/communication/reconcile-attention/README.md) | Update durable status and bounded organizer reminders.                                 |
| [Reconcile communications](../actions/communication/reconcile/README.md)                | Plan or dispatch due email and Slack messages.                                         |

## Development

- [Development workflow](development/README.md)
- [Documentation rules](development/documentation.md)
- [Architecture](development/architecture.md)
- [Testing](development/testing.md)
- [Action reporting](development/reporting.md)
- [Localization](development/localization.md)
- [Agent instructions](../AGENTS.md)

## Architecture decisions

ADRs preserve decision history, including superseded decisions. Their status and
supersession links identify how decisions relate. Use the current guides above
for implemented behavior and contributor conventions.

- [ADR-0001: Centralize meetup event automation](adr/0001-centralize-meetup-event-automation.md)
- [ADR-0002: Runtime dependency injection](adr/0002-runtime-dependency-injection.md)
- [ADR-0003: Production code structure](adr/0003-production-code-structure.md)
- [ADR-0004: Localize generated messages](adr/0004-localize-generated-messages.md)
- [ADR-0005: Use one communication reconciliation path](adr/0005-single-communication-reconciliation-path.md)
- [ADR-0006: Match action inputs to operational behavior](adr/0006-explicit-reconciliation-behavior.md)
- [ADR-0007: Track automatic emails with completion checkboxes](adr/0007-automatic-communication-checklists.md)
- [ADR-0008: Request organizer confirmation for email batches](adr/0008-admin-confirmation-requests.md)
- [ADR-0009: Use one organizer role and an explicit organizer Slack channel](adr/0009-organizer-role-and-slack-channel.md)
- [ADR-0010: Approve email batches with request checkboxes](adr/0010-checkbox-organizer-approval.md)
- [ADR-0011: Finalize organizer decisions in place and acknowledge them on Slack](adr/0011-final-organizer-decisions.md)
- [ADR-0012: Synchronize OpenFeedback talks and speakers](adr/0012-synchronize-openfeedback-talks-and-speakers.md)
- [ADR-0012: Use Conference Hall as the source of truth for talks and speakers](adr/0012-conference-hall-talks-and-speakers.md)
- [ADR-0013: Reconcile actionable organizer alerts throughout the meetup lifecycle](adr/0013-actionable-organizer-alerts.md)
- [ADR-0014: Consolidate post-event follow-up](adr/0014-consolidated-post-event-follow-up.md)
- [ADR-0014: Populate and update managed placeholders in Drive template copies](adr/0014-reconcile-drive-template-placeholders.md)
- [ADR-0015: Render explicit participant, venue, and next-meetup fields](adr/0015-extend-asset-render-fields.md)
- [ADR-0016: Render the current host's public logo](adr/0016-render-host-logos.md)
- [ADR-0017: Require explicit action inputs and consumed outputs](adr/0017-explicit-action-interfaces.md)
- [ADR-0018: Remove invariant options and require operational output consumers](adr/0018-remove-invariant-action-options.md)
- [ADR-0019: Archive closed meetup issues](adr/0019-archive-closed-meetup-issues.md)
- [ADR-0020: Use one organizer checklist and visible proposal numbers](adr/0020-unified-organizer-checklist.md)
- [ADR-0021: Separate technical failures from organizer feedback](adr/0021-separate-technical-and-organizer-feedback.md)
- [ADR-0022: Inject stateless collaborators](adr/0022-inject-stateless-collaborators.md)
- [ADR-0023: Export a static PDF final asset from the slides](adr/0023-export-pdf-final-asset.md)

## Directory layout

```text
docs/
├── README.md
├── usage/
│   ├── setup.md
│   └── organize-meetup.md
├── reference/
│   ├── configuration.md
│   └── referentials.md
├── integrations/
│   ├── conference-hall.md
│   ├── assets.md
│   ├── meetup-publication.md
│   ├── feedback.md
│   └── communications.md
├── development/
│   ├── README.md
│   ├── documentation.md
│   ├── architecture.md
│   ├── testing.md
│   ├── reporting.md
│   └── localization.md
└── adr/
    ├── 0001-centralize-meetup-event-automation.md
    ├── 0002-runtime-dependency-injection.md
    ├── 0003-production-code-structure.md
    ├── 0004-localize-generated-messages.md
    ├── 0005-single-communication-reconciliation-path.md
    ├── 0006-explicit-reconciliation-behavior.md
    ├── 0007-automatic-communication-checklists.md
    ├── 0008-admin-confirmation-requests.md
    ├── 0009-organizer-role-and-slack-channel.md
    ├── 0010-checkbox-organizer-approval.md
    ├── 0011-final-organizer-decisions.md
    ├── 0012-synchronize-openfeedback-talks-and-speakers.md
    ├── 0012-conference-hall-talks-and-speakers.md
    ├── 0013-actionable-organizer-alerts.md
    ├── 0014-consolidated-post-event-follow-up.md
    ├── 0014-reconcile-drive-template-placeholders.md
    ├── 0015-extend-asset-render-fields.md
    ├── 0016-render-host-logos.md
    ├── 0017-explicit-action-interfaces.md
    ├── 0018-remove-invariant-action-options.md
    ├── 0019-archive-closed-meetup-issues.md
    ├── 0020-unified-organizer-checklist.md
    ├── 0021-separate-technical-and-organizer-feedback.md
    ├── 0022-inject-stateless-collaborators.md
    └── 0023-export-pdf-final-asset.md
```

Action references stay beside `action.yml`; workflow references stay beside
their workflow YAML. Each detailed topic has one guide linked from this index.
