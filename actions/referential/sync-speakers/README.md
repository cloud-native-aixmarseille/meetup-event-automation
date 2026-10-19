# Synchronize Conference Hall speakers

Prepare a validated private speaker CSV, stable-ID allocation state and issue
form from one Conference Hall export. The action verifies repository privacy
through GitHub before reading the source or writing candidate files. It does not
commit, push, merge or dispatch mail. Use the
[synchronization workflow](../../../.github/workflows/synchronize-conference-hall-speakers.md)
for branch concurrency and reviewed publication.

| Input                     | Required | Meaning                                 |
| ------------------------- | -------- | --------------------------------------- |
| `locale`                  | Yes      | Report language, `en` or `fr`.          |
| `github-token`            | Yes      | Token for verifying repository privacy. |
| `conference-hall-event`   | Yes      | CFP slug.                               |
| `conference-hall-api-key` | Yes      | Event Web API key.                      |

| Output     | Meaning                                                |
| ---------- | ------------------------------------------------------ |
| `pr-title` | Localized PR title.                                    |
| `pr-body`  | Localized review guidance or failed-stage diagnostics. |

Any failed synchronization fails the action and prevents workflow publication.
Annotations and the job summary identify the failed stage and provide recovery
instructions. Source failures include safe HTTP statuses or zero-based invalid
field positions; catalog validation retains its specific diagnostic codes.
Committed mappings and local supplements remain unchanged. Event runs still require a fresh source profile snapshot. See [Conference Hall setup and
recovery](../../../docs/integrations/conference-hall.md).
<!-- header:start -->

# GitHub Action: Synchronize Conference Hall speakers

<div align="center">
  <img src="../../../.github/logo.svg" width="60px" align="center" alt="Synchronize Conference Hall speakers" />
</div>

---

<!-- header:end -->
<!-- badges:start -->

[![Marketplace](https://img.shields.io/badge/Marketplace-synchronize--conference--hall--speakers-blue?logo=github-actions)](https://github.com/marketplace/actions/synchronize-conference-hall-speakers)
[![Release](https://img.shields.io/github/v/release/cloud-native-aixmarseille/meetup-event-automation)](https://github.com/cloud-native-aixmarseille/meetup-event-automation/releases)
[![License](https://img.shields.io/github/license/cloud-native-aixmarseille/meetup-event-automation)](http://choosealicense.com/licenses/mit/)
[![Stars](https://img.shields.io/github/stars/cloud-native-aixmarseille/meetup-event-automation?style=social)](https://img.shields.io/github/stars/cloud-native-aixmarseille/meetup-event-automation?style=social)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/cloud-native-aixmarseille/meetup-event-automation/blob/main/CONTRIBUTING.md)

<!-- badges:end -->
<!-- overview:start -->

## Overview

Prepare a validated private speaker catalog and issue form from one Conference Hall snapshot.

<!-- overview:end -->
<!-- usage:start -->

## Usage

```yaml
- uses: cloud-native-aixmarseille/meetup-event-automation/actions/referential/sync-speakers@1f22000828caf59f41d0a7d8815e5c5c0d3139f6 # 2.3.0
  with:
    # Language for generated reports (en or fr).
    # This input is required.
    locale: ""

    # Token used to verify the destination repository is private.
    # This input is required.
    github-token: ""

    # Conference Hall CFP slug.
    # This input is required.
    conference-hall-event: ""

    # Read-only Conference Hall event API key.
    # This input is required.
    conference-hall-api-key: ""
```

<!-- usage:end -->
<!-- inputs:start -->

## Inputs

| **Input**                     | **Description**                                             | **Required** | **Default** |
| ----------------------------- | ----------------------------------------------------------- | ------------ | ----------- |
| **`locale`**                  | Language for generated reports (en or fr).                  | **true**     | -           |
| **`github-token`**            | Token used to verify the destination repository is private. | **true**     | -           |
| **`conference-hall-event`**   | Conference Hall CFP slug.                                   | **true**     | -           |
| **`conference-hall-api-key`** | Read-only Conference Hall event API key.                    | **true**     | -           |

<!-- inputs:end -->
<!-- secrets:start -->
<!-- secrets:end -->
<!-- outputs:start -->

## Outputs

| **Output**     | **Description**                                |
| -------------- | ---------------------------------------------- |
| **`pr-title`** | Localized private synchronization PR title.    |
| **`pr-body`**  | Localized private synchronization PR guidance. |

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
