# Shared feedback link

`actions/publication/reconcile-feedback` runs in the issue-update and daily-audit
workflows under their shared per-event concurrency lock. It uses an existing
`OpenFeedback Link` from the issue and updates the configured Kutt link on the
event day. `check` validates the URL without writes; `fix` also normalizes the
issue URL and updates the due short link. Both modes require a Kutt API key and
the existing link ID.

## API limitation: poll creation

The live [OpenFeedback API schema](https://api.openfeedback.io/openapi.json)
currently exposes only these authenticated operations:

- `GET /organizations/me`
- `GET /events/me`
- `GET /events/{projectId}/votes`

There is no published API-key endpoint for creating events, talks or speakers.
Automatic poll creation (meetups issue #150) therefore remains blocked on
upstream API support. Missing links produce the
`publication.feedback.creation-unsupported` diagnostic. Create the poll in
OpenFeedback and enter its public URL in the issue until a supported write API
is available. The automation never falls back to account passwords, Firebase
login or direct database writes.

## Consumer setup

First publish an automation release containing this action and pin both consumer
workflows to that immutable commit. Then forward these inputs and secrets:

| Required consumer setting        | Reusable workflow parameter | Purpose                                                   |
| -------------------------------- | --------------------------- | --------------------------------------------------------- |
| Secret `KUTT_API_KEY`            | Secret `kutt-api-key`       | API key belonging to the owner of the existing short link |
| Variable `KUTT_FEEDBACK_LINK_ID` | Input `kutt-link-id`        | The existing link's API `id`, not its short address       |

Both settings are mandatory in the public action and reusable workflows.
Missing or blank values fail the action before any GitHub or Kutt request,
including in `check` mode. Retrieve the API key through the private credential
store and never commit it. This flow uses the public poll URL and does not call
the OpenFeedback API, so it needs no OpenFeedback credentials.

The optional `OpenFeedback Link` field accepts
`https://openfeedback.io/<project-id>` and public date-selector URLs. It is
compatible with historical issues and does not affect event readiness. Talk
content and voting forms remain managed in OpenFeedback.

## Timing and retries

The shared Kutt link switches only on the event's calendar day in Europe/Paris.
Preparing future events and rechecking past events cannot take it over. The
scheduled audit must run on that day; a missed day requires a manual Kutt update.
Closed, cancelled, postponed and unrelated issues are skipped. Multiple active
meetups on the same date produce a diagnostic and leave the link unchanged.
An existing poll does not require a complete agenda in the issue.

The adapter paginates the owner's Kutt v2 links, locates the configured ID and
patches only its target while preserving its address. A matching target is a
no-op. Missing short links are never recreated. Poll contents and votes are
never modified.

The issue revision is checked before persisting a normalized URL and before
changing Kutt. Network failures and response bodies are redacted from errors.
Requests have timeouts and do not follow redirects with API keys. Tests use
synthetic HTTP responses and never require production keys.

The implementation follows the [OpenFeedback API](https://api.openfeedback.io/)
and the [Kutt v2 API contract](https://github.com/thedevs-network/kutt/blob/main/docs/api/api.js).
