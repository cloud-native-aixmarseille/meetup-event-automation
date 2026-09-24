<!-- header:start -->

# GitHub Reusable Workflow: Check active meetup issues

<!-- header:end -->
<!-- badges:start -->

[![Release](https://img.shields.io/github/v/release/cloud-native-aixmarseille/meetup-event-automation)](https://github.com/cloud-native-aixmarseille/meetup-event-automation/releases)
[![Stars](https://img.shields.io/github/stars/cloud-native-aixmarseille/meetup-event-automation?style=social)](https://img.shields.io/github/stars/cloud-native-aixmarseille/meetup-event-automation?style=social)

<!-- badges:end -->
<!-- overview:start -->

## Overview

Reusable workflow that checks active meetup issues, evaluates their current
state, and processes due communications under the shared per-event lock.

### Permissions

- **`contents`**: `read`
- **`issues`**: `read`

<!-- overview:end -->
<!-- usage:start -->

## Usage

```yaml
name: Check active meetup issues
on:
  push:
    branches:
      - main
permissions: {}
jobs:
  check-active-meetup-issues:
    uses: cloud-native-aixmarseille/meetup-event-automation/.github/workflows/check-active-meetup-issues.yml@0123456789abcdef0123456789abcdef01234567 # replace with a release SHA containing asset reconciliation
    permissions:
      contents: read
      issues: read
    secrets:
      # Google service-account JSON for Drive asset reconciliation.
      # This input is required.
      google-credentials: ""

      # PEM-encoded private key for the GitHub App identified by the github-app-id input. Used to mint a narrowly scoped installation token.
      # This input is required.
      github-app-private-key: ""

      # Token used to dispatch approved email communications to the configured mailings repository.
      # This input is required.
      mailings-token: ""

      # Slack bot token used for approved notifications.
      # This input is required.
      slack-token: ""
    with:
      # Optional language for generated text.
      locale: en
      # GitHub App ID used to mint the narrowly scoped installation token for meetup automation.
      # This input is required.
      github-app-id: ""

      # Slack channel ID used for approved notifications.
      # This input is required.
      slack-channel-id: ""

      # Google Drive folder ID of the parent meetup folder used for asset reconciliation.
      # This input is required.
      google-drive-meetup-folder-id: ""

      # Google Drive folder ID of the template folder used for asset reconciliation.
      # This input is required.
      google-drive-meetup-template-folder-id: ""
```

<!-- usage:end -->
<!-- inputs:start -->

## Inputs

### Workflow Call Inputs

| **Input**                                    | **Description**                                                                                                                    | **Required** | **Type**   | **Default** |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------ | ---------- | ----------- |
| **`locale`**                                 | Language for generated reports and guidance (en or fr). Regional variants are supported; unsupported locales fall back to English. | **false**    | **string** | `en`        |
| **`github-app-id`**                          | GitHub App ID used to mint the narrowly scoped installation token for meetup automation.                                           | **true**     | **string** | -           |
| **`slack-channel-id`**                       | Slack channel ID used for approved notifications.                                                                                  | **true**     | **string** | -           |
| **`google-drive-meetup-folder-id`**          | Google Drive folder ID of the parent meetup folder used for asset reconciliation.                                                  | **true**     | **string** | -           |
| **`google-drive-meetup-template-folder-id`** | Google Drive folder ID of the template folder used for asset reconciliation.                                                       | **true**     | **string** | -           |

<!-- inputs:end -->
<!-- secrets:start -->

## Secrets

| **Secret**                   | **Description**                                                                                                                      | **Required** |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------ |
| **`google-credentials`**     | Google service-account JSON for Drive asset reconciliation.                                                                          | **true**     |
| **`github-app-private-key`** | PEM-encoded private key for the GitHub App identified by the github-app-id input. Used to mint a narrowly scoped installation token. | **true**     |
| **`mailings-token`**         | Token used to dispatch approved email communications to the configured mailings repository.                                          | **true**     |
| **`slack-token`**            | Slack bot token used for approved notifications.                                                                                     | **true**     |

<!-- secrets:end -->
<!-- outputs:start -->

## Outputs

| **Output**          | **Description**                                                                 |
| ------------------- | ------------------------------------------------------------------------------- |
| **`issue-numbers`** | JSON array of meetup issue numbers selected for audit during the listing phase. |

<!-- outputs:end -->
<!-- examples:start -->
<!-- examples:end -->
<!-- contributing:start -->
<!-- contributing:end -->
<!-- security:start -->
<!-- security:end -->
<!-- license:start -->
<!-- license:end -->
<!-- generated:start -->

---

This documentation was automatically generated by [CI Dokumentor](https://github.com/hoverkraft-tech/ci-dokumentor).

<!-- generated:end -->
