<!-- header:start -->

# GitHub Reusable Workflow: Event / Reconcile active events

<div align="center">
  <img src="../logo.svg" width="60px" align="center" alt="Event / Reconcile active events" />
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

Goal: Reconcile all active meetup issues without requiring individual edits.
Behavior: List active events and call event reconciliation for up to four issues
in parallel, allowing other events to finish when one fails.

### Permissions

- **`contents`**: `read`
- **`issues`**: `read`

<!-- overview:end -->
<!-- usage:start -->

## Usage

```yaml
name: Event / Reconcile active events
on:
  push:
    branches:
      - main
permissions: {}
jobs:
  event-reconcile-active:
    uses: cloud-native-aixmarseille/meetup-event-automation/.github/workflows/event-reconcile-active.yml@4f7ea7fba73f31503043176bbe12d8c7170150ab # 6.0.0
    permissions:
      contents: read
      issues: read
    secrets:
      # API key for automatic event copy generation.
      # This input is required.
      ai-api-key: ""

      # OpenFeedback organization API key (`oforg_`) used to create and update events.
      # This input is required.
      openfeedback-api-key: ""

      # API key for the owner of the existing Kutt feedback link.
      # This input is required.
      kutt-api-key: ""

      # Google service-account JSON for Drive asset reconciliation.
      # This input is required.
      google-credentials: ""

      # PEM-encoded private key for the GitHub App identified by the github-app-client-id input. Used to mint a narrowly scoped installation token.
      # This input is required.
      github-app-private-key: ""

      # Slack bot token with chat:write and reactions:write for organizer notifications and decision reactions.
      # This input is required.
      slack-token: ""

      # Read-only Conference Hall event API key.
      # This input is required.
      conference-hall-api-key: ""
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

      # Language for generated reports and guidance (en or fr). Regional variants are supported; unsupported locales fall back to English.
      # This input is required.
      locale: ""

      # GitHub App client ID used to mint the narrowly scoped installation token for meetup automation.
      # This input is required.
      github-app-client-id: ""

      # Internal meetup organizer Slack channel for approval requests and actionable organizer reminders. Public announcement channels are separate.
      # This input is required.
      slack-organizer-channel-id: ""

      # Google Drive folder ID of the parent asset folder used for asset reconciliation.
      # This input is required.
      google-drive-folder-id: ""

      # Public Drive root ID containing slides and tmp-covers subfolders.
      # This input is required.
      google-drive-public-folder-id: ""

      # Google Drive folder ID of the template folder used for asset reconciliation.
      # This input is required.
      google-drive-template-folder-id: ""

      # HTTPS base URL of the Kutt instance, without /api/v2. No default.
      # This input is required.
      kutt-base-url: ""

      # Existing Kutt feedback link API ID.
      # This input is required.
      kutt-link-id: ""

      # Conference Hall CFP slug for live linked profiles and selected proposals.
      # This input is required.
      conference-hall-event: ""

      # AI provider identifier for automatic event copy proposals (gemini).
      # This input is required.
      ai-provider: ""

      # Structured-text model for automatic title and description proposals.
      # This input is required.
      ai-model: ""
```

<!-- usage:end -->
<!-- inputs:start -->

## Inputs

### Workflow Call Inputs

| **Input**                             | **Description**                                                                                                                              | **Required** | **Type**   | **Default** |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ---------- | ----------- |
| **`meetup-event-url-prefix`**         | HTTPS event URL prefix for the authorized Meetup group, ending in /events/.                                                                  | **true**     | **string** | -           |
| **`community-event-url-prefixes`**    | JSON array of nonempty HTTPS prefixes accepted for community event URLs.                                                                     | **true**     | **string** | -           |
| **`asset-folder-url-prefix`**         | HTTPS prefix accepted for event asset folder URLs.                                                                                           | **true**     | **string** | -           |
| **`locale`**                          | Language for generated reports and guidance (en or fr). Regional variants are supported; unsupported locales fall back to English.           | **true**     | **string** | -           |
| **`github-app-client-id`**            | GitHub App client ID used to mint the narrowly scoped installation token for meetup automation.                                              | **true**     | **string** | -           |
| **`slack-organizer-channel-id`**      | Internal meetup organizer Slack channel for approval requests and actionable organizer reminders. Public announcement channels are separate. | **true**     | **string** | -           |
| **`google-drive-folder-id`**          | Google Drive folder ID of the parent asset folder used for asset reconciliation.                                                             | **true**     | **string** | -           |
| **`google-drive-public-folder-id`**   | Public Drive root ID containing slides and tmp-covers subfolders.                                                                            | **true**     | **string** | -           |
| **`google-drive-template-folder-id`** | Google Drive folder ID of the template folder used for asset reconciliation.                                                                 | **true**     | **string** | -           |
| **`kutt-base-url`**                   | HTTPS base URL of the Kutt instance, without /api/v2. No default.                                                                            | **true**     | **string** | -           |
| **`kutt-link-id`**                    | Existing Kutt feedback link API ID.                                                                                                          | **true**     | **string** | -           |
| **`conference-hall-event`**           | Conference Hall CFP slug for live linked profiles and selected proposals.                                                                    | **true**     | **string** | -           |
| **`ai-provider`**                     | AI provider identifier for automatic event copy proposals (gemini).                                                                          | **true**     | **string** | -           |
| **`ai-model`**                        | Structured-text model for automatic title and description proposals.                                                                         | **true**     | **string** | -           |

<!-- inputs:end -->
<!-- secrets:start -->

## Secrets

| **Secret**                    | **Description**                                                                                                                             | **Required** |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| **`ai-api-key`**              | API key for automatic event copy generation.                                                                                                | **true**     |
| **`openfeedback-api-key`**    | OpenFeedback organization API key (`oforg_`) used to create and update events.                                                              | **true**     |
| **`kutt-api-key`**            | API key for the owner of the existing Kutt feedback link.                                                                                   | **true**     |
| **`google-credentials`**      | Google service-account JSON for Drive asset reconciliation.                                                                                 | **true**     |
| **`github-app-private-key`**  | PEM-encoded private key for the GitHub App identified by the github-app-client-id input. Used to mint a narrowly scoped installation token. | **true**     |
| **`slack-token`**             | Slack bot token with chat:write and reactions:write for organizer notifications and decision reactions.                                     | **true**     |
| **`conference-hall-api-key`** | Read-only Conference Hall event API key.                                                                                                    | **true**     |

<!-- secrets:end -->
<!-- outputs:start -->
<!-- outputs:end -->
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
