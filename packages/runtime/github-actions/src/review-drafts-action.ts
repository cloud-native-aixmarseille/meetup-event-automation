import * as core from "@actions/core";
import type { ActionReportData } from "./action-report.js";
import type { DraftMediaInputReader } from "./draft-media-input.js";
import type { DraftReviewComposition } from "./draft-review-composition.js";
import type { DraftSourceInput } from "./draft-source-input.js";
import type { ActionMessages } from "./i18n/action-messages.js";

export class ReviewDraftsAction {
	constructor(
		private readonly input: DraftSourceInput,
		private readonly media: DraftMediaInputReader,
		private readonly compose: DraftReviewComposition["review"],
	) {}
	async run(messages: ActionMessages): Promise<ActionReportData> {
		const input = {
			...(await this.input.read(messages.locale)),
			...this.media.artwork(),
		};
		const journey = this.compose(
			input,
			this.input.secret("slack-token"),
			core.getInput("slack-organizer-channel-id", { required: true }),
		);
		const diagnostics = await journey.execute({
			repository: `${input.owner}/${input.repo}`,
			issueNumber: input.issueNumber,
		});
		return { details: [messages.t("report.content.reviewed")], diagnostics };
	}
}
