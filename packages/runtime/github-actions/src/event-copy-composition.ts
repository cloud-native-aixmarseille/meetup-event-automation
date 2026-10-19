import { GeminiGenerationGatewayComposition } from "@meetup-automation/gemini-generation-gateway";
import {
	DraftProposalComposition,
	GenerateTextProposal,
} from "@meetup-automation/journey";
import type { AiConfiguration } from "./ai-configuration.js";
import {
	type DraftSource,
	DraftWorkspaceComposition,
} from "./draft-workspace-composition.js";

export class EventCopyComposition {
	create(input: DraftSource, ai: AiConfiguration) {
		const base = new DraftWorkspaceComposition().create(
			input,
			async () => null,
		);
		const generator = new GeminiGenerationGatewayComposition().text(
			ai.model,
			ai.apiKey,
		);
		return {
			...base,
			generator,
			generate: new GenerateTextProposal(
				base.store,
				generator,
				base.fingerprints,
				base.policy,
				new DraftProposalComposition().eventCopy(),
			),
		};
	}
}
