import * as core from "@actions/core";
import { context, getOctokit } from "@actions/github";
import type { ReconcileMeetupSlidesPdf } from "@meetup-automation/journey";
import type { ActionReportData } from "./action-report.js";
import type { EventDocumentCompositionInput } from "./composition.js";
import type { ActionMessages } from "./i18n/action-messages.js";
import type { RuntimeInput } from "./runtime-input.js";
import type { SlidesPdfInput } from "./slides-pdf-input.js";

export class SlidesPdfAction {
	constructor(
		private readonly dependencies: {
			input: Pick<SlidesPdfInput, "parse">;
			runtime: Pick<RuntimeInput, "positiveIntegerInput" | "booleanInput">;
			create: (
				input: EventDocumentCompositionInput & {
					credentials: string;
					publicFolderId: string;
				},
			) => Pick<ReconcileMeetupSlidesPdf, "execute">;
		},
	) {}
	async run(messages: ActionMessages): Promise<ActionReportData> {
		const issueNumber = this.dependencies.runtime.positiveIntegerInput(
			"issue-number",
			core.getInput("issue-number", { required: true }),
		);
		const source = this.dependencies.input.parse(
			core.getInput("pdf-source", { required: true }),
		);
		const ready = this.dependencies.runtime.booleanInput(
			"slides-ready",
			core.getInput("slides-ready", { required: true }),
		);
		const credentials = core.getInput("google-credentials", { required: true });
		core.setSecret(credentials);
		const publicFolderId = core.getInput("google-drive-public-folder-id", {
			required: true,
		});
		if (
			source.protectedFolderIds?.includes(publicFolderId) ||
			source.container?.id === publicFolderId
		)
			throw new Error(
				"The shared public folder must differ from private asset folders",
			);
		const journey = this.dependencies.create({
			...context.repo,
			locale: messages.locale,
			client: getOctokit(core.getInput("github-token", { required: true })),
			credentials,
			publicFolderId,
		});
		const result = await journey.execute(
			{ repository: `${context.repo.owner}/${context.repo.repo}`, issueNumber },
			source,
			ready,
		);
		return {
			details: [
				messages.t("report.assets.pdf", {
					status: result.status,
					updated: String(result.updated),
				}),
			],
			diagnostics: result.diagnostics.map((item) => ({
				...item,
				field: "publicationLinks.assets",
			})),
		};
	}
}
