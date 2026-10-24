import { Container } from "inversify";
import { ActionFailurePresenter } from "./action-failure-presenter.js";
import { ActionOutput } from "./action-output.js";
import { ActionReport } from "./action-report.js";
import { ActionRunner } from "./action-runner.js";
import { AiInput } from "./ai-input.js";
import { AssetContentConfiguration } from "./assets/asset-content-configuration.js";
import type {
	AssetDateFormatter,
	AssetDateFormatterArguments,
} from "./assets/asset-date-formatter.js";
import type {
	AssetMessages,
	AssetMessagesArguments,
} from "./assets/asset-messages.js";
import { AssetRenderConfiguration } from "./assets/asset-render-configuration.js";
import type {
	AssetRenderPresenterImpl,
	AssetRenderPresenterImplArguments,
} from "./assets/asset-render-presenter.js";
import { AttentionStageInput } from "./attention-stage-input.js";
import { AttentionStages } from "./attention-stages.js";
import { CommunicationInput } from "./communication-input.js";
import { ConferenceHallInput } from "./conference-hall-input.js";
import type {
	ActionMessages,
	ActionMessagesArguments,
} from "./i18n/action-messages.js";
import { EventPublicationConfiguration } from "./event-publication-configuration.js";
import type {
	OrganizerFeedback,
	OrganizerFeedbackArguments,
} from "./organizer-feedback.js";
import { PublicationUrlInput } from "./publication-url-input.js";
import { ReferentialActionReport } from "./referential-action-report.js";
import { RuntimeInput } from "./runtime-input.js";
import { RuntimeInputComposition } from "./runtime-input-composition.js";
import {
	RUNTIME_FACTORIES,
	type RuntimeFactories,
	RuntimePresentationComposition,
} from "./runtime-presentation-composition.js";
import { SpeakerSyncFailureReport } from "./speaker-sync-failure-report.js";

export class GithubActionsComposition {
	private readonly container = GithubActionsComposition.createContainer();

	static createContainer(): Container {
		const container = new Container({ defaultScope: "Singleton" });
		RuntimeInputComposition.bind(container);
		RuntimePresentationComposition.bind(container);
		return container;
	}

	aiInput(): AiInput {
		return this.container.get(AiInput);
	}

	publicationUrlInput(): PublicationUrlInput {
		return this.container.get(PublicationUrlInput);
	}

	actionFailurePresenter(): ActionFailurePresenter {
		return this.container.get(ActionFailurePresenter);
	}

	actionOutput(): ActionOutput {
		return this.container.get(ActionOutput);
	}

	actionReport(): ActionReport {
		return this.container.get(ActionReport);
	}

	actionRunner(): ActionRunner {
		return this.container.get(ActionRunner);
	}

	assetContentConfiguration(): AssetContentConfiguration {
		return this.container.get(AssetContentConfiguration);
	}

	assetRenderConfiguration(): AssetRenderConfiguration {
		return this.container.get(AssetRenderConfiguration);
	}

	attentionStageInput(): AttentionStageInput {
		return this.container.get(AttentionStageInput);
	}

	attentionStages(): AttentionStages {
		return this.container.get(AttentionStages);
	}

	communicationInput(): CommunicationInput {
		return this.container.get(CommunicationInput);
	}

	conferenceHallInput(): ConferenceHallInput {
		return this.container.get(ConferenceHallInput);
	}

	eventPublicationConfiguration(): EventPublicationConfiguration {
		return this.container.get(EventPublicationConfiguration);
	}

	referentialActionReport(): ReferentialActionReport {
		return this.container.get(ReferentialActionReport);
	}

	runtimeInput(): RuntimeInput {
		return this.container.get(RuntimeInput);
	}

	speakerSyncFailureReport(): SpeakerSyncFailureReport {
		return this.container.get(SpeakerSyncFailureReport);
	}

	actionMessages(...args: ActionMessagesArguments): ActionMessages {
		return this.container.get<RuntimeFactories["actionMessages"]>(
			RUNTIME_FACTORIES.actionMessages,
		)(...args);
	}

	assetDateFormatter(...args: AssetDateFormatterArguments): AssetDateFormatter {
		return this.container.get<RuntimeFactories["assetDateFormatter"]>(
			RUNTIME_FACTORIES.assetDateFormatter,
		)(...args);
	}

	assetMessages(...args: AssetMessagesArguments): AssetMessages {
		return this.container.get<RuntimeFactories["assetMessages"]>(
			RUNTIME_FACTORIES.assetMessages,
		)(...args);
	}

	assetRenderPresenterImpl(
		...args: AssetRenderPresenterImplArguments
	): AssetRenderPresenterImpl {
		return this.container.get<RuntimeFactories["assetRenderPresenter"]>(
			RUNTIME_FACTORIES.assetRenderPresenter,
		)(...args);
	}

	organizerFeedback(...args: OrganizerFeedbackArguments): OrganizerFeedback {
		return this.container.get<RuntimeFactories["organizerFeedback"]>(
			RUNTIME_FACTORIES.organizerFeedback,
		)(...args);
	}
}
