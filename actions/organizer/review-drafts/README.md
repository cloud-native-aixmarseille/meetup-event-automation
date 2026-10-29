<!-- header:start -->

# GitHub Action: Review drafts

<div align="center">
  <img src="../../../.github/logo.svg" width="60px" align="center" alt="Review drafts" />
</div>

---

<!-- header:end -->
<!-- badges:start -->

[![Marketplace](https://img.shields.io/badge/Marketplace-review--drafts-blue?logo=github-actions)](https://github.com/marketplace/actions/review-drafts)
[![Release](https://img.shields.io/github/v/release/cloud-native-aixmarseille/meetup-event-automation)](https://github.com/cloud-native-aixmarseille/meetup-event-automation/releases)
[![License](https://img.shields.io/github/license/cloud-native-aixmarseille/meetup-event-automation)](http://choosealicense.com/licenses/mit/)
[![Stars](https://img.shields.io/github/stars/cloud-native-aixmarseille/meetup-event-automation?style=social)](https://img.shields.io/github/stars/cloud-native-aixmarseille/meetup-event-automation?style=social)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/cloud-native-aixmarseille/meetup-event-automation/blob/main/CONTRIBUTING.md)

<!-- badges:end -->
<!-- overview:start -->

## Overview

Review content, import organizer submissions, and apply approved current values.

<!-- overview:end -->
<!-- usage:start -->

## Usage

```yaml
- uses: cloud-native-aixmarseille/meetup-event-automation/actions/organizer/review-drafts@3c26f9786c6654480f2125d129e1c4c8eeeb030c # 3.0.0
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

    # GitHub token with issue read and write permissions.
    # This input is required.
    github-token: ""

    # Meetup issue number.
    # This input is required.
    issue-number: ""

    # Conference Hall CFP slug for live linked profiles and selected proposals.
    # This input is required.
    conference-hall-event: ""

    # Read-only Conference Hall event API key.
    # This input is required.
    conference-hall-api-key: ""

    # GitHub App bot login owning content and approval comments.
    # This input is required.
    managed-comment-author: ""

    # Google service-account JSON for immutable public content media.
    # This input is required.
    google-credentials: ""

    # Public Drive root ID containing the tmp-covers subfolder for content images.
    # This input is required.
    google-drive-public-folder-id: ""

    # Slack bot token for organizer review requests and decision reactions.
    # This input is required.
    slack-token: ""

    # Internal organizer channel receiving content reviews.
    # This input is required.
    slack-organizer-channel-id: ""
```

<!-- usage:end -->
<!-- inputs:start -->

## Inputs

| **Input**                           | **Description**                                                                                                                    | **Required** | **Default** |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------ | ----------- |
| **`meetup-event-url-prefix`**       | HTTPS event URL prefix for the authorized Meetup group, ending in /events/.                                                        | **true**     | -           |
| **`community-event-url-prefixes`**  | JSON array of nonempty HTTPS prefixes accepted for community event URLs.                                                           | **true**     | -           |
| **`asset-folder-url-prefix`**       | HTTPS prefix accepted for event asset folder URLs.                                                                                 | **true**     | -           |
| **`locale`**                        | Language for generated reports and guidance (en or fr). Regional variants are supported; unsupported locales fall back to English. | **true**     | -           |
| **`github-token`**                  | GitHub token with issue read and write permissions.                                                                                | **true**     | -           |
| **`issue-number`**                  | Meetup issue number.                                                                                                               | **true**     | -           |
| **`conference-hall-event`**         | Conference Hall CFP slug for live linked profiles and selected proposals.                                                          | **true**     | -           |
| **`conference-hall-api-key`**       | Read-only Conference Hall event API key.                                                                                           | **true**     | -           |
| **`managed-comment-author`**        | GitHub App bot login owning content and approval comments.                                                                         | **true**     | -           |
| **`google-credentials`**            | Google service-account JSON for immutable public content media.                                                                    | **true**     | -           |
| **`google-drive-public-folder-id`** | Public Drive root ID containing the tmp-covers subfolder for content images.                                                       | **true**     | -           |
| **`slack-token`**                   | Slack bot token for organizer review requests and decision reactions.                                                              | **true**     | -           |
| **`slack-organizer-channel-id`**    | Internal organizer channel receiving content reviews.                                                                              | **true**     | -           |

<!-- inputs:end -->
<!-- secrets:start -->
<!-- secrets:end -->
<!-- outputs:start -->

## Outputs

| **Output**        | **Description**                     |
| ----------------- | ----------------------------------- |
| **`diagnostics`** | Redacted content-stage diagnostics. |

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
