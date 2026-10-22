<!-- header:start -->

# GitHub Reusable Workflow: Reconcile event publication

<div align="center">
  <img src="../logo.svg" width="60px" align="center" alt="Reconcile event publication" />
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
<!-- usage:start -->

## Usage

```yaml
name: Reconcile event publication
on:
  push:
    branches:
      - main
permissions: {}
jobs:
  reconcile-event-publication:
    uses: cloud-native-aixmarseille/meetup-event-automation/.github/workflows/reconcile-event-publication.yml@5a80cd5013781ff071bea0dfda49044bc4071c5f # 2.3.2
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
