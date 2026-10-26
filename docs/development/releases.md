# Publish automation releases

[`__release.yml`](../../.github/workflows/__release.yml) runs every Monday at
08:25 UTC and on manual request. It publishes only from the default branch,
after the shared CI workflow passes for the same commit. Concurrent release runs
are serialized; a new request does not cancel a running release.

## Credentials

Make these settings available to this repository, either directly or through
organization settings:

| Setting                         | Purpose                                                                  |
| ------------------------------- | ------------------------------------------------------------------------ |
| Variable `CI_BOT_APP_CLIENT_ID` | Client ID of the installed release GitHub App.                           |
| Secret `CI_BOT_APP_PRIVATE_KEY` | Private key for that GitHub App.                                         |
| Secret `GEMINI_API_KEY`         | Gemini API key with access to the text model configured in the workflow. |

The release job requests an App token scoped to this repository with Contents
write and Pull requests read permissions. App-authenticated tags trigger the
existing main CI and documentation workflow. Its separate documentation token
also needs Pull requests and Workflows write permissions, as described in the
[development guide](README.md#ci-and-public-documentation).

The Gemini credential is passed only to the release summary step. Provider and
model are explicit in the workflow's `changelog-summary` configuration. Consult
the [Gemini model catalog](https://ai.google.dev/gemini-api/docs/models) when
updating the model.

## Run and inspect

After the workflow is merged into the default branch, select **Internal - Release**
in GitHub Actions and choose **Run workflow** on `main`, or run:

```sh
gh workflow run __release.yml --ref main
```

The pinned release actions calculate the next version from Conventional Commits:
breaking changes increment major, `feat` increments minor, and other changes
increment patch. Tags use the numeric version without a `v` prefix. With no
relevant changes since the last release, publication and Gemini generation are
skipped, including for manual runs.

The published GitHub release contains a Gemini summary followed by the complete
generated changelog. Its tag points to the commit validated by this run, even if
`main` advances during CI. Release creation uses the committed action bundles
checked by shared CI; it does not publish private workspace packages to npm.

If CI fails, no release job runs. A missing Gemini key or failed summary prevents
publication. A summary failure can leave an unpublished draft: fix the credential
or provider problem and rerun the workflow. The release actions reuse the draft
for the planned tag. Inspect the resulting notes on the repository's Releases page.

Generated action and workflow references remain owned by the documentation job
in [`__main-ci.yml`](../../.github/workflows/__main-ci.yml). See
[generated references](documentation.md#generated-references) for regeneration.
