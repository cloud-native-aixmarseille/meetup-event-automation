# Review meetup content

Generate or submit event titles, descriptions, covers, and social post drafts,
then review their exact text and images on the meetup issue. Approval applies to
one revision. Changed public facts, wording, language, or image bytes require a
new review.

Content approval does not send a social post, complete its manual checklist
item, approve an email batch, or authorize initial Meetup publication.

## Configure the repository

Routine reconciliation checks stored proposals and authenticated organizer
submissions before loading content settings. With neither present, review
completes without `.github/meetup-content.json`, `.github/event-publication.json`,
or `.github/meetup-social.json`. Consumers that use neither content proposals nor
publication workflows can omit these files. Keep the independent
[Drive asset configuration](assets.md#author-managed-content) when rendering
managed templates.

Generation, review of existing proposals, and imports of valid submissions
require all three files. Failed or unverifiable reads of proposal state or
submissions fail the action; they never count as an empty review.

Provide the public venue and event hours in
[`.github/event-publication.json`](event-publication.md). Add
`.github/meetup-content.json`:

```json
{
  "version": 1,
  "months": { "2026-11": "Novembre" },
  "mentions": ["Example Organizer"],
  "reminderTime": "09:00",
  "guidance": "Keep the wording concise and factual.",
  "announcements": {}
}
```

Also commit the explicit destination list in
[`.github/meetup-social.json`](social-publication.md#configure-destinations),
including an empty list when no social channels are enabled. Generation and
review accept social targets only from that configuration. A target uses the
configured stable key; changing its provider or remote identity requires new
content review. Removing it prevents further review or publication.

These are synthetic examples. Supply the exact month spelling to appear in the
cover, public organizer names intended for LinkedIn, and the local reminder
publication hour. The reminder hour must precede the event start on D0. The
workflow locale selects English or French content; submitted content records
its own language.

Use the service account already configured for Drive assets and the
[public asset layout](assets.md#export-the-presentation-pdf). Cover candidates live
in the existing `tmp-covers` child of `GOOGLE_DRIVE_PUBLIC_FOLDER_ID`. The service
account needs write access there. Generated files must have an `anyone` reader
permission, inherited or granted on each file before verification. The content
media adapter verifies this access but does not grant it or change folder access.
Content media use separate immutable files, with reserved Drive IDs and SHA-256
fingerprints. Existing documents, asset manifests, PDF files, and delivery
ledgers retain their identities. The media verifier reads file permissions
through the paginated Drive permissions API, including for shared-drive files
whose metadata omits permissions. Keep candidates referenced by reviews; the
folder name does not imply automatic deletion. Missing or ambiguous destination
folders keep generation pending for organizer recovery before reserving an image
or calling the provider. Transport failures remain technical action failures.

The GitHub App needs repository contents read and issues write. Organizer
reviewers and submission authors need current write, maintain, or admin
permission. Slack needs `chat:write` and `reactions:write` in the internal
organizer channel.

## Generate a proposal

Choose the workflow for the output you need:

| Workflow                                                                                     | Selection input                                                                             |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| [Generate preparation drafts](../../.github/workflows/event-preparation-generate-drafts.yml) | `targets`: a nonempty JSON array of distinct `title`, `description`, and/or `cover` values. |
| [Generate promotion post](../../.github/workflows/event-promotion-generate-post.yml)         | `target`: a configured destination key followed by `:announcement`, `:d7`, or `:d0`.        |

For all preparation outputs, pass `targets: '["title","description","cover"]'`.
To run only one output, pass a singleton such as `targets: '["cover"]'`.
Unknown or duplicate preparation targets fail validation before credentials or effects.
Promotion resolves the destination provider from the checked-out configuration
and rejects unlisted keys. For example, the configured key `engineering` uses
`engineering:d7` for its seven-day reminder.
Forward all inputs and secrets declared by the selected workflow: issue number,
locale, public URL prefixes, Conference Hall settings, organizer channel,
GitHub App credentials, Drive settings for review, and explicit AI configuration.
Pin it to the released automation commit used by the consumer repository.

Preparation runs the selected scoped actions in title, description, cover order,
then runs [organizer review](../../actions/organizer/review-drafts/action.yml) once.
A failed generator does not prevent the other selected generators or review from
running. Promotion runs the selected destination's action, then review.
Each proposal retains its own approval and recovery state.
Event copy and Slack generation actions accept no Google credentials. LinkedIn
generation needs Google credentials to verify its announcement image, and cover
generation also needs the public media folder. The shared review action needs
both for manual image imports and media verification; it accepts no AI inputs.

| Target                           | Proposal                                                                  |
| -------------------------------- | ------------------------------------------------------------------------- |
| `title`                          | One thematic headline, at most 80 characters.                             |
| `description`                    | Welcoming prose, practical details, ordered talk teasers, and invitation. |
| `cover`                          | Four separate image candidates, generated sequentially.                   |
| `<destination-key>:announcement` | One announcement using the configured provider's format.                  |
| `<destination-key>:d7`           | One reminder seven calendar days before the event.                        |
| `<destination-key>:d0`           | One reminder on the event day.                                            |

Slack uses emoji aliases. LinkedIn uses Unicode emoji, hashtags, a public mention
footer, and the verified announcement image. Each configured Slack channel has
its own proposal and stable target key; there is no fixed destination count.

Each target has its own proposal and approval. Titles and descriptions can be
generated before those fields exist. Each operation supplies only its relevant public facts: topics for titles and
covers, event details for descriptions, and event details plus registration and
channel-specific facts for social posts; private contact rows and entire issues are
not sent to the model. Unresolved generic announcement and post-event social
formats remain manual.

Descriptions are limited to 12,000 characters and the final description with
the authoritative agenda to 49,000. Social text is limited to 2,800 characters,
counted as JavaScript UTF-16 code units. Images must be PNG or JPEG, at most
20 MB and 25 megapixels. These conservative application limits leave room below
the supported destinations' limits; approval still includes visual and editorial
review.

Preparation requires `ai-provider`, `ai-text-model`, `ai-image-model`, and the
`ai-api-key` secret. Both model inputs are explicit even when selecting only text
or cover; only selected generation actions use their corresponding model.
Promotion requires `ai-provider`, `ai-model`, and the `ai-api-key` secret.
These workflow bindings feed the shared [action AI contract](../reference/configuration.md#ai-configuration).

The provider is `gemini`. Supported text models are `gemini-3.8-flash`,
`gemini-3.6-flash`, and `gemini-4-argon`. Supported cover models are
`gemini-nano-banana-2.1`, `gemini-3-pro-image`, and `gemini-3.1-flash-image`.
A text model cannot stand in for an image model. The adapter uses the
[Interactions API](https://ai.google.dev/gemini-api/docs/interactions-overview)
with `store: false`, no tools or conversation history, and
[structured JSON text output](https://ai.google.dev/gemini-api/docs/structured-output).
Every image request starts independently. No model response is automatically
published.

The cover brief prefers 1792×1024 PNG and the exact month as its only readable
text. The Gemini adapter maps that preference to supported JPEG output in
landscape 2K format; review shows
actual dimensions, MIME type, identity, and fingerprint. Inspect each candidate
for its month spelling, unwanted text, visual coherence, and topic relevance.
Dimensions and hashes are checked automatically; visual suitability is an
organizer decision. Failed or uncertain slots remain visible and are not silently
replaced with another request.

The month and the main technology, concept or practice of every talk guide the
cover. The brief requires recognizable subject-specific symbols, actions and
relationships within one scene. Generic technology scenery alone is insufficient.
Talk titles and abstracts are authoritative; the public event description supplies
additional context for subjects absent from those fields, including manual agendas
without proposal abstracts. This context is used only for covers, is retained in
their source fingerprint, and requires fresh review when changed. It does not feed
event-copy generation back into itself. With no validated agenda, the brief uses
only the month and general Cloud Native/community themes.

Routine meetup reconciliation imports submissions, finalizes reviews, applies
approved values, and reports the content stage independently of event, asset,
feedback, and communication work. Generation holds the event lock through review
and the shared organizer reporting workflow. Its content-stage evidence includes
every selected generator and review; unselected outputs are excluded. Failed,
skipped or missing selected evidence keeps unresolved tasks. Stages outside this
run retain their earlier checklist evidence until routine reconciliation evaluates
them.

## Supply the LinkedIn announcement image

LinkedIn uses the rendered managed announcement rather than the month-only cover.
Its filename comes from the linked Drive template, using the same
[filename expressions and date formats](assets.md#prepare-templates) as asset
reconciliation. For example, `[EVENT_DATE:YYYY-MM-DD]` selects the event date and
formats it numerically. The template controls the label and date placement;
month and weekday names use the workflow locale.
Export that single-slide presentation to PNG or JPEG and host the exported image
at a public HTTPS URL. Record its managed Drive source ID and current Drive
`version` in the date-specific configuration:

```json
{
  "sourceId": "MANAGED_ANNOUNCEMENT_FILE_ID",
  "sourceRevision": "123",
  "url": "https://images.example.org/announcement.png",
  "description": "Event announcement with the public venue and speaker details"
}
```

Place this object at `announcements["YYYY-MM-DD"]`. The source must remain the
managed `announcement` presentation for that date. Its `template_file_id` metadata
must identify the original announcement template, which must remain readable by
the service account. The workflow checks the source revision and managed metadata,
loads the linked template and verifies the copy's expected filename, then validates
the exported image bytes and dimensions. Review shows both the source revision and
the image hash.
Export again and update the configuration when the source changes. The organizer
checks that the export matches the source; this integration does not render
Slides automatically. Post-event PDF export remains a separate operation.

## Submit organizer-authored content

Add a new issue comment using this exact marker followed by JSON, without a
Markdown code fence:

```text
<!-- meetup-content-submission:v1 -->
{"target":"title","language":"fr","text":"Kubernetes au quotidien : déployer et observer","image":null}
```

For a cover, use `target: "cover"`, an empty `text`, and an `image` object with
`url` and `description`. The URL must serve public PNG or JPEG bytes. For a
LinkedIn post, supply its text with `image: null`; the configured announcement
image is attached to its review. Other text proposals use `image: null`.

The workflow verifies the current comment body, editor, and repository
permission, then creates a separate bot-owned review. Selecting a checkbox
inside submitted text does not approve it. Editing a submission creates a new
snapshot. Manual submissions use no AI credentials and remain available when
the AI provider is unavailable.

## Decide and apply

Edit only the checkbox for one choice in the bot's review comment:

- Approve the exact text, or one identified cover candidate.
- Reject this revision.
- Request another iteration.

Changing the preview and checking approval in the same edit is not a valid
approval. Decisions are final for their revision. The original Slack request
receives a distinct reaction for approval, rejection, or another iteration.

Run the generation workflow again for an iteration request. It verifies the
requester's current permission, records one new intent, and uses the current
bounded `guidance` from configuration. Repeating a run without a changed source,
a verified iteration, or an explicit recovery reuses existing work.

Approved titles and descriptions are applied through the issue codec. The issue
title wrapper and description display fences remain presentation details. Meetup
publication retains the authoritative agenda and its separate initial approval.
Later manual edits to proposal-managed fields block their use until reviewed.

Put `{{event.cover}}` in a placeholder image's alt title to bind the selected
cover. The automation discovers its location and requires the approved image;
no fallback is accepted. Rendering verifies the selected image bytes against the approved hash
and preserves existing binding conflict and recovery rules. This integration
does not upload a cover to the Meetup browser editor.

Reminders use calendar dates in the event's time zone, including daylight-saving
changes. D-7 and D0 each require approval for every destination. The planned hour
is shown in review. [Social publication](social-publication.md) requires a
separate publication approval and rechecks sources, media, destinations, and
timing before sending. A later day, event start, cancellation, or postponement
makes the reminder ineligible. Missed reminders are not posted on a later day.

## Recover uncertain work

A reserved generation call is never automatically retried. A rerun reads back an
uploaded image using its reserved ID; successful candidates remain available
for review even if another slot failed. An uncertain text request or missing
image artifact requires an explicit replacement intent or manual submission.
Interrupted manual image imports also read back the reserved file. If it is
absent, edit or replace the submission to create an explicit new import intent.

To authorize one replacement generation attempt, add a comment:

```text
<!-- meetup-content-recovery:v1 -->
{"proposalId":"content-00000000-0000-4000-8000-000000000001","guidance":"Try a different metaphor."}
```

Replace the synthetic ID with the uncertain proposal's ID from its managed
state, then run generation for that target. The current human editor must have
repository write permission. The recovery records that actor and comment
revision, preserves the old proposal, and is consumed once. A cover recovery
starts a new four-request batch; it does not silently retry an uncertain slot.

Do not edit or delete bot-owned proposal state. Restore damaged state from its
verified history before continuing. Media and proposal history are retained
until an organizer deliberately removes them; no automatic retention cleanup
runs. Provider-side `store: false` disables Interactions conversation storage;
provider account data policies still apply.
