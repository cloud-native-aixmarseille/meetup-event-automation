<!-- header:start -->

# GitHub Reusable Workflow: Create or update Meetup event

<div align="center">
  <img src="../logo.svg" width="60px" align="center" alt="Create or update Meetup event" />
</div>

---

<!-- header:end -->
<!-- badges:start -->

[![Release](https://img.shields.io/github/v/release/cloud-native-aixmarseille/meetup-event-automation)](https://github.com/cloud-native-aixmarseille/meetup-event-automation/releases)
[![License](https://img.shields.io/github/license/cloud-native-aixmarseille/meetup-event-automation)](http://choosealicense.com/licenses/mit/)
[![Stars](https://img.shields.io/github/stars/cloud-native-aixmarseille/meetup-event-automation?style=social)](https://img.shields.io/github/stars/cloud-native-aixmarseille/meetup-event-automation?style=social)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/cloud-native-aixmarseille/meetup-event-automation/blob/main/CONTRIBUTING.md)

<!-- badges:end -->
<!-- overview:start -->

## Overview

### Permissions

- **`contents`**: `read`

<!-- overview:end -->

## Publication behavior

Reusable workflow: [reconcile-meetup-event.yml](reconcile-meetup-event.yml).

Creates a draft or updates an existing event from a consumer meetup issue.
Requests organizer approval through an issue comment and Slack, then publishes
approved drafts automatically. The issue links to both
drafts and published events; **Meetup event published** under **Communication**
records the verified status. The authoritative setup and recovery guide is [Meetup publication](../../docs/integrations/meetup-publication.md).

All inputs and secrets are required; there are no defaults or workflow outputs.
AI settings follow the shared [AI configuration contract](../../docs/reference/configuration.md#ai-configuration).
Replace `<FULL_COMMIT_SHA>` in the usage template with a published revision that
includes this workflow, and supply your repository's input values and secrets.

<!-- usage:start -->

## Usage

```yaml
name: Create or update Meetup event
on:
  push:
    branches:
      - main
permissions: {}
jobs:
  reconcile-meetup-event:
    uses: cloud-native-aixmarseille/meetup-event-automation/.github/workflows/reconcile-meetup-event.yml@5a80cd5013781ff071bea0dfda49044bc4071c5f # 2.3.2
    permissions:
      contents: read
    secrets:
      # Slack bot token for approval requests and decision reactions.
      # This input is required.
      slack-token: ""

      # GitHub App private key for the narrowly scoped consumer token.
      # This input is required.
      github-app-private-key: ""

      # Read-only Conference Hall event API key.
      # This input is required.
      conference-hall-api-key: ""

      # Email of the authorized Meetup organizer account.
      # This input is required.
      meetup-email: ""

      # Password of the authorized Meetup organizer account.
      # This input is required.
      meetup-password: ""

      # API key for the selected AI provider.
      # This input is required.
      ai-api-key: ""
    with:
      # HTTPS event URL prefix for the authorized Meetup group, ending in /events/.
      # This input is required.
      meetup-event-url-prefix: ""

      # JSON array of nonempty HTTPS prefixes accepted for community event URLs.
      # This input is required.
      community-event-url-prefixes: ""

      # HTTPS prefix accepted for event asset folder URLs.
      # This input is required.
      asset-folder-url-prefix: ""

      # Organizer Slack channel receiving publication approval requests.
      # This input is required.
      slack-organizer-channel-id: ""

      # Meetup source issue number.
      # This input is required.
      issue-number: 0

      # GitHub App client ID for the consumer repository.
      # This input is required.
      github-app-client-id: ""

      # Conference Hall CFP slug for the current event agenda.
      # This input is required.
      conference-hall-event: ""

      # Language for the publication report (en or fr).
      # This input is required.
      locale: ""

      # AI provider identifier (gemini).
      # This input is required.
      ai-provider: ""

      # Model identifier for the selected AI provider.
      # This input is required.
      ai-model: ""
```

<!-- usage:end -->
<!-- inputs:start -->

## Inputs

### Workflow Call Inputs

| **Input**                          | **Description**                                                             | **Required** | **Type**   | **Default** |
| ---------------------------------- | --------------------------------------------------------------------------- | ------------ | ---------- | ----------- |
| **`meetup-event-url-prefix`**      | HTTPS event URL prefix for the authorized Meetup group, ending in /events/. | **true**     | **string** | -           |
| **`community-event-url-prefixes`** | JSON array of nonempty HTTPS prefixes accepted for community event URLs.    | **true**     | **string** | -           |
| **`asset-folder-url-prefix`**      | HTTPS prefix accepted for event asset folder URLs.                          | **true**     | **string** | -           |
| **`slack-organizer-channel-id`**   | Organizer Slack channel receiving publication approval requests.            | **true**     | **string** | -           |
| **`issue-number`**                 | Meetup source issue number.                                                 | **true**     | **number** | -           |
| **`github-app-client-id`**         | GitHub App client ID for the consumer repository.                           | **true**     | **string** | -           |
| **`conference-hall-event`**        | Conference Hall CFP slug for the current event agenda.                      | **true**     | **string** | -           |
| **`locale`**                       | Language for the publication report (en or fr).                             | **true**     | **string** | -           |
| **`ai-provider`**                  | AI provider identifier (gemini).                                            | **true**     | **string** | -           |
| **`ai-model`**                     | Model identifier for the selected AI provider.                              | **true**     | **string** | -           |

<!-- inputs:end -->
<!-- secrets:start -->

## Secrets

| **Secret**                    | **Description**                                                | **Required** |
| ----------------------------- | -------------------------------------------------------------- | ------------ |
| **`slack-token`**             | Slack bot token for approval requests and decision reactions.  | **true**     |
| **`github-app-private-key`**  | GitHub App private key for the narrowly scoped consumer token. | **true**     |
| **`conference-hall-api-key`** | Read-only Conference Hall event API key.                       | **true**     |
| **`meetup-email`**            | Email of the authorized Meetup organizer account.              | **true**     |
| **`meetup-password`**         | Password of the authorized Meetup organizer account.           | **true**     |
| **`ai-api-key`**              | API key for the selected AI provider.                          | **true**     |

<!-- secrets:end -->
<!-- outputs:start -->
<!-- outputs:end -->

## Runtime and permissions

The workflow checks out the consumer and loads automation code from its own
pinned revision. It installs lockfile dependencies, Chromium, Python 3.14, and
the pinned solver dependencies. It grants `contents: read` to the workflow and
mints a consumer-scoped App token with contents read and issues write.

The job holds `meetup-event-REPOSITORY_ID-ISSUE_NUMBER`, the same lock used by other
event writers, with cancellation disabled and a 15-minute timeout. Meetup and
AI credentials reach only the publication step. The workflow uploads no
browser state or artifacts. Callers subscribe to event issue changes and `issue_comment: [edited]` to
resume approved publication automatically, and pin a published full commit SHA.
The reusable workflow filters comment events to human edits of bot publication
approval comments; the approval adapter verifies the author and exact content.

<!-- examples:start -->
<!-- examples:end -->
<!-- contributing:start -->

## Contributing

Contributions are welcome! Please see the [contributing guidelines](https://github.com/cloud-native-aixmarseille/meetup-event-automation/blob/main/CONTRIBUTING.md) for more details.

<!-- contributing:end -->
<!-- security:start -->
<!-- security:end -->
<!-- license:start -->

## License

This project is licensed under the MIT License.

SPDX-License-Identifier: MIT

Copyright © 2026 cloud-native-aixmarseille

For more details, see the [license](http://choosealicense.com/licenses/mit/).

<!-- license:end -->
<!-- generated:start -->

---

This documentation was automatically generated by [CI Dokumentor](https://github.com/hoverkraft-tech/ci-dokumentor).

<!-- generated:end -->
