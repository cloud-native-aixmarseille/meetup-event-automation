import * as core from "@actions/core";
import { context, getOctokit } from "@actions/github";
import {
	ManageMeetupFeedback,
	ResultEnvelopeFactory,
} from "@meetup-automation/journey";
import { ActionOutput } from "./action-output.js";
import { FeedbackComposition } from "./feedback-composition.js";
import { RuntimeInput } from "./runtime-input.js";

export class FeedbackAction {
	static async run(): Promise<void> {
		const issueNumber = RuntimeInput.positiveIntegerInput(
			"issue-number",
			core.getInput("issue-number", { required: true }),
		);
		const mode = RuntimeInput.enumInput(
			"mode",
			core.getInput("mode", { required: true }),
			["check", "fix"] as const,
		);
		const kuttApiKey = FeedbackAction.requiredInput("kutt-api-key");
		core.setSecret(kuttApiKey);
		const kuttLinkId = FeedbackAction.requiredInput("kutt-link-id");
		const { owner, repo } = context.repo;
		const container = FeedbackComposition.createFeedbackContainer({
			client: getOctokit(core.getInput("github-token", { required: true })),
			owner,
			repo,
			commentAuthorLogin: core.getInput("managed-comment-author", {
				required: true,
			}),
			kuttApiKey,
			kuttLinkId,
		});
		const { diagnostics, ...result } = await container
			.get(ManageMeetupFeedback)
			.execute({
				identity: { repository: `${owner}/${repo}`, issueNumber },
				mode,
			});
		FeedbackAction.output(result, diagnostics);
	}

	private static requiredInput(name: "kutt-api-key" | "kutt-link-id"): string {
		const value = core.getInput(name, { required: true });
		if (!value) throw new Error(`Input required and not supplied: ${name}`);
		return value;
	}

	private static output(
		result: {
			feedbackUrl?: string;
			linkUpdated: boolean;
			skipped: boolean;
			persisted: boolean;
		},
		diagnostics: Parameters<typeof ActionOutput.setDiagnosticsOutput>[0],
	) {
		ActionOutput.setJsonOutput(
			"result",
			ResultEnvelopeFactory.resultEnvelope(result, diagnostics),
		);
		ActionOutput.setDiagnosticsOutput(diagnostics);
		core.setOutput("feedback-url", result.feedbackUrl ?? "");
		core.setOutput("link-updated", String(result.linkUpdated));
	}
}
