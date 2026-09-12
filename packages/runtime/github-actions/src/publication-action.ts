import * as core from "@actions/core";
import { context, getOctokit } from "@actions/github";
import { ManageMeetupAssets, resultEnvelope } from "@meetup-automation/journey";
import { setDiagnosticsOutput, setJsonOutput } from "./action-output.js";
import { createPublicationContainer } from "./publication-composition.js";
import { enumInput, positiveIntegerInput } from "./runtime-input.js";

export async function runPublicationReconcileAssetsAction(): Promise<void> {
	const issueNumber = positiveIntegerInput(
		"issue-number",
		core.getInput("issue-number", { required: true }),
	);
	const mode = enumInput("mode", core.getInput("mode", { required: true }), [
		"check",
		"fix",
	] as const);
	const credentials = core.getInput("google-credentials");
	if (!credentials) {
		const diagnostics = [
			{
				code: "publication.assets.unavailable",
				severity: "info" as const,
				message:
					"Google Drive credentials are unavailable; asset management remains manual",
			},
		];
		setJsonOutput(
			"result",
			resultEnvelope(
				{ skipped: true, persisted: false, files: {} },
				diagnostics,
			),
		);
		setJsonOutput("drive-files", {});
		core.setOutput("asset-url", "");
		setDiagnosticsOutput(diagnostics);
		return;
	}
	core.setSecret(credentials);
	const client = getOctokit(core.getInput("github-token", { required: true }));
	const commentAuthorLogin = core.getInput("managed-comment-author", {
		required: true,
	});
	const { owner, repo } = context.repo;
	const container = createPublicationContainer({
		client,
		owner,
		repo,
		commentAuthorLogin,
		credentials,
		parentFolderId: core.getInput("google-drive-meetup-folder-id"),
		templateFolderId: core.getInput("google-drive-meetup-template-folder-id"),
	});
	const outcome = await container.get(ManageMeetupAssets).execute({
		identity: { repository: `${owner}/${repo}`, issueNumber },
		mode,
	});
	setJsonOutput(
		"result",
		resultEnvelope(
			{
				skipped: outcome.skipped,
				persisted: outcome.persisted,
				assetUrl: outcome.assetUrl,
				files: outcome.files,
			},
			outcome.diagnostics,
		),
	);
	setJsonOutput("drive-files", outcome.files);
	core.setOutput("asset-url", outcome.assetUrl ?? "");
	setDiagnosticsOutput(outcome.diagnostics);
}
