# GitHub Reusable Workflow: Synchronize Conference Hall speakers

Prepare one reviewed speaker synchronization PR in the private consumer
repository. Call this reusable workflow from scheduled and manual consumer
workflows; see [Conference Hall setup](../../docs/integrations/conference-hall.md).

| Input                   | Required | Meaning                                          |
| ----------------------- | -------- | ------------------------------------------------ |
| `locale`                | No       | English by default; `fr` is supported.           |
| `github-app-client-id`  | Yes      | GitHub App installed on the consumer repository. |
| `conference-hall-event` | Yes      | CFP slug.                                        |

| Secret                    | Required | Meaning                                               |
| ------------------------- | -------- | ----------------------------------------------------- |
| `github-app-private-key`  | Yes      | App key for Contents: write and Pull requests: write. |
| `conference-hall-api-key` | Yes      | Read-only CFP Web API key.                            |

There are no workflow outputs. Public destinations are skipped, and the action
independently verifies repository privacy. A repository-wide concurrency group
serializes imports. The branch merges the current default branch and preserves
local changes; conflicts or a human-authored branch head require reconciliation.
An exact-head push lease prevents replacing a concurrently updated PR branch.
Unchanged input opens no new PR. No automatic merge is enabled.

The PR links its latest successful snapshot refresh. Failed runs preserve the
last merged snapshot. Existing linked profiles refresh directly from Conference
Hall during event runs, independently of snapshot PR merges. New identities
become available after their mappings are merged. Merging
requires the consumer's referential/form checks and an active-event audit caller
for catalog pushes. Credentials are explicitly forwarded and action bundles
come from the same pinned automation revision as this workflow.
