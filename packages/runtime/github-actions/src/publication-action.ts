import * as core from "@actions/core";
import { context, getOctokit } from "@actions/github";
import {
	ManageMeetupAssets,
	ResultEnvelopeFactory,
} from "@meetup-automation/journey";
import { ActionOutput } from "./action-output.js";
import { PublicationComposition } from "./publication-composition.js";
import { RuntimeInput } from "./runtime-input.js";

export class PublicationAction {
	static async runPublicationReconcileAssetsAction(): Promise<void> {
		const issueNumber = RuntimeInput.positiveIntegerInput(
			"issue-number",
			core.getInput("issue-number", { required: true }),
		);
		const mode = RuntimeInput.enumInput(
			"mode",
			core.getInput("mode", { required: true }),
			["check", "fix"] as const,
		);
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
			ActionOutput.setJsonOutput(
				"result",
				ResultEnvelopeFactory.resultEnvelope(
					{ skipped: true, persisted: false, files: {} },
					diagnostics,
				),
			);
			ActionOutput.setJsonOutput("drive-files", {});
			core.setOutput("asset-url", "");
			ActionOutput.setDiagnosticsOutput(diagnostics);
			return;
		}
		core.setSecret(credentials);
		const client = getOctokit(
			core.getInput("github-token", { required: true }),
		);
		const commentAuthorLogin = core.getInput("managed-comment-author", {
			required: true,
		});
		const { owner, repo } = context.repo;
		const container = PublicationComposition.createPublicationContainer({
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
		ActionOutput.setJsonOutput(
			"result",
			ResultEnvelopeFactory.resultEnvelope(
				{
					skipped: outcome.skipped,
					persisted: outcome.persisted,
					assetUrl: outcome.assetUrl,
					files: outcome.files,
				},
				outcome.diagnostics,
			),
		);
		ActionOutput.setJsonOutput("drive-files", outcome.files);
		core.setOutput("asset-url", outcome.assetUrl ?? "");
		ActionOutput.setDiagnosticsOutput(outcome.diagnostics);
	}
}
