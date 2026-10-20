<!-- header:start -->

# GitHub Reusable Workflow: Synchronize Conference Hall speakers

<div align="center">
  <img src="../logo.svg" width="60px" align="center" alt="Synchronize Conference Hall speakers" />
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

## Synchronization behavior

Prepare one reviewed speaker synchronization PR in the private consumer
repository. Call this reusable workflow from scheduled and manual consumer
workflows; see [Conference Hall setup](../../docs/integrations/conference-hall.md).

There are no workflow outputs. Public destinations are skipped, and the action
independently verifies repository privacy. A repository-wide concurrency group
serializes imports. The branch merges the current default branch and preserves
local changes; conflicts or a human-authored branch head require reconciliation.
An exact-head push lease prevents replacing a concurrently updated PR branch.
Unchanged input opens no new PR. No automatic merge is enabled.

The workflow publishes only when candidate preparation emits `pr-title`.
Expected catalog or mapping corrections keep CI successful but block publication;
technical failures fail CI. Both can update guidance on an existing private PR.
The PR links its latest successful snapshot refresh. Blocked runs preserve the
last merged snapshot. Existing linked profiles refresh directly from Conference
Hall during event runs, independently of snapshot PR merges. New identities
become available after their mappings are merged. Merging
requires the consumer's referential/form checks and an active-event audit caller
for catalog pushes. Credentials are explicitly forwarded and action bundles
come from the same pinned automation revision as this workflow.

<!-- usage:start -->

## Usage

```yaml
name: Synchronize Conference Hall speakers
on:
  push:
    branches:
      - main
permissions: {}
jobs:
  synchronize-conference-hall-speakers:
    uses: cloud-native-aixmarseille/meetup-event-automation/.github/workflows/synchronize-conference-hall-speakers.yml@c96cf1e15b7a8a824a706582f6ba328374a888df # 2.3.1
    permissions:
      contents: read
    secrets:
      # GitHub App private key.
      # This input is required.
      github-app-private-key: ""

      # Read-only Conference Hall event API key.
      # This input is required.
      conference-hall-api-key: ""
    with:
      # Language for generated reports (en or fr).
      # This input is required.
      locale: ""

      # GitHub App client ID for the private consumer repository.
      # This input is required.
      github-app-client-id: ""

      # Conference Hall CFP slug.
      # This input is required.
      conference-hall-event: ""
```

<!-- usage:end -->
<!-- inputs:start -->

## Inputs

### Workflow Call Inputs

| **Input**                   | **Description**                                           | **Required** | **Type**   | **Default** |
| --------------------------- | --------------------------------------------------------- | ------------ | ---------- | ----------- |
| **`locale`**                | Language for generated reports (en or fr).                | **true**     | **string** | -           |
| **`github-app-client-id`**  | GitHub App client ID for the private consumer repository. | **true**     | **string** | -           |
| **`conference-hall-event`** | Conference Hall CFP slug.                                 | **true**     | **string** | -           |

<!-- inputs:end -->
<!-- secrets:start -->

## Secrets

| **Secret**                    | **Description**                          | **Required** |
| ----------------------------- | ---------------------------------------- | ------------ |
| **`github-app-private-key`**  | GitHub App private key.                  | **true**     |
| **`conference-hall-api-key`** | Read-only Conference Hall event API key. | **true**     |

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
