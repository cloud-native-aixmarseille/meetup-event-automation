<!-- header:start -->

# GitHub Reusable Workflow: Event / Promotion / Recover

<div align="center">
  <img src="../logo.svg" width="60px" align="center" alt="Event / Promotion / Recover" />
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

Goal: Resolve an uncertain social delivery without sending another post.
Behavior: Create or finalize a separate organizer recovery decision and preserve
the delivery history under the same event lock as publication.

### Permissions

- **`contents`**: `read`

<!-- overview:end -->
<!-- usage:start -->

## Usage

```yaml
name: Event / Promotion / Recover
on:
  push:
    branches:
      - main
permissions: {}
jobs:
  event-promotion-recover:
    uses: cloud-native-aixmarseille/meetup-event-automation/.github/workflows/event-promotion-recover.yml@5a80cd5013781ff071bea0dfda49044bc4071c5f # 2.3.2
    permissions:
      contents: read
    secrets:
      # GitHub App private key.
      # This input is required.
      github-app-private-key: ""

      # Slack token for organizer recovery notifications and decision reactions.
      # This input is required.
      slack-token: ""
    with:
      # GitHub App client ID for the consumer repository.
      # This input is required.
      github-app-client-id: ""

      # Meetup source issue number.
      # This input is required.
      issue-number: 0

      # SHA-256 intent identity in the recorded social delivery journal.
      # This input is required.
      intent-id: ""

      # Verified outcome, published or not-published.
      # This input is required.
      outcome: ""

      # Provider post URL for published, or GitHub organizer evidence comment URL for not-published.
      # This input is required.
      reference: ""

      # Internal organizer channel receiving recovery approval requests.
      # This input is required.
      slack-organizer-channel-id: ""

      # Language for the recovery report (en or fr).
      # This input is required.
      locale: ""
```

<!-- usage:end -->
<!-- inputs:start -->

## Inputs

### Workflow Call Inputs

| **Input**                        | **Description**                                                                              | **Required** | **Type**   | **Default** |
| -------------------------------- | -------------------------------------------------------------------------------------------- | ------------ | ---------- | ----------- |
| **`github-app-client-id`**       | GitHub App client ID for the consumer repository.                                            | **true**     | **string** | -           |
| **`issue-number`**               | Meetup source issue number.                                                                  | **true**     | **number** | -           |
| **`intent-id`**                  | SHA-256 intent identity in the recorded social delivery journal.                             | **true**     | **string** | -           |
| **`outcome`**                    | Verified outcome, published or not-published.                                                | **true**     | **string** | -           |
| **`reference`**                  | Provider post URL for published, or GitHub organizer evidence comment URL for not-published. | **true**     | **string** | -           |
| **`slack-organizer-channel-id`** | Internal organizer channel receiving recovery approval requests.                             | **true**     | **string** | -           |
| **`locale`**                     | Language for the recovery report (en or fr).                                                 | **true**     | **string** | -           |

<!-- inputs:end -->
<!-- secrets:start -->

## Secrets

| **Secret**                   | **Description**                                                          | **Required** |
| ---------------------------- | ------------------------------------------------------------------------ | ------------ |
| **`github-app-private-key`** | GitHub App private key.                                                  | **true**     |
| **`slack-token`**            | Slack token for organizer recovery notifications and decision reactions. | **true**     |

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
