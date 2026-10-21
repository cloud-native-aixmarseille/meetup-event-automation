# Create or update Meetup event

Create the event described by a consumer issue as a draft, or update its existing
Meetup event. Request organizer approval through the shared issue-comment and
Slack process, then publish an approved draft automatically. The action verifies saved fields, fills **Meetup Link** for drafts and
published events, and synchronizes **Meetup event published** under
**Communication** with the verified status. See
[Meetup publication](../../../docs/integrations/meetup-publication.md)
for configuration, prerequisites, recovery, and privacy boundaries.

## Inputs

Every input is required and has no default.

| Input                        | Purpose                                                       |
| ---------------------------- | ------------------------------------------------------------- |
| `issue-number`               | Source meetup issue number.                                   |
| `locale`                     | Report language (`en` or `fr`).                               |
| `github-token`               | Consumer token with contents read and issues write.           |
| `managed-comment-author`     | GitHub App bot login owning the publication journal.          |
| `conference-hall-event`      | Conference Hall CFP slug.                                     |
| `conference-hall-api-key`    | Read-only event API key.                                      |
| `meetup-email`               | Authorized organizer account email.                           |
| `meetup-password`            | Organizer password; whitespace is preserved.                  |
| `gemini-api-key`             | Gemini key for pre-login hCaptcha handling.                   |
| `slack-token`                | Slack bot token for approval requests and decision reactions. |
| `slack-organizer-channel-id` | Organizer Slack channel for publication approval.             |
| `gemini-model`               | Explicit model supporting image input and structured output.  |

## Execution

Use the [reusable workflow](../../../.github/workflows/reconcile-meetup-event.md),
which checks out the consumer's configuration, installs Chromium and locked
solver dependencies, scopes credentials, and holds the event concurrency lock.
Direct callers must provide the same runtime and lock. There are no action
outputs. The journal retains the remote identity for recovery. The shared action report provides a draft review URL, status,
and recovery guidance.
