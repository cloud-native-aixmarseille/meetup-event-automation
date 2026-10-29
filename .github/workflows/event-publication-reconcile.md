<!-- header:start -->

# GitHub Reusable Workflow: Event / Publication / Reconcile

<div align="center">
  <img src="../logo.svg" width="60px" align="center" alt="Event / Publication / Reconcile" />
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

Goal: Reconcile an event across its configured publication destinations.
Behavior: Prepare the required adapter runtimes and reconcile each destination
after its organizer approval, with updates serialized by the shared event lock.

### Permissions

- **`contents`**: `read`

<!-- overview:end -->
<!-- usage:start -->

## Usage

```yaml
name: Event / Publication / Reconcile
on:
  push:
    branches:
      - main
permissions: {}
jobs:
  event-publication-reconcile:
    uses: cloud-native-aixmarseille/meetup-event-automation/.github/workflows/event-publication-reconcile.yml@3c26f9786c6654480f2125d129e1c4c8eeeb030c # 3.0.0
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

      # JSON credentials for exactly the configured publication providers, including AI settings only when Meetup is configured.
      # This input is required.
      publication-credentials: ""
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

<!-- inputs:end -->
<!-- secrets:start -->

## Secrets

| **Secret**                    | **Description**                                                                                                          | **Required** |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------ |
| **`slack-token`**             | Slack bot token for approval requests and decision reactions.                                                            | **true**     |
| **`github-app-private-key`**  | GitHub App private key for the narrowly scoped consumer token.                                                           | **true**     |
| **`conference-hall-api-key`** | Read-only Conference Hall event API key.                                                                                 | **true**     |
| **`publication-credentials`** | JSON credentials for exactly the configured publication providers, including AI settings only when Meetup is configured. | **true**     |

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
