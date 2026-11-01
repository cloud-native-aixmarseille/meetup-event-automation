# Configuration

Configure the consumer repository through GitHub repository variables, secrets,
and reusable workflow inputs. Optional managed asset contracts and public field
assignments use the committed configuration described below.
The names below match the [setup examples](../usage/setup.md); the workflow
parameter names are the public contract.

## Required settings

| Consumer setting                            | Workflow parameter                      | Used by                                                          |
| ------------------------------------------- | --------------------------------------- | ---------------------------------------------------------------- |
| Variable `MEETUP_EVENT_URL_PREFIX`          | Input `meetup-event-url-prefix`         | Event, publication, communication, and attention reconciliation. |
| Variable `COMMUNITY_EVENT_URL_PREFIXES`     | Input `community-event-url-prefixes`    | Event, publication, communication, and attention reconciliation. |
| Variable `ASSET_FOLDER_URL_PREFIX`          | Input `asset-folder-url-prefix`         | Event, publication, communication, and attention reconciliation. |
| Variable `CI_BOT_APP_CLIENT_ID`             | Input `github-app-client-id`            | Event workflows and form synchronization.                        |
| Secret `CI_BOT_APP_PRIVATE_KEY`             | Secret `github-app-private-key`         | Event workflows and form synchronization.                        |
| Variable `KUTT_BASE_URL`                    | Input `kutt-base-url`                   | Both event workflows.                                            |
| Variable `KUTT_FEEDBACK_LINK_ID`            | Input `kutt-link-id`                    | Both event workflows.                                            |
| Secret `OPENFEEDBACK_API_KEY`               | Secret `openfeedback-api-key`           | Both event workflows.                                            |
| Secret `KUTT_API_KEY`                       | Secret `kutt-api-key`                   | Both event workflows.                                            |
| Secret `GOOGLE_SERVICE_ACCOUNT_CREDENTIALS` | Secret `google-credentials`             | Both event workflows.                                            |
| Variable `GOOGLE_DRIVE_FOLDER_ID`           | Input `google-drive-folder-id`          | Both event workflows.                                            |
| Variable `GOOGLE_DRIVE_PUBLIC_FOLDER_ID`    | Input `google-drive-public-folder-id`   | Both event workflows.                                            |
| Variable `GOOGLE_DRIVE_TEMPLATE_FOLDER_ID`  | Input `google-drive-template-folder-id` | Both event workflows.                                            |
| Secret `SLACK_BOT_TOKEN`                    | Secret `slack-token`                    | Both event workflows.                                            |
| Variable `SLACK_ORGANIZER_CHANNEL_ID`       | Input `slack-organizer-channel-id`      | Both event workflows.                                            |

Use the GitHub App's client ID. Install the App on the consumer repository and
`mailings` under the same owner. Both event workflows generate a separate,
short-lived token for email dispatch to that owner's `mailings` repository. See
[communications](../integrations/communications.md) for permissions.

