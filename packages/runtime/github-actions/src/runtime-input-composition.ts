import {
	AttentionStageEvaluation,
	JourneyPolicyComposition,
} from "@meetup-automation/journey";
import {
	ContentContractPolicy,
	PublicationDomainComposition,
	ScheduledEventPolicy,
} from "@meetup-automation/publication";
import type { Container } from "inversify";
import { AiInput } from "./ai-input.js";
import { AssetContentConfiguration } from "./assets/asset-content-configuration.js";
import { AssetRenderConfiguration } from "./assets/asset-render-configuration.js";
import { AttentionStageInput } from "./attention-stage-input.js";
import { AttentionStages } from "./attention-stages.js";
import { CommunicationInput } from "./communication-input.js";
import { ConferenceHallInput } from "./conference-hall-input.js";
import { MeetupPublicationConfiguration } from "./meetup-publication-configuration.js";
import { PublicationUrlInput } from "./publication-url-input.js";
import { RuntimeInput } from "./runtime-input.js";

export class RuntimeInputComposition {
	static bind(container: Container): void {
		container.bind(RuntimeInput).toResolvedValue(() => new RuntimeInput());
		container
			.bind(PublicationUrlInput)
			.toResolvedValue(() => new PublicationUrlInput());
		container
			.bind(ConferenceHallInput)
			.toResolvedValue(() => new ConferenceHallInput());
		container
			.bind(AiInput)
			.toResolvedValue(
				(runtimeInput: RuntimeInput) => new AiInput(runtimeInput),
				[RuntimeInput],
			);
		container
			.bind(CommunicationInput)
			.toResolvedValue(
				(
					publicationUrlInput: PublicationUrlInput,
					conferenceHallInput: ConferenceHallInput,
				) =>
					new CommunicationInput({ publicationUrlInput, conferenceHallInput }),
				[PublicationUrlInput, ConferenceHallInput],
			);
		RuntimeInputComposition.bindAttention(container);
		RuntimeInputComposition.bindConfiguration(container);
	}

	private static bindAttention(container: Container): void {
		container
			.bind(AttentionStageInput)
			.toResolvedValue(() => new AttentionStageInput());
		container
			.bind(AttentionStageEvaluation)
			.toResolvedValue(() =>
				new JourneyPolicyComposition().attentionStageEvaluation(),
			);
		container.bind(AttentionStages).toResolvedValue(
			(
				attentionStageInput: AttentionStageInput,
				attentionStageEvaluation: AttentionStageEvaluation,
			) =>
				new AttentionStages({
					attentionStageInput,
					attentionStageEvaluation,
				}),
			[AttentionStageInput, AttentionStageEvaluation],
		);
	}

	private static bindConfiguration(container: Container): void {
		container
			.bind(ContentContractPolicy)
			.toResolvedValue(() =>
				new PublicationDomainComposition().contentContractPolicy(),
			);
		container
			.bind(ScheduledEventPolicy)
			.toResolvedValue(() =>
				new PublicationDomainComposition().scheduledEventPolicy(),
			);
		container
			.bind(AssetRenderConfiguration)
			.toResolvedValue(
				(
					runtimeInput: RuntimeInput,
					contentContractPolicy: ContentContractPolicy,
				) =>
					new AssetRenderConfiguration({ runtimeInput, contentContractPolicy }),
				[RuntimeInput, ContentContractPolicy],
			);
		container.bind(AssetContentConfiguration).toResolvedValue(
			(
				runtimeInput: RuntimeInput,
				contentContractPolicy: ContentContractPolicy,
				assetRenderConfiguration: AssetRenderConfiguration,
			) =>
				new AssetContentConfiguration({
					runtimeInput,
					contentContractPolicy,
					assetRenderConfiguration,
				}),
			[RuntimeInput, ContentContractPolicy, AssetRenderConfiguration],
		);
		container.bind(MeetupPublicationConfiguration).toResolvedValue(
			(
				runtimeInput: RuntimeInput,
				scheduledEventPolicy: ScheduledEventPolicy,
			) =>
				new MeetupPublicationConfiguration({
					runtimeInput,
					scheduledEventPolicy,
				}),
			[RuntimeInput, ScheduledEventPolicy],
		);
	}
}
