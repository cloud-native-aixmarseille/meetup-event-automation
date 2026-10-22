# Contributing

Start with the [development setup and commands](docs/development/README.md).
Follow the [architecture rules](docs/development/architecture.md) and
[test conventions](docs/development/testing.md). Guides describe only the current
implemented and supported system; ADRs preserve decision history. Follow the
[documentation rules](docs/development/documentation.md).

Follow the [Code of Conduct](CODE_OF_CONDUCT.md) in project interactions.

## Pull Request Process

1. Keep the change focused on a current behavior or concrete problem.
2. Add or update behavior tests where the change needs them. Use synthetic
   fixtures; never commit real host/speaker contact data or credentials.
3. Update the authoritative guide or contract in place when behavior,
   configuration, action inputs, or workflow wiring changes. Remove historical,
   deprecated, superseded, and speculative content from guides. Preserve ADRs
   and update their status and supersession links when decisions change. Keep
   current rationale in the relevant guide and repair its links and index.
   Root readmes contain only concise end user documentation with links to `docs/`.
   Action and workflow references are generated: edit their source manifests
   and regenerate through the release workflow. Do not add manual content to them.
4. Run the [checks appropriate to the change](docs/development/README.md#choose-checks-for-the-change).
   Include rebuilt action bundles after production changes.
5. Complete the [required design review](docs/development/architecture.md#required-design-review)
   for code changes. Identify responsibility and dependency boundaries and resolve
   design violations introduced or expanded by the change.
6. Open a pull request describing the problem, resulting behavior, design-review
   evidence, and checks run. Wait for maintainer review and passing CI before
   merging.
