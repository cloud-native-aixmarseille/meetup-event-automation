import type { Locale } from "@meetup-automation/localization";
import type {
	PrepareSocialReminders,
	TextGeneration,
} from "@meetup-automation/journey";
import type { ActionReportData } from "./action-report.js";
import type { AiConfiguration } from "./ai-configuration.js";
import type { AiInput } from "./ai-input.js";
import type { DraftSource } from "./draft-workspace-composition.js";
import type { ActionMessages } from "./i18n/action-messages.js";

export class PrepareRemindersAction {
	constructor(
		private readonly readInput: (
			locale: Locale,
		) => Promise<DraftSource & { readonly credentials: string }>,
		private readonly aiInput: Pick<AiInput, "read">,
		private readonly compose: (
			input: DraftSource & { readonly credentials: string },
			ai: AiConfiguration,
		) => {
			generator: Pick<TextGeneration, "supported">;
			prepare: Pick<PrepareSocialReminders, "execute">;
		},
	) {}

	async run(messages: ActionMessages): Promise<ActionReportData> {
		const input = await this.readInput(messages.locale);
		const ai = this.aiInput.read();
		const services = this.compose(input, ai);
		if (!services.generator.supported())
			throw new Error("Unsupported reminder text model");
		const result = await services.prepare.execute(
			{
				repository: `${input.owner}/${input.repo}`,
				issueNumber: input.issueNumber,
			},
			input.destinations,
			{ kind: "ai", provider: ai.provider, model: ai.model },
			input.settings.guidance,
		);
		return {
			details: result.results.length
				? result.results.map((item) => messages.t("report.social.result", item))
				: [messages.t("report.content.no-work")],
			diagnostics: result.diagnostics,
		};
	}
}
