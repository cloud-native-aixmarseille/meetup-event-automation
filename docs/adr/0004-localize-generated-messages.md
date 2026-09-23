# ADR 0004: Localize generated messages at presentation boundaries

Status: Accepted

## Context

Actions, issue comments, and generated guidance need consistent languages,
actionable diagnostics, and stable workflow contracts. Formatting is shared
infrastructure. The wording, keys, and arguments belong to the component that
presents them; a shared formatter should not know event or GitHub concepts.

## Decision

Use `@meetup-automation/localization` in `packages/presentation/localization`
as a catalog-agnostic adapter around
[`@formatjs/intl`](https://formatjs.github.io/docs/intl/).
FormatJS owns message lookup, compiled-message caching, ICU formatting, and
fallback to English defaults. The adapter owns the supported-locale policy,
a typed formatting interface, per-instance configuration, and private error
handling. Its source contains no feature translations or global message registry.

Each presenter owns its English/French catalogs, message-key type, argument
types, and catalog tests:

| Presenter                                 | Catalog location                                            |
| ----------------------------------------- | ----------------------------------------------------------- |
| Action reports and diagnostic annotations | `packages/runtime/github-actions/src/i18n`                  |
| Managed issue comments                    | `packages/adapter/github-event-comment-repository/src/i18n` |
| Generated speaker guidance                | `packages/adapter/yaml-issue-form-projection/src/i18n`      |
| Organizer notifications                   | `packages/runtime/github-actions/src/notifications`         |

Action diagnostics translate domain codes for the reporting surface; those
translations belong to the reporting presenter. Comment guidance deliberately
uses its own wording and allowlist. The Slack gateway only transports prepared
content; notification wording and its approval revision belong to the runtime
that prepares that content.

Each action resolves its optional `locale` input through `ActionRunner`.
English is the default. Supported regional variants resolve to their base
language; unsupported or malformed values fall back to English. The runner
injects `ActionMessages` into the operation. Composition passes the resolved
locale to adapters, which create their own scoped translators. There is no
global mutable locale or network translation lookup.

Presentation infrastructure has no workspace dependencies. Runtime and adapters
may depend on it; domain and application packages may not. Applications receive
rendered notification content and its content-policy revision as data.

Catalog keys describe meaning rather than English wording. Every supported
locale must contain the owner's complete key set and interpolation arguments.
FormatJS supplies a defensive English fallback for missing, empty, or malformed
translations, using English formatting rules for the fallback. Its default
console error handlers are disabled because formatting errors can include
interpolation values. Catalog tests catch translation mistakes before release.

English diagnostic messages remain canonical in JSON. French reports translate
diagnostics by stable code; unknown codes retain their already-redacted English
fallback. Comments continue to allow only known guidance and safe field names.
Translation does not replace redaction or output escaping.

Protocol values remain stable: codes, severities, field paths, output envelopes,
labels, issue headings, comment markers, approval/ledger records, and external
mail template identifiers. Comment headings match the issue sections organizers
must edit. Static GitHub workflow metadata remains English.

## Consequences

All six actions and four reusable workflows expose the same locale input.
Reports, failure guidance, generated speaker guidance, managed diagnostic
comments, and organizer notifications use it. Workflow check and form-update
callers must select the same locale to avoid projection drift.

Changing notification language invalidates prior communication approval.
The original English content revision remains compatible with existing
approvals. Localized content revisions affect approval policy facts only:
delivery idempotency keys stay unchanged, so changing language does not resend
recorded deliveries. The notification presenter owns the content revision;
update it when notification wording changes. External mail rendering keeps its
existing payload contract.

Owner-local catalog tests validate key parity, ICU syntax, and declared
parameters using a shared test helper. Generic formatter tests cover fallback,
privacy, and isolation between owners even when they reuse a key. Reporting
contracts enforce diagnostic coverage, scoped message types, public locale
wiring, and the absence of feature catalogs in shared infrastructure.
Architecture tests keep localization out of business rules.
