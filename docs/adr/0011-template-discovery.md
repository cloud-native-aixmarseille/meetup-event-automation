# Discover template fields from Google files

Status: Accepted on 2026-10-29.

Supersedes the external content-contract and stable participant-slot assignment
parts of [Managed assets](0007-assets.md). Other decisions in that record remain
accepted.

## Context

The template feature should use the shared expression syntax inside Google
files. Requiring consumers to maintain a second field registry, provider object
IDs, and per-event participant assignments duplicates the template and makes
routine meetup changes require repository configuration edits.

## Decision

Discover text fields from native Slides shapes and Docs body paragraphs. Discover
image selectors from alt titles while retaining descriptive alt text. The shared
parser owns syntax; publication owns permitted fields and fallback policy;
provider adapters own native location discovery. Journey projects validated
public event and referential data. Runtime supplies localized fallback messages
and immutable generic image URLs.

Numbered talk selectors follow current agenda order. Numbered speaker selectors
follow first appearance, deduplicated by stable speaker ID. Reordering the agenda
changes the selected values. Public venue and logo fields belong to the host
referential, separate from private contact fields.

The consumer maintains no asset field configuration. Each managed copy retains
its automatically generated definition and binding sidecar. Do not rescan rendered
text, rewrite existing layouts, or recreate file identities. Existing copy-only
files require explicit enrollment. Recovery remains an exceptional revision-bound
operation, supplied through an optional maintenance request file, and cannot
silently authorize repeated overwrites.

## Consequences

Authors edit Google templates in one place. Unsupported expressions and locations
leave the affected file pending before copy or content mutation. Existing copies
keep their frozen definition and manual-edit conflict checks. Previously authored
named participant slots need a reviewed migration before positional rendering;
there is no inferred identity-to-position conversion. Updating the consumer pin
and the native templates must be coordinated before removing old configuration.

## Collection rendering decision - 2026-10-29

The original decision above supported positional fields and did not add native
layout instances. That restriction is superseded for explicitly authored collection
containers; the scalar field and existing-copy enrollment decisions remain accepted.

Discover `{{#each talks}}` and `{{#each speakers}}` from a text shape's alt title.
An ungrouped marker owns a repeated slide; a grouped marker owns a compact card
region. Google does not support alt titles on groups, so the marker belongs to a
child text shape. The shared templating package owns directive syntax, publication
owns public collection values and pending-write policy, and the Slides adapter
owns native geometry, duplication, observation and its frozen template descriptor.

Keep one manifest binding per collection so its cardinality does not change when
the agenda does. Observe the complete owned container, including image bytes and
styling. Preserve the first native instance as the prototype and replace generated
instances in one revision-bound atomic batch. Empty or invalid agendas remain
pending without writes. This avoids hidden prototype slides and preserves native
media and file identities. Announcement collections use groups to retain one image.

This extends manual-edit protection to repeated containers and adds no consumer
asset configuration. It deliberately requires explicit recovery for uncertain
structural writes rather than inferring success from partially observed media.
