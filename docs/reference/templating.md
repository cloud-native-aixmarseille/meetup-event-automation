# Template expressions

Drive filenames, Google Slides text shapes, and Google Docs body text and image alt titles use the
same template parser and renderer. Each feature supplies its permitted public
fields. The templater does not access event objects, contacts, files, or services.

## References and operands

Use `{{entity.property}}` for a field, for example `{{event.title}}`. Nested
properties use dots, as in `{{next_event.host.name}}`. The registered aggregate
field `{{agenda}}` has no entity prefix.

The uppercase form `[ENTITY_PROPERTY]` uses the first underscore to separate the
entity from its property. `[EVENT_DATE]` and `{{event.date}}` refer to the same
field; `[HOST_POSTAL_CODE]` refers to `host.postal_code`.

The `:` operator supplies an operand whose meaning belongs to the field:

- A calendar date accepts a format: `[EVENT_DATE:YYYY-MM-DD]` or
  `{{event.date:D MMMM YYYY}}`.
- A participant field selects its current agenda position:
  `{{talk.title:1}}` or `{{speaker.name:1}}`.

Filename templates permit only the event date and require an explicit format.
Managed document fields are discovered directly from the template. Put image
expressions such as `{{speaker.picture:1}}` or `{{host.logo}}` in the image's alt
title. See [asset authoring](../integrations/assets.md#author-managed-content)
for the allowed fields and agenda ordering. Formatting cannot select a participant.

Names without expressions and ordinary labels such as `[Draft]` remain literal.
Malformed expressions and unregistered fields are rejected. Values are inserted
once as literal text, even if they contain template syntax or HTML. There is no
recursive evaluation, arbitrary property access, or executable expression syntax.

## Date formats

| Pattern tokens | Meaning                                          |
| -------------- | ------------------------------------------------ |
| `YYYY`, `YY`   | Four-digit or two-digit year                     |
| `M`, `MM`      | Month number, without or with a leading zero     |
| `MMM`, `MMMM`  | Abbreviated or full localized month name         |
| `D`, `DD`      | Day of the month, without or with a leading zero |
| `ddd`, `dddd`  | Abbreviated or full localized weekday name       |

Combine tokens with spaces, hyphens, underscores, dots, or slashes. The named
formats `long`, `month`, and `weekday` produce a localized long date, full month
name, or full date including the weekday. Month and weekday names use the
workflow locale. Numeric patterns retain the requested order and ASCII digits.
All formats preserve the event's calendar day independently of the runner's
timezone. Invalid calendar dates and unsupported patterns are rejected.

For event date `2027-04-05`:

| Expression                   | Locale | Result         |
| ---------------------------- | ------ | -------------- |
| `[EVENT_DATE:YYYY-MM-DD]`    | `en`   | `2027-04-05`   |
| `{{event.date:DD/MM/YYYY}}`  | `fr`   | `05/04/2027`   |
| `[EVENT_DATE:D MMMM YYYY]`   | `fr`   | `5 avril 2027` |
| `{{event.date:D MMMM YYYY}}` | `en`   | `5 April 2027` |

## Document ownership

The common parser reports exact UTF-16 ranges for the authored expressions.
Slides binds one expression to an entire supported text shape. Docs binds each
occurrence in a supported body paragraph to a named range. See the
[asset guide](../integrations/assets.md) for supported locations, styling,
fallbacks, and recovery.

Reconciliation follows those stored bindings after rendering. It never scans
rendered values for new expressions. Numbered selectors follow current agenda
order; binding locations retain their identities. Changes to a source template
affect new copies. Existing files keep their saved definition and edit history.
