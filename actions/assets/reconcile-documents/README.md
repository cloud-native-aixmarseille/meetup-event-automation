<!-- header:start -->

# GitHub Action: Update meetup files

<div align="center">
  <img src="../../../.github/logo.svg" width="60px" align="center" alt="Update meetup files" />
</div>

---

<!-- header:end -->
<!-- badges:start -->

[![Marketplace](https://img.shields.io/badge/Marketplace-update--meetup--files-blue?logo=github-actions)](https://github.com/marketplace/actions/update-meetup-files)
[![Release](https://img.shields.io/github/v/release/cloud-native-aixmarseille/meetup-event-automation)](https://github.com/cloud-native-aixmarseille/meetup-event-automation/releases)
[![License](https://img.shields.io/github/license/cloud-native-aixmarseille/meetup-event-automation)](http://choosealicense.com/licenses/mit/)
[![Stars](https://img.shields.io/github/stars/cloud-native-aixmarseille/meetup-event-automation?style=social)](https://img.shields.io/github/stars/cloud-native-aixmarseille/meetup-event-automation?style=social)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/cloud-native-aixmarseille/meetup-event-automation/blob/main/CONTRIBUTING.md)

<!-- badges:end -->
<!-- overview:start -->

## Overview

Reconcile managed Drive folders, template copies, document content and the issue asset link.

<!-- overview:end -->
<!-- usage:start -->

## Usage

```yaml
- uses: cloud-native-aixmarseille/meetup-event-automation/actions/assets/reconcile-documents@4f7ea7fba73f31503043176bbe12d8c7170150ab # 6.0.0
  with:
    # GitHub App bot owning content approval state.
    # This input is required.
    managed-comment-author: ""

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

    # GitHub issue number containing the meetup event document.
    # This input is required.
    issue-number: ""

    # Token for the caller repository. Requires issues:read and issues:write.
    # This input is required.
    github-token: ""

    # Service-account JSON with access to the configured Drive parent, template and public folders.
    # This input is required.
    google-credentials: ""

    # Google Drive folder ID of the parent asset folder.
    # This input is required.
    google-drive-folder-id: ""

    # Google Drive folder ID of the template folder.
    # This input is required.
    google-drive-template-folder-id: ""

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

| **Input**                             | **Description**                                                                                                                    | **Required** | **Default** |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------ | ----------- |
| **`managed-comment-author`**          | GitHub App bot owning content approval state.                                                                                      | **true**     | -           |
| **`meetup-event-url-prefix`**         | HTTPS event URL prefix for the authorized Meetup group, ending in /events/.                                                        | **true**     | -           |
| **`community-event-url-prefixes`**    | JSON array of nonempty HTTPS prefixes accepted for community event URLs.                                                           | **true**     | -           |
| **`asset-folder-url-prefix`**         | HTTPS prefix accepted for event asset folder URLs.                                                                                 | **true**     | -           |
| **`locale`**                          | Language for generated reports and guidance (en or fr). Regional variants are supported; unsupported locales fall back to English. | **true**     | -           |
| **`issue-number`**                    | GitHub issue number containing the meetup event document.                                                                          | **true**     | -           |
| **`github-token`**                    | Token for the caller repository. Requires issues:read and issues:write.                                                            | **true**     | -           |
| **`google-credentials`**              | Service-account JSON with access to the configured Drive parent, template and public folders.                                      | **true**     | -           |
| **`google-drive-folder-id`**          | Google Drive folder ID of the parent asset folder.                                                                                 | **true**     | -           |
| **`google-drive-template-folder-id`** | Google Drive folder ID of the template folder.                                                                                     | **true**     | -           |
| **`conference-hall-event`**           | Conference Hall CFP slug for live linked profiles and selected proposals.                                                          | **true**     | -           |
| **`conference-hall-api-key`**         | Read-only Conference Hall event API key.                                                                                           | **true**     | -           |

<!-- inputs:end -->
<!-- secrets:start -->
<!-- secrets:end -->
<!-- outputs:start -->

## Outputs

| **Output**         | **Description**                                                                          |
| ------------------ | ---------------------------------------------------------------------------------------- |
| **`drive-files`**  | JSON map from template kind followed by -link to the corresponding copied file URL.      |
| **`slides-ready`** | Whether a slides URL exists and its content is copy-only or ready.                       |
| **`diagnostics`**  | Redacted JSON diagnostics for asset reconciliation.                                      |
| **`pdf-source`**   | Public asset identities and opaque issue revision consumed by slides PDF reconciliation. |

<!-- outputs:end -->
<!-- examples:start -->

## Examples

See [Google Drive event assets](../../../docs/integrations/assets.md) for service-account access, the committed content configuration, template authoring, stable asset identity and recovery. Forward `slides-ready` with the file URL to communications.

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
