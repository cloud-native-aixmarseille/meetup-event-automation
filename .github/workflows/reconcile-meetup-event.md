# Create or update Meetup event

Reusable workflow: [reconcile-meetup-event.yml](reconcile-meetup-event.yml).

Creates a draft or updates an existing event from a consumer meetup issue.
Requests organizer approval through an issue comment and Slack, then publishes
approved drafts automatically. The issue links to both
drafts and published events; **Meetup event published** under **Communication**
records the verified status. The authoritative setup and recovery guide is [Meetup publication](../../docs/integrations/meetup-publication.md).

## Inputs and secrets

All inputs and secrets are required; there are no defaults or workflow outputs.

| Input                        | Purpose                                                    |
| ---------------------------- | ---------------------------------------------------------- |
| `issue-number`               | Source meetup issue number, as a number.                   |
| `locale`                     | Report language (`en` or `fr`).                            |
| `github-app-client-id`       | App used to mint the consumer repository token.            |
| `conference-hall-event`      | Conference Hall CFP slug.                                  |
| `slack-organizer-channel-id` | Organizer channel receiving publication approval requests. |
| `gemini-model`               | Gemini vision model for pre-login hCaptcha handling.       |

| Secret                    | Consumer Actions secret                 |
| ------------------------- | --------------------------------------- |
| `github-app-private-key`  | Existing GitHub App private key.        |
| `conference-hall-api-key` | Existing read-only Conference Hall key. |
| `meetup-email`            | `MEETUP_EMAIL`                          |
| `meetup-password`         | `MEETUP_PASSWORD`                       |
| `slack-token`             | `SLACK_BOT_TOKEN`                       |
| `gemini-api-key`          | `GEMINI_API_KEY`                        |

## Runtime and permissions

The workflow checks out the consumer and loads automation code from its own
pinned revision. It installs lockfile dependencies, Chromium, Python 3.14, and
the pinned solver dependencies. It grants `contents: read` to the workflow and
mints a consumer-scoped App token with contents read and issues write.

The job holds `meetup-event-REPOSITORY_ID-ISSUE_NUMBER`, the same lock used by other
event writers, with cancellation disabled and a 15-minute timeout. Meetup and
Gemini credentials reach only the publication step. The workflow uploads no
browser state or artifacts. Callers subscribe to event issue changes and `issue_comment: [edited]` to
resume approved publication automatically, and pin a published full commit SHA.
The reusable workflow filters comment events to human edits of bot publication
approval comments; the approval adapter verifies the author and exact content.
