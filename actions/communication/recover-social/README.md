<!-- header:start -->

# GitHub Action: Recover a social post

<div align="center">
  <img src="../../../.github/logo.svg" width="60px" align="center" alt="Recover a social post" />
</div>

---

<!-- header:end -->
<!-- badges:start -->

[![Marketplace](https://img.shields.io/badge/Marketplace-recover--a--social--post-blue?logo=github-actions)](https://github.com/marketplace/actions/recover-a-social-post)
[![Release](https://img.shields.io/github/v/release/cloud-native-aixmarseille/meetup-event-automation)](https://github.com/cloud-native-aixmarseille/meetup-event-automation/releases)
[![License](https://img.shields.io/github/license/cloud-native-aixmarseille/meetup-event-automation)](http://choosealicense.com/licenses/mit/)
[![Stars](https://img.shields.io/github/stars/cloud-native-aixmarseille/meetup-event-automation?style=social)](https://img.shields.io/github/stars/cloud-native-aixmarseille/meetup-event-automation?style=social)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/cloud-native-aixmarseille/meetup-event-automation/blob/main/CONTRIBUTING.md)

<!-- badges:end -->
<!-- overview:start -->

## Overview

Request a verified organizer decision about an uncertain recorded social delivery.

<!-- overview:end -->
<!-- usage:start -->

## Usage

```yaml
- uses: cloud-native-aixmarseille/meetup-event-automation/actions/communication/recover-social@4f7ea7fba73f31503043176bbe12d8c7170150ab # 6.0.0
  with:
    # GitHub token with issue read and write permissions.
    # This input is required.
    github-token: ""

    # Meetup source issue number.
    # This input is required.
    issue-number: ""

    # GitHub App bot login owning content and delivery records.
    # This input is required.
    managed-comment-author: ""

    # Recorded social delivery intent SHA-256 identity.
    # This input is required.
    intent-id: ""

    # Verified outcome, published or not-published.
    # This input is required.
    outcome: ""

    # Provider post URL for published, or GitHub organizer evidence comment URL for not-published.
    # This input is required.
    reference: ""

    # Slack bot token for organizer recovery review notifications.
    # This input is required.
    slack-token: ""

    # Internal organizer channel receiving recovery requests.
    # This input is required.
    slack-organizer-channel-id: ""

    # Language for the recovery report (en or fr).
    # This input is required.
    locale: ""
```

<!-- usage:end -->
<!-- inputs:start -->

## Inputs

| **Input**                        | **Description**                                                                              | **Required** | **Default** |
| -------------------------------- | -------------------------------------------------------------------------------------------- | ------------ | ----------- |
| **`github-token`**               | GitHub token with issue read and write permissions.                                          | **true**     | -           |
| **`issue-number`**               | Meetup source issue number.                                                                  | **true**     | -           |
| **`managed-comment-author`**     | GitHub App bot login owning content and delivery records.                                    | **true**     | -           |
| **`intent-id`**                  | Recorded social delivery intent SHA-256 identity.                                            | **true**     | -           |
| **`outcome`**                    | Verified outcome, published or not-published.                                                | **true**     | -           |
| **`reference`**                  | Provider post URL for published, or GitHub organizer evidence comment URL for not-published. | **true**     | -           |
| **`slack-token`**                | Slack bot token for organizer recovery review notifications.                                 | **true**     | -           |
| **`slack-organizer-channel-id`** | Internal organizer channel receiving recovery requests.                                      | **true**     | -           |
| **`locale`**                     | Language for the recovery report (en or fr).                                                 | **true**     | -           |

<!-- inputs:end -->
<!-- secrets:start -->
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
