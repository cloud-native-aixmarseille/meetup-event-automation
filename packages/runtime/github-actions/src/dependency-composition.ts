import {
	JourneyComposition,
	JourneyPolicyComposition,
} from "@meetup-automation/journey";
import { LocalizationComposition } from "@meetup-automation/localization";
import { PublicationDomainComposition } from "@meetup-automation/publication";
import { ActionFailurePresenter } from "./action-failure-presenter.js";
import { ActionOutput } from "./action-output.js";
import { ActionReport } from "./action-report.js";
import { ActionRunner } from "./action-runner.js";
import { AssetContentConfiguration } from "./assets/asset-content-configuration.js";
import {
	AssetDateFormatter,
	type AssetDateFormatterArguments,
} from "./assets/asset-date-formatter.js";
import {
	AssetMessages,
	type AssetMessagesArguments,
} from "./assets/asset-messages.js";
import { AssetRenderConfiguration } from "./assets/asset-render-configuration.js";
import {
	AssetRenderPresenterImpl,
	type AssetRenderPresenterImplArguments,
} from "./assets/asset-render-presenter.js";
import { AttentionStageInput } from "./attention-stage-input.js";
import { AttentionStages } from "./attention-stages.js";
import { CommunicationInput } from "./communication-input.js";
import { ConferenceHallInput } from "./conference-hall-input.js";
import {
	ActionMessages,
	type ActionMessagesArguments,
} from "./i18n/action-messages.js";
import { MeetupPublicationConfiguration } from "./meetup-publication-configuration.js";
import {
	OrganizerFeedback,
	type OrganizerFeedbackArguments,
} from "./organizer-feedback.js";
import { PublicationUrlInput } from "./publication-url-input.js";
import { ReferentialActionReport } from "./referential-action-report.js";
import { RuntimeInput } from "./runtime-input.js";
import { SpeakerSyncFailureReport } from "./speaker-sync-failure-report.js";
export class GithubActionsComposition {
	publicationUrlInput(): PublicationUrlInput {
		return new PublicationUrlInput(this.runtimeInput());
	}
	actionFailurePresenter(): ActionFailurePresenter {
		return new ActionFailurePresenter();
	}
	actionMessages(...args: ActionMessagesArguments): ActionMessages {
		return new ActionMessages(
			{ localeResolver: new LocalizationComposition().localeResolver() },
			...args,
		);
	}
	actionOutput(): ActionOutput {
		return new ActionOutput();
	}
	actionReport(): ActionReport {
		return new ActionReport();
	}
	actionRunner(): ActionRunner {
		return new ActionRunner({
			diagnosticPolicy: new JourneyPolicyComposition().diagnosticPolicy(),
			actionFailurePresenter: this.actionFailurePresenter(),
			actionReport: this.actionReport(),
			actionOutput: this.actionOutput(),
			createActionMessages: (...args) => this.actionMessages(...args),
		});
	}
	assetContentConfiguration(): AssetContentConfiguration {
		return new AssetContentConfiguration({
			runtimeInput: this.runtimeInput(),
			contentContractPolicy:
				new PublicationDomainComposition().contentContractPolicy(),
			assetRenderConfiguration: this.assetRenderConfiguration(),
		});
	}
	assetDateFormatter(...args: AssetDateFormatterArguments): AssetDateFormatter {
		return new AssetDateFormatter(...args);
	}
	assetMessages(...args: AssetMessagesArguments): AssetMessages {
		return new AssetMessages(
			{ localeResolver: new LocalizationComposition().localeResolver() },
			...args,
		);
	}
	assetRenderConfiguration(): AssetRenderConfiguration {
		return new AssetRenderConfiguration({
			contentContractPolicy:
				new PublicationDomainComposition().contentContractPolicy(),
			runtimeInput: this.runtimeInput(),
		});
	}
	assetRenderPresenterImpl(
		...args: AssetRenderPresenterImplArguments
	): AssetRenderPresenterImpl {
		return new AssetRenderPresenterImpl(
			{
				date: this.assetDateFormatter(args[0].locale),
			},
			...args,
		);
	}
	attentionStageInput(): AttentionStageInput {
		return new AttentionStageInput();
	}
	attentionStages(): AttentionStages {
		return new AttentionStages({
			attentionStageEvaluation:
				new JourneyPolicyComposition().attentionStageEvaluation(),
			attentionStageInput: this.attentionStageInput(),
		});
	}
	communicationInput(): CommunicationInput {
		return new CommunicationInput({
			publicationUrlInput: this.publicationUrlInput(),
			conferenceHallInput: this.conferenceHallInput(),
		});
	}
	conferenceHallInput(): ConferenceHallInput {
		return new ConferenceHallInput();
	}
	meetupPublicationConfiguration(): MeetupPublicationConfiguration {
		return new MeetupPublicationConfiguration({
			runtimeInput: this.runtimeInput(),
			scheduledEventPolicy:
				new PublicationDomainComposition().scheduledEventPolicy(),
		});
	}
	organizerFeedback(...args: OrganizerFeedbackArguments): OrganizerFeedback {
		return new OrganizerFeedback(
			{
				attentionStageInput: this.attentionStageInput(),
				createReconcileOrganizerFeedback: (...args) =>
					new JourneyComposition().reconcileOrganizerFeedback(...args),
			},
			...args,
		);
	}
	referentialActionReport(): ReferentialActionReport {
		return new ReferentialActionReport();
	}
	runtimeInput(): RuntimeInput {
		return new RuntimeInput();
	}
	speakerSyncFailureReport(): SpeakerSyncFailureReport {
		return new SpeakerSyncFailureReport({
			createActionMessages: (...args) => this.actionMessages(...args),
		});
	}
}
