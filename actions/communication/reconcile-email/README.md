<!-- header:start -->

# GitHub Action: Reconcile meetup communications

<div align="center">
  <img src="../../../.github/logo.svg" width="60px" align="center" alt="Reconcile meetup communications" />
</div>

---

<!-- header:end -->
<!-- badges:start -->

[![Marketplace](https://img.shields.io/badge/Marketplace-reconcile--meetup--communications-blue?logo=github-actions)](https://github.com/marketplace/actions/reconcile-meetup-communications)
[![Release](https://img.shields.io/github/v/release/cloud-native-aixmarseille/meetup-event-automation)](https://github.com/cloud-native-aixmarseille/meetup-event-automation/releases)
[![License](https://img.shields.io/github/license/cloud-native-aixmarseille/meetup-event-automation)](http://choosealicense.com/licenses/mit/)
[![Stars](https://img.shields.io/github/stars/cloud-native-aixmarseille/meetup-event-automation?style=social)](https://img.shields.io/github/stars/cloud-native-aixmarseille/meetup-event-automation?style=social)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/cloud-native-aixmarseille/meetup-event-automation/blob/main/CONTRIBUTING.md)

<!-- badges:end -->
<!-- overview:start -->

## Overview

Reconcile due meetup communications and dispatch them through the configured mail and Slack gateways when event, checklist, approval and delivery checks pass. Report concise technical facts and diagnostic codes in logs and the job summary.

<!-- overview:end -->
<!-- usage:start -->

## Usage

```yaml
- uses: cloud-native-aixmarseille/meetup-event-automation/actions/communication/reconcile@5a80cd5013781ff071bea0dfda49044bc4071c5f # 2.3.2
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

    # GitHub issue number in the caller repository containing the meetup event document to inspect.
    # This input is required.
    issue-number: ""

    # Whether managed slides content is ready. False holds email batches that require slides. Copy-only slides use true.
    # This input is required.
    slides-ready: ""

    # Direct presentation file URL from the asset action's drive-files slides-link entry. Supply on every invocation; it may be empty when slides-ready is false. Unavailable slides block due email batches.
    # This input is required.
    slides-url: ""

    # OpenFeedback organization API key used to read existing talk results for speaker thank-you emails. Missing or unresolved results block the thank-you batch.
    # This input is required.
    openfeedback-api-key: ""

    # Token for the caller repository. Requires issues:write for approval requests, checklist completion and the delivery ledger, and metadata:read to verify approvers.
    # This input is required.
    github-token: ""

    # Trusted bot login allowed to create or update managed approval and delivery ledger comments, for example my-app[bot].
    # This input is required.
    managed-comment-author: ""

    # Token used to dispatch due email communications to the configured mailings repository.
    # This input is required.
    mailings-token: ""

    # Internal meetup organizer Slack channel for approval requests and actionable organizer reminders. Public announcement channels are separate.
    # This input is required.
    slack-organizer-channel-id: ""

    # Slack bot token with chat:write and reactions:write for organizer notifications and decision reactions.
    # This input is required.
    slack-token: ""

    # Conference Hall CFP slug for live linked profiles and selected proposals.
    # This input is required.
    conference-hall-event: ""

    # Read-only Conference Hall event API key.
    # This input is required.
    conference-hall-api-key: ""
```

<!-- usage:end -->
<!-- inputs:start -->

## Inputs

| **Input**                          | **Description**                                                                                                                                                                                         | **Required** | **Default** |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ----------- |
| **`meetup-event-url-prefix`**      | HTTPS event URL prefix for the authorized Meetup group, ending in /events/.                                                                                                                             | **true**     | -           |
| **`community-event-url-prefixes`** | JSON array of nonempty HTTPS prefixes accepted for community event URLs.                                                                                                                                | **true**     | -           |
| **`asset-folder-url-prefix`**      | HTTPS prefix accepted for event asset folder URLs.                                                                                                                                                      | **true**     | -           |
| **`locale`**                       | Language for generated reports and guidance (en or fr). Regional variants are supported; unsupported locales fall back to English.                                                                      | **true**     | -           |
| **`issue-number`**                 | GitHub issue number in the caller repository containing the meetup event document to inspect.                                                                                                           | **true**     | -           |
| **`slides-ready`**                 | Whether managed slides content is ready. False holds email batches that require slides. Copy-only slides use true.                                                                                      | **true**     | -           |
| **`slides-url`**                   | Direct presentation file URL from the asset action's drive-files slides-link entry. Supply on every invocation; it may be empty when slides-ready is false. Unavailable slides block due email batches. | **true**     | -           |
| **`openfeedback-api-key`**         | OpenFeedback organization API key used to read existing talk results for speaker thank-you emails. Missing or unresolved results block the thank-you batch.                                             | **true**     | -           |
| **`github-token`**                 | Token for the caller repository. Requires issues:write for approval requests, checklist completion and the delivery ledger, and metadata:read to verify approvers.                                      | **true**     | -           |
| **`managed-comment-author`**       | Trusted bot login allowed to create or update managed approval and delivery ledger comments, for example my-app[bot].                                                                                   | **true**     | -           |
| **`mailings-token`**               | Token used to dispatch due email communications to the configured mailings repository.                                                                                                                  | **true**     | -           |
| **`slack-organizer-channel-id`**   | Internal meetup organizer Slack channel for approval requests and actionable organizer reminders. Public announcement channels are separate.                                                            | **true**     | -           |
| **`slack-token`**                  | Slack bot token with chat:write and reactions:write for organizer notifications and decision reactions.                                                                                                 | **true**     | -           |
| **`conference-hall-event`**        | Conference Hall CFP slug for live linked profiles and selected proposals.                                                                                                                               | **true**     | -           |
| **`conference-hall-api-key`**      | Read-only Conference Hall event API key.                                                                                                                                                                | **true**     | -           |

<!-- inputs:end -->
<!-- secrets:start -->
<!-- secrets:end -->
<!-- outputs:start -->

## Outputs

| **Output**        | **Description**                                                          |
| ----------------- | ------------------------------------------------------------------------ |
| **`diagnostics`** | Redacted JSON diagnostics safe to expose in workflow logs and summaries. |

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

Copyright © 2026 Cloud Native Aix-Marseille

For more details, see the [license](http://choosealicense.com/licenses/mit/).

<!-- license:end -->
<!-- generated:start -->

---

This documentation was automatically generated by [CI Dokumentor](https://github.com/hoverkraft-tech/ci-dokumentor).

<!-- generated:end -->