The OpenFeedback key must be an organization key beginning with `oforg_`.
It is required even when an issue already contains a feedback URL.
The Kutt link ID is the API identifier of an existing link, not its short URL.
Drive settings contain folder IDs. `GOOGLE_DRIVE_PUBLIC_FOLDER_ID` identifies
the root containing `slides` and `tmp-covers`, not either child folder.
See [Drive](../integrations/assets.md#export-the-presentation-pdf) and
[feedback](../integrations/feedback.md) for setup requirements. The
referential/form validation workflow requires no credentials.

Pass inputs and secrets explicitly in each caller. Defining a repository secret
does not forward it to a reusable workflow.

## Event publication

The [publication workflow](../../.github/workflows/event-reconcile.yml)
uses `.github/event-publication.json` for the common schedule, public venues,
and configured destination collection. The required `publication-credentials`
secret contains credentials keyed by enabled provider. Meetup requires email,
password, and AI settings; OCGroups requires username and password. The workflow
also uses the shared GitHub App, Conference Hall, and Slack settings.
See [event publication](../integrations/event-publication.md) for the complete
configuration, credential schema, caller, approval, and recovery procedures.
Review of content proposals or organizer submissions reads its schedule from the
same file, including when an explicit empty destination collection keeps
publication manual. Automatic event copy preparation also requires this file.

## AI configuration

AI generation actions require the same three inputs, without defaults:

| Action input  | Reusable workflow parameter | Purpose                               |
| ------------- | --------------------------- | ------------------------------------- |
| `ai-provider` | String input `ai-provider`  | Supported provider identifier.        |
| `ai-model`    | String input `ai-model`     | Explicit model for that provider.     |
| `ai-api-key`  | Secret `ai-api-key`         | API key authorized to use that model. |

The preparation drafts and reconciliation workflows compose text and image
actions. They require
`ai-text-model` and `ai-image-model` instead of a single `ai-model`, and forward
each to the corresponding action's `ai-model`. Both are required for every call;
unselected operations do not run. `ai-provider` and the `ai-api-key` secret are
shared. See [draft generation](../integrations/content.md#generate-a-proposal)
for selections and model capabilities. Promotion workflows use the single-model parameters in the table.

Publication configures AI conditionally in `publication-credentials.meetup.ai`
with required `provider`, `model`, and `apiKey` fields. It uses the same runtime
`AiInput.validate` contract; there are no separate workflow AI inputs. Only a
configured Meetup adapter requires AI and the Python challenge solver. An
OCGroups-only collection requires neither. The credentials parser masks all
decoded secret values before invoking the shared validator.

The supported provider identifier is `gemini`. Meetup publication requires a
model with image input and structured output for login challenges, and text
generation for event topics, with API quota available to the supplied key.
Both model and key must be nonblank. There is no automatic provider
or model selection. Actions without AI behavior do not accept these inputs.

The shared runtime `AiInput` parser validates these inputs and masks the API key
before use. Runtime composition injects the validated configuration and maps it
to the provider adapter's credentials. Provider-specific names remain inside
that boundary; callers use the shared inputs or the conditional adapter object
described above.

Repository variable and secret names belong to the caller. `AI_PROVIDER`,
`AI_MODEL`, and `AI_API_KEY` are suitable storage names, but an existing secret
can be forwarded directly without renaming it. For example, this partial
reusable workflow caller uses a stored `GEMINI_API_KEY`:

```yaml
with:
  ai-provider: ${{ vars.AI_PROVIDER }}
  ai-model: ${{ vars.AI_MODEL }}
secrets:
  ai-api-key: ${{ secrets.GEMINI_API_KEY }}
```

Set `AI_PROVIDER` to `gemini` and `AI_MODEL` to the intended supported model.
Forward the key explicitly as a reusable workflow secret, or as `ai-api-key`
under `with` when invoking an action directly. Keep keys out of repository
variables and committed files.

## Language

The required `locale` workflow input accepts English (`en`) or French (`fr`)
without a default. Use the same `locale` in all callers. Regional French variants such as `fr-FR`
resolve to French; unsupported values fall back to English. Changing locale
requires issue-form synchronization. See
[localization](../development/localization.md) for covered messages and stable
identifiers.

## Publication URL inputs

`meetup-event-url-prefix`, `community-event-url-prefixes`, and
`asset-folder-url-prefix` are separate settings, each validated independently
without a default. Event, publication, communication, and organizer-attention
reconciliation actions check full event readiness and therefore require all three.
The three reusable event workflows forward these inputs explicitly. Event listing
and referential actions do not use them. Keep each setting consistent across the
consumer's issue-update, audit, and publication callers.

`meetup-event-url-prefix` supplies the HTTPS origin and authorized Meetup group
and ends in `/events/`. Login, account navigation, and event redirects use that
origin, including its port when specified. Event links must match both that
origin and group; no provider origin is supplied by the code.
`community-event-url-prefixes` is a JSON string containing a nonempty
array of nonempty HTTPS URL prefixes. `asset-folder-url-prefix` is the HTTPS
prefix accepted for event asset folders; it must match the folder URLs emitted
by the configured asset provider. Prefixes cannot contain credentials, query
strings, or fragments. Missing or malformed configuration fails before event
reconciliation or external writes.

Store these values in the repository variables `MEETUP_EVENT_URL_PREFIX`,
`COMMUNITY_EVENT_URL_PREFIXES`, and `ASSET_FOLDER_URL_PREFIX`, then forward them
as shown in [setup](../usage/setup.md#3-add-workflow-callers). For a direct caller,
this synthetic `with` block shows the required string and JSON formats:

```yaml
with:
  meetup-event-url-prefix: https://www.meetup.com/example-group/events/
  community-event-url-prefixes: '["https://community.example.test/events/", "https://events.example.test/community/"]'
  asset-folder-url-prefix: https://drive.google.com/drive/folders/
```

Meetup event links must use the configured group and a positive decimal event ID
without leading zeros. Query parameters and fragments are not part of an event
identity. A final slash is optional in issue links; automation stores canonical
links with a final slash in its publication journal and approval requests.

Use OpenFeedback event URLs for feedback; its provider identity is validated
separately from these caller-owned prefixes.

## Fixed conventions

These values are part of the automation release, not caller options:

| Setting                     | Value                                  |
| --------------------------- | -------------------------------------- |
| Event timezone              | `Europe/Paris`                         |
| Issue form                  | `.github/ISSUE_TEMPLATE/meetup.yml`    |
| Host catalog                | `referentials/hosting.csv`             |
| Speaker catalog             | `referentials/speakers.csv`            |
| Near-event readiness window | 7 days                                 |
| Email dispatch repository   | `<consumer-repository-owner>/mailings` |

## Labels

Create these labels in the consumer repository:

| Label                | Meaning                                 |
| -------------------- | --------------------------------------- |
| `meetup`             | Marks an issue as a meetup.             |
| `speakers:needed`    | Speaker participation is not confirmed. |
| `speakers:confirmed` | Organizer confirms the speakers.        |
| `event:postponed`    | Meetup is postponed.                    |
| `event:held`         | Meetup took place.                      |
| `event:cancelled`    | Meetup is cancelled.                    |

Host participation is determined by the selected **Hoster** value. No host label
is required. Speaker `needed` labels follow the confirmation state. Use at
most one `event:*` status label. An open issue without a status label is
scheduled; closing it marks it held unless an explicit status says otherwise.
The date passing alone does not mark an event held. It enables
[post-event follow-up](../integrations/communications.md#when-messages-are-due)
from the next Paris calendar day, with organizer approval still required for mail.

Email tasks use completion checkboxes. See
[approval and automatic completion](../integrations/communications.md) for task names, timing,
and duplicate protection.

`SLACK_ORGANIZER_CHANNEL_ID` selects the dedicated meetup organizer channel for
approval requests and actionable organizer reminders. Public Slack destinations
come from `.github/meetup-social.json`. See
[channel selection](../integrations/communications.md#organizer-and-public-channels).

## Conference Hall

Use the [Conference Hall guide](../integrations/conference-hall.md) for the required
`conference-hall-event` input, `conference-hall-api-key` secret, live profile refresh, reviewed identity
synchronization, selected proposals and consumer workflow triggers.

## Managed asset content

Author expressions directly in Google Slides or Docs templates. The automation
discovers text and image bindings; no asset configuration file is required.
Numbered talks and speakers follow the current agenda order. Public venue and
logo data belong in the host referential. The
[asset guide](../integrations/assets.md#author-managed-content) describes fields,
locations, automatic fallbacks, and optional one-time recovery operations.

## Promotional content

The [content guide](../integrations/content.md) owns `.github/meetup-content.json`,
text/image model capabilities, public media prerequisites, and recovery.
Content generation uses the shared AI inputs. Review and manual submission do
not require AI credentials. Event reconciliation prepares title, description, and
four cover proposals automatically and requires text and image AI settings and
all three configuration files. The standalone review action can skip configuration when no verified
content work exists; see the content guide for the exact conditions.

## Social publication

The [social publication guide](../integrations/social-publication.md) owns the
required `.github/meetup-social.json` allowlist, conditional `social-credentials`
secret, scheduled and event-triggered callers, publication approval, and recovery.
Draft generation and review of content proposals or organizer submissions also
read this file. For those operations, use `{"version":1,"destinations":[]}` when no
social destinations are enabled. Automatic event copy preparation also reads this
file. Missing configuration never falls back to predefined channels.
