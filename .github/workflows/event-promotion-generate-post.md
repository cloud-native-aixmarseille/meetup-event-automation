<!-- header:start -->

# GitHub Reusable Workflow: Event / Promotion / Generate post

<div align="center">
  <img src="../logo.svg" width="60px" align="center" alt="Event / Promotion / Generate post" />
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

Goal: Prepare a public announcement or reminder for one destination.
Behavior: Generate a Slack or LinkedIn announcement, D-7 reminder or D0 reminder,
then review and report it under the event lock. Organizers publish approved posts.

### Permissions

- **`contents`**: `read`

<!-- overview:end -->
<!-- usage:start -->

## Usage

```yaml
name: Event / Promotion / Generate post
on:
  push:
    branches:
      - main
permissions: {}
jobs:
  event-promotion-generate-post:
    uses: cloud-native-aixmarseille/meetup-event-automation/.github/workflows/event-promotion-generate-post.yml@5a80cd5013781ff071bea0dfda49044bc4071c5f # 2.3.2
    permissions:
      contents: read
    secrets:
      # Read-only Conference Hall event API key.
      # This input is required.
      conference-hall-api-key: ""

      # Google service-account JSON for immutable public content media.
      # This input is required.
      google-credentials: ""

      # Slack bot token for organizer review requests and decision reactions.
      # This input is required.
      slack-token: ""

      # API key for the selected AI provider.
      # This input is required.
      ai-api-key: ""

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

      # Public Drive folder for content images, shared with anyone as reader.
      # This input is required.
      google-drive-public-folder-id: ""

      # Internal organizer channel receiving content reviews.
      # This input is required.
      slack-organizer-channel-id: ""

      # Draft target: configured destination key followed by :announcement, :d7, or :d0.
      # This input is required.
      target: ""

      # AI provider identifier (gemini).
      # This input is required.
      ai-provider: ""

      # Supported structured-text model.
      # This input is required.
      ai-model: ""

      # GitHub App client ID for the consumer repository.
      # This input is required.
      github-app-client-id: ""
```

<!-- usage:end -->
<!-- inputs:start -->

## Inputs

### Workflow Call Inputs

| **Input**                           | **Description**                                                                                                                    | **Required** | **Type**   | **Default** |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------ | ---------- | ----------- |
| **`meetup-event-url-prefix`**       | HTTPS event URL prefix for the authorized Meetup group, ending in /events/.                                                        | **true**     | **string** | -           |
| **`community-event-url-prefixes`**  | JSON array of nonempty HTTPS prefixes accepted for community event URLs.                                                           | **true**     | **string** | -           |
| **`asset-folder-url-prefix`**       | HTTPS prefix accepted for event asset folder URLs.                                                                                 | **true**     | **string** | -           |
| **`locale`**                        | Language for generated reports and guidance (en or fr). Regional variants are supported; unsupported locales fall back to English. | **true**     | **string** | -           |
| **`issue-number`**                  | Meetup issue number.                                                                                                               | **true**     | **number** | -           |
| **`conference-hall-event`**         | Conference Hall CFP slug for live linked profiles and selected proposals.                                                          | **true**     | **string** | -           |
| **`google-drive-public-folder-id`** | Public Drive folder for content images, shared with anyone as reader.                                                              | **true**     | **string** | -           |
| **`slack-organizer-channel-id`**    | Internal organizer channel receiving content reviews.                                                                              | **true**     | **string** | -           |
| **`target`**                        | Draft target: configured destination key followed by :announcement, :d7, or :d0.                                                   | **true**     | **string** | -           |
| **`ai-provider`**                   | AI provider identifier (gemini).                                                                                                   | **true**     | **string** | -           |
| **`ai-model`**                      | Supported structured-text model.                                                                                                   | **true**     | **string** | -           |
| **`github-app-client-id`**          | GitHub App client ID for the consumer repository.                                                                                  | **true**     | **string** | -           |

<!-- inputs:end -->
<!-- secrets:start -->

## Secrets

| **Secret**                    | **Description**                                                       | **Required** |
| ----------------------------- | --------------------------------------------------------------------- | ------------ |
| **`conference-hall-api-key`** | Read-only Conference Hall event API key.                              | **true**     |
| **`google-credentials`**      | Google service-account JSON for immutable public content media.       | **true**     |
| **`slack-token`**             | Slack bot token for organizer review requests and decision reactions. | **true**     |
| **`ai-api-key`**              | API key for the selected AI provider.                                 | **true**     |
| **`github-app-private-key`**  | GitHub App private key.                                               | **true**     |

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
