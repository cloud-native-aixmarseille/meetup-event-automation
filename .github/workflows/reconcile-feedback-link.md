<!-- header:start -->

# GitHub Reusable Workflow: Reconcile shared feedback link

<div align="center">
  <img src="../logo.svg" width="60px" align="center" alt="Reconcile shared feedback link" />
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
name: Reconcile shared feedback link
on:
  push:
    branches:
      - main
permissions: {}
jobs:
  reconcile-feedback-link:
    uses: cloud-native-aixmarseille/meetup-event-automation/.github/workflows/reconcile-feedback-link.yml@5a80cd5013781ff071bea0dfda49044bc4071c5f # 2.3.2
    permissions:
      contents: read
    secrets:
      # PEM-encoded private key for the GitHub App identified by the github-app-client-id input. Used to mint a narrowly scoped installation token.
      # This input is required.
      github-app-private-key: ""

      # API key for the owner of the existing Kutt feedback link.
      # This input is required.
      kutt-api-key: ""
    with:
      # Language for generated reports and guidance (en or fr). Regional variants are supported; unsupported locales fall back to English.
      # This input is required.
      locale: ""

      # GitHub App client ID used to mint the narrowly scoped installation token for meetup automation.
      # This input is required.
      github-app-client-id: ""

      # HTTPS base URL of the Kutt instance, without /api/v2. No default.
      # This input is required.
      kutt-base-url: ""

      # Existing Kutt feedback link API ID.
      # This input is required.
      kutt-link-id: ""
```

<!-- usage:end -->
<!-- inputs:start -->

## Inputs

### Workflow Call Inputs

| **Input**                  | **Description**                                                                                                                    | **Required** | **Type**   | **Default** |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------ | ---------- | ----------- |
| **`locale`**               | Language for generated reports and guidance (en or fr). Regional variants are supported; unsupported locales fall back to English. | **true**     | **string** | -           |
| **`github-app-client-id`** | GitHub App client ID used to mint the narrowly scoped installation token for meetup automation.                                    | **true**     | **string** | -           |
| **`kutt-base-url`**        | HTTPS base URL of the Kutt instance, without /api/v2. No default.                                                                  | **true**     | **string** | -           |
| **`kutt-link-id`**         | Existing Kutt feedback link API ID.                                                                                                | **true**     | **string** | -           |

<!-- inputs:end -->
<!-- secrets:start -->

## Secrets

| **Secret**                   | **Description**                                                                                                                             | **Required** |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| **`github-app-private-key`** | PEM-encoded private key for the GitHub App identified by the github-app-client-id input. Used to mint a narrowly scoped installation token. | **true**     |
| **`kutt-api-key`**           | API key for the owner of the existing Kutt feedback link.                                                                                   | **true**     |

<!-- secrets:end -->
<!-- outputs:start -->

## Outputs

| **Output**        | **Description**                                            |
| ----------------- | ---------------------------------------------------------- |
| **`diagnostics`** | Shared-link diagnostics for organizer reporting.           |
| **`outcome`**     | Shared-link execution outcome for incomplete-run handling. |

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
