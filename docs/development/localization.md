# Localization

Action interfaces must require an explicit `locale` input with `required: true`
and no `default`, following the
[action interface rules](README.md#action-interface-rules). Callers pass the
selected language explicitly:

```yaml
with:
  locale: fr
```

Reusable workflows require an explicit `locale` input without a default and
forward its value to every owned action. English (`en`) and French (`fr`) are
supported. Regional forms such
as `fr-FR`, `fr-CA`, and `fr_CA` use French. Unsupported or malformed locales
fall back to English.

The selected language applies to managed issue comments, generated speaker
guidance, organizer notifications and safe failure messages. CI facts use compact
technical keys; diagnostic codes and field metadata are language independent.
Use the same locale for every workflow in a consumer repository, especially
referential checks and issue-form updates.
Changing locale makes the generated form stale until it is synchronized again.

Diagnostic JSON retains canonical English messages and stable codes, fields, and
severities. Existing labels, issue headings, IDs, comment markers, and
ledger formats also stay stable. Unknown diagnostic codes remain visible as
technical identifiers in CI and fail closed when they are not informational.
Organizer comments use safe localized guidance for unknown codes. Static workflow
metadata and externally rendered email bodies are outside these catalogs.

Changing notification language does not resend deliveries already recorded
in the ledger.

## Ownership

The shared `packages/presentation/localization` package wraps
[`@formatjs/intl`](https://formatjs.github.io/docs/intl/) and provides
formatting, locale normalization, and typed catalog contracts. It contains no
feature wording.

| Responsibility                                         | Catalogs and scoped translator                                                                            |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Asset dates and agenda text                            | `packages/runtime/github-actions/src/assets` - `AssetMessages`                                            |
| Technical reports, safe errors, and speaker review PRs | `packages/runtime/github-actions/src/i18n` — `ActionMessages`                                             |
| Organizer approval issue comments                      | `packages/adapter/journey/github-organizer-approval/src/i18n` - `ApprovalMessages`                        |
| Slack approval notifications                           | `packages/adapter/communication/slack-notification-gateway/src/i18n` - `SlackApprovalMessages`            |
| Managed issue comments                                 | `packages/adapter/event/github-event-comment-repository/src/i18n` — `EventCommentMessages`                |
| Issue-form speaker guidance                            | `packages/adapter/journey/yaml-issue-form-projection/src/i18n` — `IssueFormMessages`                      |
| Organizer attention issue comments                     | `packages/adapter/communication/github-organizer-attention/src/i18n` - `AttentionMessages`                |
| Slack organizer attention                              | `packages/adapter/communication/slack-notification-gateway/src/attention-i18n` - `SlackAttentionMessages` |
| Communication status comments                          | `packages/adapter/communication/github-delivery-ledger/src/i18n` — `LedgerMessages`                       |

Keep wording, keys, parameter types, and catalog tests with the presenter that
owns them. Pass the resolved locale across package boundaries; each owner
creates its own translator. Do not import another presenter's catalogs or
introduce a global message-key union. Domain and application rules continue to
emit stable diagnostic codes without translation dependencies.

## Adding or changing messages

1. Add a semantic key to the owning presenter's English catalog, then add its
   French translation. Keep complete sentences together.
2. Use ICU placeholders, `plural`, and `select` for variable text. Add typed
   arguments to that owner's `MessageParameters` and samples to its
   `catalog.test.ts`. Keep identifiers unformatted; use `{count, number}` for
   quantities. Owner-local tests validate syntax, key parity, and arguments.
3. Render with the owner's scoped translator. Action operations receive
   `ActionMessages` from `ActionRunner`; pass its `locale` through composition.
   Do not read ambient environment locale or maintain global language state.
4. Preserve redaction and destination escaping. Never pass raw exceptions,
   provider responses, or private catalog data into a template. FormatJS's
   default logging stays disabled to protect interpolation values.
5. Add relevant behavior tests when changing outbound notification wording.
   Preserve delivery idempotency keys.
6. Run `pnpm lint`, `pnpm build`, `pnpm test`, `pnpm package`, and
   `pnpm check:dist`. Commit regenerated bundles and public reference docs.

To add a language, extend the shared locale contract and normalization, add the
matching catalog in every owner, and extend catalog and notification
tests. Update public input descriptions and this guide. Missing or invalid
translations fall back to English using English formatting rules at runtime, but
incomplete catalogs still fail the development checks.

French catalogs (`*.fr.ts`) are excluded from the English-only Codespell check.
Keep English catalogs checked, and use a line-scoped `codespell:ignore`
directive only for valid French words in mixed-language tests. Review French
spelling when changing translations.
