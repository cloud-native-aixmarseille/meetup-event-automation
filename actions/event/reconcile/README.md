<!-- header:start -->

# ![Icon](data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJmZWF0aGVyIGZlYXRoZXItY2hlY2stY2lyY2xlIiBjb2xvcj0iYmx1ZSI+PHBhdGggZD0iTTIyIDExLjA4VjEyYTEwIDEwIDAgMSAxLTUuOTMtOS4xNCI+PC9wYXRoPjxwb2x5bGluZSBwb2ludHM9IjIyIDQgMTIgMTQuMDEgOSAxMS4wMSI+PC9wb2x5bGluZT48L3N2Zz4=) GitHub Action: Reconcile meetup event

<div align="center">
  <img src="../../../.github/logo.svg" width="60px" align="center" alt="Reconcile meetup event" />
</div>

---

<!-- header:end -->
<!-- badges:start -->

[![Marketplace](https://img.shields.io/badge/Marketplace-reconcile--meetup--event-blue?logo=github-actions)](https://github.com/marketplace/actions/reconcile-meetup-event)
[![Release](https://img.shields.io/github/v/release/cloud-native-aixmarseille/meetup-event-automation)](https://github.com/cloud-native-aixmarseille/meetup-event-automation/releases)
[![License](https://img.shields.io/github/license/cloud-native-aixmarseille/meetup-event-automation)](http://choosealicense.com/licenses/mit/)
[![Stars](https://img.shields.io/github/stars/cloud-native-aixmarseille/meetup-event-automation?style=social)](https://img.shields.io/github/stars/cloud-native-aixmarseille/meetup-event-automation?style=social)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/cloud-native-aixmarseille/meetup-event-automation/blob/main/CONTRIBUTING.md)

<!-- badges:end -->
<!-- overview:start -->

## Overview

Read one meetup issue, derive lifecycle and readiness, and persist safe issue updates. Return diagnostics for the final organizer report.

<!-- overview:end -->
<!-- usage:start -->

## Usage

```yaml
- uses: cloud-native-aixmarseille/meetup-event-automation/actions/event/reconcile@5a80cd5013781ff071bea0dfda49044bc4071c5f # 2.3.2
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

    # Conference Hall CFP slug for live linked profiles and selected proposals.
    # This input is required.
    conference-hall-event: ""

    # Read-only Conference Hall event API key.
    # This input is required.
    conference-hall-api-key: ""

    # Token for the caller repository. Requires issues:write for issue normalization.
    # This input is required.
    github-token: ""
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
| **`issue-number`**                 | GitHub issue number in the caller repository containing the meetup event document to inspect.                                      | **true**     | -           |
| **`conference-hall-event`**        | Conference Hall CFP slug for live linked profiles and selected proposals.                                                          | **true**     | -           |
| **`conference-hall-api-key`**      | Read-only Conference Hall event API key.                                                                                           | **true**     | -           |
| **`github-token`**                 | Token for the caller repository. Requires issues:write for issue normalization.                                                    | **true**     | -           |

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

## Conference Hall inputs

Required `conference-hall-event` and `conference-hall-api-key` inputs provide
live speaker-profile and selected-proposal refresh. Each invocation combines
one Conference Hall snapshot with committed CSV identity mappings and local
contact supplements. Linked profile changes take effect without a CSV merge.
Missing or blank source settings fail before reconciliation. See
[setup and failure behavior](../../../docs/integrations/conference-hall.md).
