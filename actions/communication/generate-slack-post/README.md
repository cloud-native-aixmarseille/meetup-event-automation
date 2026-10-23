<!-- header:start -->

# GitHub Action: Generate Slack post

<div align="center">
  <img src="../../../.github/logo.svg" width="60px" align="center" alt="Generate Slack post" />
</div>

---

<!-- header:end -->
<!-- badges:start -->

[![Marketplace](https://img.shields.io/badge/Marketplace-generate--slack--post-blue?logo=github-actions)](https://github.com/marketplace/actions/generate-slack-post)
[![Release](https://img.shields.io/github/v/release/cloud-native-aixmarseille/meetup-event-automation)](https://github.com/cloud-native-aixmarseille/meetup-event-automation/releases)
[![License](https://img.shields.io/github/license/cloud-native-aixmarseille/meetup-event-automation)](http://choosealicense.com/licenses/mit/)
[![Stars](https://img.shields.io/github/stars/cloud-native-aixmarseille/meetup-event-automation?style=social)](https://img.shields.io/github/stars/cloud-native-aixmarseille/meetup-event-automation?style=social)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/cloud-native-aixmarseille/meetup-event-automation/blob/main/CONTRIBUTING.md)

<!-- badges:end -->
<!-- overview:start -->

## Overview

Generate one durable proposal without applying it.

<!-- overview:end -->
<!-- usage:start -->

## Usage

```yaml
- uses: cloud-native-aixmarseille/meetup-event-automation/actions/communication/generate-slack-post@5a80cd5013781ff071bea0dfda49044bc4071c5f # 2.3.2
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

    # Draft target: slack-aix:announcement/d7/d0 or slack-openbar:announcement/d7/d0.
    # This input is required.
    target: ""

    # AI provider identifier (gemini).
    # This input is required.
    ai-provider: ""

    # Supported structured-text model.
    # This input is required.
    ai-model: ""

    # API key for the selected AI provider.
    # This input is required.
    ai-api-key: ""
```

<!-- usage:end -->
<!-- inputs:start -->

## Inputs

| **Input**                          | **Description**                                                                                                                    | **Required** | **Default** |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------ | ----------- |
| **`meetup-event-url-prefix`**      | HTTPS event URL prefix for the authorized Meetup group, ending in /events/.                                                        | **true**     | -           |
| **`community-event-url-prefixes`** | JSON array of nonempty HTTPS prefixes accepted for community event URLs.                                                           | **true**     | -           |
| **`asset-folder-url-prefix`**      | HTTPS prefix accepted for event asset folder URLs.                                                                                 | **true**     | -           |
| **`locale`**                       | Language for generated reports and guidance (en or fr). Regional variants are supported; unsupported locales fall back to English. | **true**     | -           |
| **`github-token`**                 | GitHub token with issue read and write permissions.                                                                                | **true**     | -           |
| **`issue-number`**                 | Meetup issue number.                                                                                                               | **true**     | -           |
| **`conference-hall-event`**        | Conference Hall CFP slug for live linked profiles and selected proposals.                                                          | **true**     | -           |
| **`conference-hall-api-key`**      | Read-only Conference Hall event API key.                                                                                           | **true**     | -           |
| **`managed-comment-author`**       | GitHub App bot login owning content and approval comments.                                                                         | **true**     | -           |
| **`target`**                       | Draft target: slack-aix:announcement/d7/d0 or slack-openbar:announcement/d7/d0.                                                    | **true**     | -           |
| **`ai-provider`**                  | AI provider identifier (gemini).                                                                                                   | **true**     | -           |
| **`ai-model`**                     | Supported structured-text model.                                                                                                   | **true**     | -           |
| **`ai-api-key`**                   | API key for the selected AI provider.                                                                                              | **true**     | -           |

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
