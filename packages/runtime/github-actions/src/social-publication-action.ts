import * as core from "@actions/core";
import type { ActionReportData } from "./action-report.js";
import type { DraftSourceInput } from "./draft-source-input.js";
import type { ActionMessages } from "./i18n/action-messages.js";
import type { SocialCredentialsInput } from "./social-credentials-input.js";
import type { SocialPublicationComposition } from "./social-publication-composition.js";

export class SocialPublicationAction {
	constructor(
		private readonly dependencies: {
			readonly input: Pick<DraftSourceInput, "read" | "secret">;
			readonly credentials: Pick<SocialCredentialsInput, "read">;
			readonly compose: (
				input: Parameters<SocialPublicationComposition["create"]>[0],
			) => Pick<ReturnType<SocialPublicationComposition["create"]>, "execute">;
		},
	) {}
	async run(messages: ActionMessages): Promise<ActionReportData> {
		const input = await this.dependencies.input.read(messages.locale);
		const journey = this.dependencies.compose({
			...input,
			credentials: this.dependencies.credentials.read(input.destinations),
			slackToken: this.dependencies.input.secret("slack-token"),
			slackOrganizerChannelId: core.getInput("slack-organizer-channel-id", {
				required: true,
			}),
		});
		const result = await journey.execute({
			repository: `${input.owner}/${input.repo}`,
			issueNumber: input.issueNumber,
		});
		return {
			details: result.publications.length
				? result.publications.map((publication) =>
						messages.t("report.social.result", {
							target: publication.target,
							status: publication.status,
						}),
					)
				: [messages.t("report.social.empty")],
			diagnostics: result.diagnostics,
		};
	}
}
