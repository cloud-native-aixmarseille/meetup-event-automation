<!-- header:start -->

# GitHub Action: Create or update Meetup event

<div align="center">
  <img src="../../../.github/logo.svg" width="60px" align="center" alt="Create or update Meetup event" />
</div>

---

<!-- header:end -->
<!-- badges:start -->

[![Marketplace](https://img.shields.io/badge/Marketplace-create--or--update--meetup--event-blue?logo=github-actions)](https://github.com/marketplace/actions/create-or-update-meetup-event)
[![Release](https://img.shields.io/github/v/release/cloud-native-aixmarseille/meetup-event-automation)](https://github.com/cloud-native-aixmarseille/meetup-event-automation/releases)
[![License](https://img.shields.io/github/license/cloud-native-aixmarseille/meetup-event-automation)](http://choosealicense.com/licenses/mit/)
[![Stars](https://img.shields.io/github/stars/cloud-native-aixmarseille/meetup-event-automation?style=social)](https://img.shields.io/github/stars/cloud-native-aixmarseille/meetup-event-automation?style=social)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/cloud-native-aixmarseille/meetup-event-automation/blob/main/CONTRIBUTING.md)

<!-- badges:end -->
<!-- overview:start -->

## Overview

Create or update a Meetup draft and publish it after verified organizer approval.

<!-- overview:end -->

## Publication behavior

Create the event described by a consumer issue as a draft, or update its existing
Meetup event. Request organizer approval through the shared issue-comment and
Slack process, then publish an approved draft automatically. The action verifies saved fields, fills **Meetup Link** for drafts and
published events, and synchronizes **Meetup event published** under
**Communication** with the verified status. See
[Meetup publication](../../../docs/integrations/meetup-publication.md)
for configuration, prerequisites, recovery, and privacy boundaries.

Password whitespace is preserved. The selected model must support image input
and structured output.

Every input is required and has no default.
AI settings follow the shared [AI configuration contract](../../../docs/reference/configuration.md#ai-configuration).
Replace `<FULL_COMMIT_SHA>` in the usage template with a published revision that
includes this action, and supply your repository's input values.

<!-- usage:start -->

## Usage

```yaml
- uses: cloud-native-aixmarseille/meetup-event-automation/actions/publication/reconcile-meetup@5a80cd5013781ff071bea0dfda49044bc4071c5f # 2.3.2
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

    # Slack bot token for organizer approval notifications and decision reactions.
    # This input is required.
    slack-token: ""

    # Organizer Slack channel receiving publication approval requests.
    # This input is required.
    slack-organizer-channel-id: ""

    # Meetup source issue number.
    # This input is required.
    issue-number: ""

    # Consumer repository token with contents read and issues write.
    # This input is required.
    github-token: ""

    # Login of the GitHub App bot that owns the publication journal.
    # This input is required.
    managed-comment-author: ""

    # Conference Hall CFP slug used to resolve the current event agenda.
    # This input is required.
    conference-hall-event: ""

    # Read-only Conference Hall event API key.
    # This input is required.
    conference-hall-api-key: ""

    # Language for the publication report (en or fr).
    # This input is required.
    locale: ""

    # Email of the authorized Meetup organizer account.
    # This input is required.
    meetup-email: ""

    # Password of the authorized Meetup organizer account.
    # This input is required.
    meetup-password: ""

    # AI provider identifier (gemini).
    # This input is required.
    ai-provider: ""

    # Model identifier for the selected AI provider.
    # This input is required.
    ai-model: ""

    # API key for the selected AI provider.
    # This input is required.
    ai-api-key: ""
```

<!-- usage:end -->
<!-- inputs:start -->

## Inputs

| **Input**                          | **Description**                                                              | **Required** | **Default** |
| ---------------------------------- | ---------------------------------------------------------------------------- | ------------ | ----------- |
| **`meetup-event-url-prefix`**      | HTTPS event URL prefix for the authorized Meetup group, ending in /events/.  | **true**     | -           |
| **`community-event-url-prefixes`** | JSON array of nonempty HTTPS prefixes accepted for community event URLs.     | **true**     | -           |
| **`asset-folder-url-prefix`**      | HTTPS prefix accepted for event asset folder URLs.                           | **true**     | -           |
| **`slack-token`**                  | Slack bot token for organizer approval notifications and decision reactions. | **true**     | -           |
| **`slack-organizer-channel-id`**   | Organizer Slack channel receiving publication approval requests.             | **true**     | -           |
| **`issue-number`**                 | Meetup source issue number.                                                  | **true**     | -           |
| **`github-token`**                 | Consumer repository token with contents read and issues write.               | **true**     | -           |
| **`managed-comment-author`**       | Login of the GitHub App bot that owns the publication journal.               | **true**     | -           |
| **`conference-hall-event`**        | Conference Hall CFP slug used to resolve the current event agenda.           | **true**     | -           |
| **`conference-hall-api-key`**      | Read-only Conference Hall event API key.                                     | **true**     | -           |
| **`locale`**                       | Language for the publication report (en or fr).                              | **true**     | -           |
| **`meetup-email`**                 | Email of the authorized Meetup organizer account.                            | **true**     | -           |
| **`meetup-password`**              | Password of the authorized Meetup organizer account.                         | **true**     | -           |
| **`ai-provider`**                  | AI provider identifier (gemini).                                             | **true**     | -           |
| **`ai-model`**                     | Model identifier for the selected AI provider.                               | **true**     | -           |
| **`ai-api-key`**                   | API key for the selected AI provider.                                        | **true**     | -           |

<!-- inputs:end -->
<!-- secrets:start -->
<!-- secrets:end -->
<!-- outputs:start -->
<!-- outputs:end -->

## Execution

Use the [reusable workflow](../../../.github/workflows/reconcile-meetup-event.md),
which checks out the consumer's configuration, installs Chromium and locked
solver dependencies, scopes credentials, and holds the event concurrency lock.
Direct callers must provide the same runtime and lock. There are no action
outputs. The journal retains the remote identity for recovery. The shared action report provides a draft review URL, status,
and recovery guidance.

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
