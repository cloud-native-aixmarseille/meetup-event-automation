import * as core from "@actions/core";
import type {
	ContentReviewWork,
	ManageContentReview,
} from "@meetup-automation/journey";
import type { ActionReportData } from "./action-report.js";
import type { DraftMediaInputReader } from "./draft-media-input.js";
import type { DraftReviewComposition } from "./draft-review-composition.js";
import type { DraftSourceInput } from "./draft-source-input.js";
import type { ActionMessages } from "./i18n/action-messages.js";

export class ReviewDraftsAction {
	constructor(
		private readonly input: Pick<
			DraftSourceInput,
			"readContext" | "readConfiguration" | "secret"
		>,
		private readonly media: Pick<DraftMediaInputReader, "artwork">,
		private readonly work: (
			input: ReturnType<DraftSourceInput["readContext"]>,
		) => Pick<ContentReviewWork, "exists">,
		private readonly compose: (
			...args: Parameters<DraftReviewComposition["review"]>
		) => Pick<ManageContentReview, "execute">,
	) {}
	async run(messages: ActionMessages): Promise<ActionReportData> {
		const context = this.input.readContext(messages.locale);
		if (!(await this.work(context).exists())) {
			return {
				details: [messages.t("report.content.no-work")],
				diagnostics: [],
			};
		}
		const input = {
			...context,
			...(await this.input.readConfiguration()),
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
