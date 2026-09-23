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
      # Required API key for the owner of the existing Kutt feedback link.
      kutt-api-key: ""

      # Optional Google service-account JSON for Drive asset reconciliation. Omission keeps asset management manual.
      google-credentials: ""

      # PEM-encoded private key for the GitHub App identified by the github-app-id input. Used to mint a narrowly scoped installation token.
      # This input is required.
      github-app-private-key: ""

      # Optional token used to dispatch approved email communications to the configured mailings repository. When omitted, mail intents remain planned but are not sent.
      mailings-token: ""

      # Optional Slack bot token used for approved notifications. When omitted, Slack delivery is skipped safely.
      slack-token: ""
    with:
      # Required API ID of the existing Kutt feedback link.
      kutt-link-id: ""

      # GitHub App ID used to mint the narrowly scoped installation token for meetup automation.
      # This input is required.
      github-app-id: ""

      # Optional Slack channel ID used for approved notifications. When omitted, Slack delivery is skipped safely.
      slack-channel-id: ""
```

<!-- usage:end -->
<!-- inputs:start -->

## Inputs

| Name                                     | Description                                                                                                | Required | Default |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------- | -------- | ------- |
| `github-app-id`                          | GitHub App ID used to mint the narrowly scoped installation token for meetup automation.                   | true     | —       |
| `slack-channel-id`                       | Optional Slack channel ID used for approved notifications. When omitted, Slack delivery is skipped safely. | false    | —       |
| `google-drive-meetup-folder-id`          | Optional Google Drive folder ID of the parent meetup folder used for asset reconciliation.                 | false    | —       |
| `google-drive-meetup-template-folder-id` | Optional Google Drive folder ID of the template folder used for asset reconciliation.                      | false    | —       |
| `kutt-link-id`                           | Existing Kutt feedback link API ID.                                                                        | true     | —       |

<!-- inputs:end -->
<!-- secrets:start -->

## Secrets

| Name                     | Description                                                                                                                                                      | Required | Default |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------- |
| `kutt-api-key`           | API key for the owner of the existing Kutt feedback link.                                                                                                        | true     | —       |
| `google-credentials`     | Optional Google service-account JSON for Drive asset reconciliation. Omission keeps asset management manual.                                                     | false    | —       |
| `github-app-private-key` | PEM-encoded private key for the GitHub App identified by the github-app-id input. Used to mint a narrowly scoped installation token.                             | true     | —       |
| `mailings-token`         | Optional token used to dispatch approved email communications to the configured mailings repository. When omitted, mail intents remain planned but are not sent. | false    | —       |
| `slack-token`            | Optional Slack bot token used for approved notifications. When omitted, Slack delivery is skipped safely.                                                        | false    | —       |

<!-- secrets:end -->
<!-- outputs:start -->

## Outputs

| Output          | Description                                                                     |
| --------------- | ------------------------------------------------------------------------------- |
| `issue-numbers` | JSON array of meetup issue numbers selected for audit during the listing phase. |

<!-- outputs:end -->
<!-- examples:start -->

See [feedback setup and retry behavior](../../docs/publication-feedback.md) for the required Kutt configuration.

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
