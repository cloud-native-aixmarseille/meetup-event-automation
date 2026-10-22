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

These references are generated from the workflow manifests. Use the integration
guides above for setup, behavior, and recovery.

| Workflow                                                                                              | Purpose                                                                        |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| [Reconcile meetup](../.github/workflows/reconcile-meetup.yml)                                         | Compose event, feedback, assets, email and organizer operations for one issue. |
| [Reconcile shared feedback link](../.github/workflows/reconcile-feedback-link.yml)                    | Select the active event and serialize shared-link updates.                     |
| [Reconcile event publication](../.github/workflows/reconcile-event-publication.md)                    | Create/update drafts and publish after organizer approval.                     |
| [Reconcile speakers](../.github/workflows/reconcile-speakers.md)                                      | Prepare a private catalog and form review PR.                                  |
| [Update meetup issue](../.github/workflows/update-meetup-issue.md)                                    | Process issue changes through the common pipeline.                             |
| [Check active meetup issues](../.github/workflows/check-active-meetup-issues.md)                      | List active issues and run the common pipeline for each.                       |
| [Update meetup issue form](../.github/workflows/update-meetup-issue-form.md)                          | Open a pull request with updated host and speaker choices.                     |
| [Check referentials and issue form](../.github/workflows/check-meetup-referentials-and-issue-form.md) | Validate consumer pull requests.                                               |

## Action contracts

Each action owns one scope. YAML manifests define their interfaces; the release
workflow generates adjacent readme references.

| Action                                                                                 | Purpose                                                        |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| [event/list-active](../actions/event/list-active/action.yml)                           | Select open meetup issues for an audit.                        |
| [event/reconcile](../actions/event/reconcile/action.yml)                               | Validate and normalize one meetup issue.                       |
| [referential/validate](../actions/referential/validate/action.yml)                     | Validate host and speaker catalogs.                            |
| [referential/reconcile-speakers](../actions/referential/reconcile-speakers/action.yml) | Reconcile the private speaker catalog and allocation state.    |
| [issue-form/reconcile](../actions/issue-form/reconcile/action.yml)                     | Check or update form choices from the local catalog.           |
| [assets/reconcile-documents](../actions/assets/reconcile-documents/action.yml)         | Reconcile Drive folders, template copies and document content. |
| [assets/reconcile-slides-pdf](../actions/assets/reconcile-slides-pdf/action.yml)       | Export and place the post-event presentation PDF.              |
| [feedback/reconcile-event](../actions/feedback/reconcile-event/action.yml)             | Reconcile one OpenFeedback event, its agenda and issue URL.    |
| [feedback/reconcile-short-link](../actions/feedback/reconcile-short-link/action.yml)   | Select the current meetup and update the shared Kutt target.   |
| [publication/reconcile-event](../actions/publication/reconcile-event/action.yml)       | Reconcile a Meetup draft or approved publication.              |
| [communication/reconcile-email](../actions/communication/reconcile-email/action.yml)   | Plan and dispatch approved email batches.                      |
| [organizer/reconcile-checklist](../actions/organizer/reconcile-checklist/action.yml)   | Merge complete stage evidence into the organizer checklist.    |
| [organizer/reconcile-attention](../actions/organizer/reconcile-attention/action.yml)   | Reconcile durable attention state and bounded Slack reminders. |

## Development

- [Contributing](../CONTRIBUTING.md)
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
- [ADR-0024: Scope actions and compose workflows](adr/0024-scoped-actions-and-workflow-composition.md)

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
    ├── 0023-export-pdf-final-asset.md
    └── 0024-scoped-actions-and-workflow-composition.md
```

Action references stay beside `action.yml`; workflow references stay beside
their workflow YAML. Each detailed topic has one guide linked from this index.
