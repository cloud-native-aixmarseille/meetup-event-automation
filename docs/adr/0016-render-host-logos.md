# ADR 0016: Render the current host's public logo

Status: Accepted

Date: 2026-10-17

## Context

Presentation and announcement templates contain a host-logo placeholder as well
as speaker portraits. A host change must update that image without replacing
community branding or other manual images. ADR 0014's initial image allowlist
only supports speaker portraits, and private host contacts are not a public
image source.

## Decision

Extend the version 1 image contract with `host.logo`. Bind a real placeholder
image through an explicit slot and its Slides page/object or Docs tab/inline
object IDs. Resolve the current event's validated host ID against a committed
public `hostLogos` map containing only image URLs and accessible descriptions.
No per-event logo assignment, name matching, contact lookup, or image discovery
occurs in the renderer. The [asset guide](../integrations/assets.md#author-managed-content)
owns configuration and authoring instructions.

Reuse the existing media validation, required/fallback handling, persistent
bindings, revision checks, manual-edit protection, and readiness rules. Include
host identity in desired-image fingerprints and saved bindings so host changes
are reconciled even when source URLs or image bytes coincide. Missing optional
logos use an explicit generic logo fallback. Existing speaker contracts and
unregistered images retain their behavior.

Slides supports center-inside fitting to preserve an entire logo. Docs requires
center crop; consumers can prepare padded images to fit its frame. These are
the existing renderer capabilities, not new provider operations.

## Alternatives

- Treating a host as a speaker would couple its logo to agenda assignments.
- Matching logos by display names or visible images would make identity and
  ownership ambiguous.
- Adding logos to private contact data would blur the public rendering boundary.

## Consequences

Consumers must supply reviewed public images and fallbacks. Template migration
must register only the intended host-logo placeholders, preserving community
branding and QR images. Existing event copies retain their bound contracts and
need an explicit migration before acquiring a logo field. API enablement and
live layout validation remain prerequisites for rollout.
