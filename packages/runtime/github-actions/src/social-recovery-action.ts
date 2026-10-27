import * as core from "@actions/core";
import { context, getOctokit } from "@actions/github";
import type {
	RecoverSocialPublication,
	SocialRecoveryInput,
} from "@meetup-automation/journey";
import type { ActionReportData } from "./action-report.js";
import type { ActionMessages } from "./i18n/action-messages.js";
import type { RuntimeInput } from "./runtime-input.js";
import type { SocialRecoveryComposition } from "./social-recovery-composition.js";

export class SocialRecoveryAction {
	constructor(
		private readonly dependencies: {
			readonly runtime: Pick<RuntimeInput, "positiveIntegerInput">;
			readonly compose: (
				input: Parameters<SocialRecoveryComposition["create"]>[0],
			) => Pick<RecoverSocialPublication, "execute">;
		},
	) {}
	async run(messages: ActionMessages): Promise<ActionReportData> {
		const recovery = this.input();
		const journey = this.dependencies.compose({
			...context.repo,
			issueNumber: this.dependencies.runtime.positiveIntegerInput(
				"issue-number",
				core.getInput("issue-number", { required: true }),
			),
			client: getOctokit(this.secret("github-token")),
			locale: messages.locale,
			commentAuthorLogin: core.getInput("managed-comment-author", {
				required: true,
			}),
			slackToken: this.secret("slack-token"),
			slackOrganizerChannelId: core.getInput("slack-organizer-channel-id", {
				required: true,
			}),
		});
		const status = await journey.execute(recovery);
		return {
			details: [messages.t("report.social.recovery", { status })],
			diagnostics: [],
		};
	}
	private input(): SocialRecoveryInput {
		const intentId = core.getInput("intent-id", { required: true });
		const outcome = core.getInput("outcome", { required: true });
		const reference = core.getInput("reference", { required: true });
		if (
			!/^[a-f0-9]{64}$/.test(intentId) ||
			!["published", "not-published"].includes(outcome) ||
			!reference ||
			reference.length > 2000
		)
			throw new Error("Invalid social recovery request");
		return {
			intentId,
			outcome: outcome as SocialRecoveryInput["outcome"],
			reference,
		};
	}
	private secret(name: string): string {
		const value = core.getInput(name, { required: true });
		core.setSecret(value);
		return value;
	}
}
