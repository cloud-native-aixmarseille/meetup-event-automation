# Host and speaker referentials

The consumer repository stores two UTF-8 CSV files. Keep contact details in that
private repository; generated form choices contain public display names.

## Hosts

Path: `referentials/hosting.csv`.

| Column       | Required | Meaning                                                |
| ------------ | -------- | ------------------------------------------------------ |
| `host_id`    | Yes      | Stable ID: `host-` followed by four digits.            |
| `name`       | Yes      | Public host display name.                              |
| `contact_id` | Yes      | Stable contact ID: `contact-` followed by four digits. |
| `contact`    | Yes      | Contact person's name.                                 |
| `mail`       | Yes      | Valid contact email address.                           |
| `phone`      | No       | Contact phone number.                                  |
| `address`    | Yes      | Private contact address.                               |

Public document fields are optional columns: `venue_address`,
`venue_postal_code`, `venue_city`, `logo_url`, and `logo_description`.
Supply all three venue fields together, and both logo fields together, or leave
each group empty. Logo URLs must use public HTTPS without credentials. These
values are public; the required contact `address` is never used as a fallback.
Repeat the same public details on each contact row belonging to the same host.

Synthetic example:

```csv
host_id,name,contact_id,contact,mail,phone,address
host-0001,Example Host,contact-0001,Example Contact,host@example.test,,1 Example Street
```

Several rows may use the same `host_id`, host display name, and public details for different
contacts. Each contact ID must be unique. The first contact for a host is used
for communication; keep that row first when changing the catalog.

## Speakers

Path: `referentials/speakers.csv`.

| Column       | Required | Meaning                                               |
| ------------ | -------- | ----------------------------------------------------- |
| `speaker_id` | Yes      | Unique stable ID: `speaker-` followed by four digits. |
| `firstname`  | No       | Organizer-maintained first name.                      |
| `lastname`   | No       | Organizer-maintained last name.                       |
| `company`    | No       | Company or affiliation.                               |
| `mail`       | Yes      | Valid email address.                                  |
| `phone`      | No       | Phone number.                                         |

Synthetic example:

```csv
speaker_id,firstname,lastname,company,mail,phone
speaker-0001,Alex,Example,Example Company,alex@example.test,
```

Host display names must be unique after normalization. Speakers may share a
name; ambiguous name-only references fail and generated choices include stable
IDs for those names. Each speaker needs either `display_name` or both
`firstname` and `lastname`. Email greetings use the current source display name for linked speakers. Local
speakers use the first name when available, otherwise the display name.

Optional speaker columns:

| Column              | Meaning                                                                          |
| ------------------- | -------------------------------------------------------------------------------- |
| `display_name`      | Public name; takes precedence over structured names.                             |
| `picture_url`       | Optional HTTPS portrait URL without credentials. Invalid URLs fall back to text. |
| `source_provider`   | Source namespace, `conference-hall` for imported profiles.                       |
| `source_event`      | CFP slug.                                                                        |
| `source_speaker_id` | Event-scoped speaker ID from the proposal export.                                |

Source mapping columns must be complete and unique together. For linked rows,
Conference Hall owns display name, company, email and picture URL. Structured
names, phone numbers and extra columns stay local. Unknown columns survive
synchronization. Event runs replace source-owned fields from the live
CFP export; the committed values are a snapshot for local validation and form
choices. Profile URLs are not fetched or embedded automatically.
See [Conference Hall](../integrations/conference-hall.md) for reviewed mapping,
field ownership, stable-ID allocation, synchronization and recovery.

Keep IDs unchanged when names or contact details change. Do not reuse an ID for
a different host, contact, or speaker. Quote CSV values containing commas,
quotes, or newlines.

## Use references in issues

Choose a host from the generated dropdown. For Conference Hall talks, select
proposal numbers and let the automation generate the agenda and speaker references;
see [select talks](../integrations/conference-hall.md#select-talks).

In manually managed issues without proposal selections, copy speaker names from
the form into the agenda. You can also include the catalog ID explicitly:

```text
- Alex Example [speaker-0001]: Reliable platforms
```

Unknown or ambiguous references produce diagnostics. Correct the catalog or
issue instead of adding contact details to the issue.

## Update the catalogs

1. Edit the CSV files and preserve existing IDs.
2. Open a pull request and wait for
   [data validation](../../.github/workflows/referential-check-catalog-and-form.yml).
   Review invalid-record diagnostics even when CI succeeds: they block form
   updates. Only technical execution failures fail the check.
3. Merge valid changes. The synchronization workflow opens a pull request if the
   generated choices need updating. Review and merge that update.

You can also regenerate the form locally and include it with the catalog
changes.

To regenerate locally, check out `meetup-event-automation` at the same release
commit used by your workflows, alongside the consumer checkout. With Node.js 24,
run from the **consumer repository root**:

```sh
INPUT_LOCALE=en INPUT_MODE=fix node ../meetup-event-automation/actions/issue-form/reconcile/dist/index.js
git diff -- .github/ISSUE_TEMPLATE/meetup.yml
```

Use the same locale as your workflows (`en` or `fr`) and adjust the sibling
checkout path if needed. This runs the committed action bundle against the local
CSV files and updates the local form; it needs no GitHub token and makes no
network requests. Review the diff before committing.

The
[synchronization workflow](../../.github/workflows/issue-form-reconcile.yml)
also opens a pull request when choices on the default branch need updating. It
changes the host dropdown and, when present, the speaker reference block in the
existing form. Maintain other form fields yourself and keep their IDs and labels
intact.
When choices change, the generator formats the YAML with bundled Prettier
defaults so the update passes the standard YAML formatting check. Check mode
does not write files, and a current projection is left untouched.

The initial form must include the `hoster` dropdown. A Conference Hall form uses
`conference_hall_proposals` as its only talk field and can omit the manual
`agenda` textarea and speaker reference block. The generator does not add those
fields. Manual-agenda forms without proposal selection must include a Markdown
block with `<!-- Available speakers -->`. Use the
[form template](../../__tests__/meetup-issue-template.yml) when setting up a new
repository.

## Public speaker pictures

The optional `picture_url` speaker CSV column supplies public portraits for
[managed Drive content](../integrations/assets.md#author-managed-content).
It is independent of email and phone fields. Use an HTTPS PNG, JPEG or GIF URL
that Google can retrieve without credentials. Image validation and explicit
fallbacks are owned by asset rendering; an invalid optional portrait does not
invalidate otherwise usable contact records.
