<!-- header:start -->

# GitHub Reusable Workflow: Event / Promotion / Reconcile

<div align="center">
  <img src="../logo.svg" width="60px" align="center" alt="Event / Promotion / Reconcile" />
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

Goal: Publish approved announcements and reminders to configured destinations.
Behavior: Recheck exact publication authority, due times and durable delivery
records, then report each destination under the event lock.

### Permissions

- **`contents`**: `read`

<!-- overview:end -->
<!-- usage:start -->

## Usage

```yaml
name: Event / Promotion / Reconcile
on:
  push:
    branches:
      - main
permissions: {}
jobs:
  event-promotion-reconcile:
    uses: cloud-native-aixmarseille/meetup-event-automation/.github/workflows/event-promotion-reconcile.yml@5a80cd5013781ff071bea0dfda49044bc4071c5f # 2.3.2
    permissions:
      contents: read
    secrets:
      # Read-only Conference Hall event API key.
      # This input is required.
      conference-hall-api-key: ""

      # Slack bot token for organizer review requests and decision reactions.
      # This input is required.
      slack-token: ""

      # JSON tokens keyed by configured Slack workspace, plus LinkedIn access and Google media credentials when enabled.
      # This input is required.
      social-credentials: ""

      # GitHub App private key.
      # This input is required.
      github-app-private-key: ""
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

      # Meetup issue number.
      # This input is required.
      issue-number: 0

      # Conference Hall CFP slug for live linked profiles and selected proposals.
      # This input is required.
      conference-hall-event: ""

      # Internal organizer channel receiving content reviews.
      # This input is required.
      slack-organizer-channel-id: ""

      # GitHub App client ID for the consumer repository.
      # This input is required.
      github-app-client-id: ""
```

<!-- usage:end -->
<!-- inputs:start -->

## Inputs

### Workflow Call Inputs

| **Input**                          | **Description**                                                                                                                    | **Required** | **Type**   | **Default** |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------ | ---------- | ----------- |
| **`meetup-event-url-prefix`**      | HTTPS event URL prefix for the authorized Meetup group, ending in /events/.                                                        | **true**     | **string** | -           |
| **`community-event-url-prefixes`** | JSON array of nonempty HTTPS prefixes accepted for community event URLs.                                                           | **true**     | **string** | -           |
| **`asset-folder-url-prefix`**      | HTTPS prefix accepted for event asset folder URLs.                                                                                 | **true**     | **string** | -           |
| **`locale`**                       | Language for generated reports and guidance (en or fr). Regional variants are supported; unsupported locales fall back to English. | **true**     | **string** | -           |
| **`issue-number`**                 | Meetup issue number.                                                                                                               | **true**     | **number** | -           |
| **`conference-hall-event`**        | Conference Hall CFP slug for live linked profiles and selected proposals.                                                          | **true**     | **string** | -           |
| **`slack-organizer-channel-id`**   | Internal organizer channel receiving content reviews.                                                                              | **true**     | **string** | -           |
| **`github-app-client-id`**         | GitHub App client ID for the consumer repository.                                                                                  | **true**     | **string** | -           |

<!-- inputs:end -->
<!-- secrets:start -->

## Secrets

| **Secret**                    | **Description**                                                                                                  | **Required** |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------ |
| **`conference-hall-api-key`** | Read-only Conference Hall event API key.                                                                         | **true**     |
| **`slack-token`**             | Slack bot token for organizer review requests and decision reactions.                                            | **true**     |
| **`social-credentials`**      | JSON tokens keyed by configured Slack workspace, plus LinkedIn access and Google media credentials when enabled. | **true**     |
| **`github-app-private-key`**  | GitHub App private key.                                                                                          | **true**     |

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
