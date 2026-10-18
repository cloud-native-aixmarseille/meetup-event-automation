# Synchronize Conference Hall speakers

Prepare a validated private speaker CSV, stable-ID allocation state and issue
form from one Conference Hall export. The action verifies repository privacy
through GitHub before reading the source or writing candidate files. It does not
commit, push, merge or dispatch mail. Use the
[synchronization workflow](../../../.github/workflows/synchronize-conference-hall-speakers.md)
for branch concurrency and reviewed publication.

| Input                     | Required | Meaning                                   |
| ------------------------- | -------- | ----------------------------------------- |
| `locale`                  | No       | Report language, `en` by default or `fr`. |
| `github-token`            | Yes      | Token for verifying repository privacy.   |
| `conference-hall-event`   | Yes      | CFP slug.                                 |
| `conference-hall-api-key` | Yes      | Event Web API key.                        |

| Output                | Meaning                                                |
| --------------------- | ------------------------------------------------------ |
| `changed`             | Whether the catalog, allocation state or form changed. |
| `speaker-count`       | Validated candidate speaker count.                     |
| `retry-after-seconds` | Required retry delay after rate limiting.              |
| `pr-title`            | Localized PR title.                                    |
| `pr-body`             | Localized review guidance or failed-stage diagnostics. |
| `diagnostics`         | Redacted shared-runner diagnostic JSON.                |

Any failed synchronization fails the action and prevents workflow publication.
Annotations and the job summary identify the failed stage and provide recovery
instructions. Source failures include safe HTTP statuses or zero-based invalid
field positions; catalog validation retains its specific diagnostic codes.
Committed mappings and local supplements remain unchanged. Event runs still require a fresh source profile snapshot. See [Conference Hall setup and
recovery](../../../docs/integrations/conference-hall.md).
