<!-- header:start -->

# GitHub Action: Reconcile meetup assets

<!-- header:end -->
<!-- badges:start -->

[![Marketplace](https://img.shields.io/badge/Marketplace-reconcile--meetup--assets-blue?logo=github-actions)](https://github.com/marketplace/actions/reconcile-meetup-assets)
[![Release](https://img.shields.io/github/v/release/cloud-native-aixmarseille/meetup-event-automation)](https://github.com/cloud-native-aixmarseille/meetup-event-automation/releases)
[![Stars](https://img.shields.io/github/stars/cloud-native-aixmarseille/meetup-event-automation?style=social)](https://img.shields.io/github/stars/cloud-native-aixmarseille/meetup-event-automation?style=social)

<!-- badges:end -->
<!-- overview:start -->

## Overview

Reconcile the event Drive folder, template copies, and issue asset link. Populate opted-in text and image bindings in Google Slides and Docs. Publish redacted diagnostics in annotations, logs, and the job summary.

<!-- overview:end -->
<!-- usage:start -->

## Usage

```yaml
- uses: cloud-native-aixmarseille/meetup-event-automation/actions/publication/reconcile-assets@0123456789abcdef0123456789abcdef01234567 # replace with a release SHA containing asset reconciliation
  with:
    conference-hall-event: ${{ vars.CONFERENCE_HALL_EVENT }}
    conference-hall-api-key: ${{ secrets.CONFERENCE_HALL_API_KEY }}
    # Required language for generated text; no default.
    locale: en
    # GitHub issue number containing the meetup event document.
    # This input is required.
    issue-number: ""

    # Token for the caller repository. Requires issues:read and issues:write.
    # This input is required.
    github-token: ""

    # Trusted GitHub App bot login used by the event composition.
    # This input is required.
    managed-comment-author: ""

    # Service-account JSON with access to the configured Drive parent and template folders.
    # This input is required.
    google-credentials: ""

    # Google Drive folder ID of the parent meetup folder.
    # This input is required.
    google-drive-meetup-folder-id: ""

    # Google Drive folder ID of the template folder.
    # This input is required.
    google-drive-meetup-template-folder-id: ""
```

<!-- usage:end -->
<!-- inputs:start -->

## Inputs

| **Input**                                    | **Description**                                                                                                                    | **Required** | **Default** |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------ | ----------- |
| **`conference-hall-event`**                  | Conference Hall CFP slug for live linked profiles and selected proposals.                                                          | **true**     | -           |
| **`conference-hall-api-key`**                | Read-only Conference Hall event API key.                                                                                           | **true**     | -           |
| **`locale`**                                 | Language for generated reports and guidance (en or fr). Regional variants are supported; unsupported locales fall back to English. | **true**     | -           |
| **`issue-number`**                           | GitHub issue number containing the meetup event document.                                                                          | **true**     | -           |
| **`github-token`**                           | Token for the caller repository. Requires issues:read and issues:write.                                                            | **true**     | -           |
| **`managed-comment-author`**                 | Trusted GitHub App bot login used by the event composition.                                                                        | **true**     | -           |
| **`google-credentials`**                     | Service-account JSON with access to the configured Drive parent and template folders.                                              | **true**     | -           |
| **`google-drive-meetup-folder-id`**          | Google Drive folder ID of the parent meetup folder.                                                                                | **true**     | -           |
| **`google-drive-meetup-template-folder-id`** | Google Drive folder ID of the template folder.                                                                                     | **true**     | -           |

<!-- inputs:end -->
<!-- secrets:start -->
<!-- secrets:end -->
<!-- outputs:start -->

## Outputs

| **Output**         | **Description**                                                                     |
| ------------------ | ----------------------------------------------------------------------------------- |
| **`drive-files`**  | JSON map from template kind followed by -link to the corresponding copied file URL. |
| **`slides-ready`** | Whether a slides URL exists and its content is copy-only or ready.                  |
| **`diagnostics`**  | Redacted JSON diagnostics for asset reconciliation.                                 |

<!-- outputs:end -->
<!-- examples:start -->

See [Google Drive event assets](../../../docs/integrations/assets.md) for service-account access, the committed content configuration, template authoring, stable asset identity and recovery. Forward `slides-ready` with the file URL to communications.

<!-- examples:end -->
<!-- contributing:start -->
<!-- contributing:end -->
<!-- security:start -->
<!-- security:end -->
<!-- license:start -->
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
