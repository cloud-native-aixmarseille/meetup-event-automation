import type {
	ContentTarget,
	PromotionalContentPolicy,
	TextGeneration,
} from "@meetup-automation/journey";
import type { Locale } from "@meetup-automation/localization";
import type { ActionReportData } from "./action-report.js";
import type { AiConfiguration } from "./ai-configuration.js";
import type { AiInput } from "./ai-input.js";
import type {
	DraftSource,
	DraftWorkspaceComposition,
} from "./draft-workspace-composition.js";
import type { ActionMessages } from "./i18n/action-messages.js";

export class GenerateDraftAction<Input extends DraftSource> {
	constructor(
		private readonly readInput: (locale: Locale) => Promise<Input>,
		private readonly readTarget: () => ContentTarget,
		private readonly aiInput: Pick<AiInput, "read">,
		private readonly policy: Pick<
			PromotionalContentPolicy,
			"target" | "current"
		>,
		private readonly compose: (
			input: Input,
			ai: AiConfiguration,
		) => ReturnType<DraftWorkspaceComposition["create"]> & {
			generator: Pick<TextGeneration, "supported">;
			generate: {
				execute(id: string): Promise<"complete" | "blocked" | "recovery">;
			};
		},
	) {}
	async run(messages: ActionMessages): Promise<ActionReportData> {
		const input = await this.readInput(messages.locale);
		const ai = this.aiInput.read();
		const target = this.readTarget();
		if (!this.policy.target(target))
			throw new Error("Unsupported content target");
		const services = this.compose(input, ai);
		if (!services.generator.supported())
			throw new Error("Model does not support this content target");
		const context = await services.workspace.read(
			{
				repository: `${input.owner}/${input.repo}`,
				issueNumber: input.issueNumber,
			},
			target,
			messages.locale,
		);
		const proposal = context
			? await services.prepare.execute(
					context.plan,
					{ kind: "ai", provider: ai.provider, model: ai.model },
					input.settings.guidance,
					context.destination,
					await services.recoveries.read(),
				)
			: undefined;
		const status = proposal
			? context && this.policy.current(proposal, context.plan)
				? await services.generate.execute(proposal.id)
				: "recovery"
			: "blocked";
		return {
			details: [messages.t("report.content.generated")],
			diagnostics:
				status === "complete"
					? []
					: [
							{
								code: `publication.content.${status === "blocked" ? "prerequisites" : "recovery"}`,
								severity: "warning",
								field:
									target === "title" || target === "description"
										? target
										: "assets",
								message: `Content generation: ${status}`,
							},
						],
		};
	}
}
