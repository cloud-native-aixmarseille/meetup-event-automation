import {
	DiagnosticPolicy,
	JourneyComposition,
	JourneyPolicyComposition,
} from "@meetup-automation/journey";
import {
	LocaleResolver,
	LocalizationComposition,
} from "@meetup-automation/localization";
import type { Container } from "inversify";
import { ActionFailurePresenter } from "./action-failure-presenter.js";
import { ActionOutput } from "./action-output.js";
import { ActionReport } from "./action-report.js";
import { ActionRunner } from "./action-runner.js";
import {
	AssetDateFormatter,
	type AssetDateFormatterArguments,
} from "./assets/asset-date-formatter.js";
import {
	AssetMessages,
	type AssetMessagesArguments,
} from "./assets/asset-messages.js";
import {
	AssetRenderPresenterImpl,
	type AssetRenderPresenterImplArguments,
} from "./assets/asset-render-presenter.js";
import { AttentionStageInput } from "./attention-stage-input.js";
import {
	ActionMessages,
	type ActionMessagesArguments,
} from "./i18n/action-messages.js";
import {
	OrganizerFeedback,
	type OrganizerFeedbackArguments,
} from "./organizer-feedback.js";
import { ReferentialActionReport } from "./referential-action-report.js";
import { SpeakerSyncFailureReport } from "./speaker-sync-failure-report.js";

export interface RuntimeFactories {
	actionMessages: (...args: ActionMessagesArguments) => ActionMessages;
	assetMessages: (...args: AssetMessagesArguments) => AssetMessages;
	assetDateFormatter: (
		...args: AssetDateFormatterArguments
	) => AssetDateFormatter;
	assetRenderPresenter: (
		...args: AssetRenderPresenterImplArguments
	) => AssetRenderPresenterImpl;
	organizerFeedback: (...args: OrganizerFeedbackArguments) => OrganizerFeedback;
}

export const RUNTIME_FACTORIES = {
	actionMessages: Symbol("ActionMessagesFactory"),
	assetMessages: Symbol("AssetMessagesFactory"),
	assetDateFormatter: Symbol("AssetDateFormatterFactory"),
	assetRenderPresenter: Symbol("AssetRenderPresenterFactory"),
	organizerFeedback: Symbol("OrganizerFeedbackFactory"),
};

export class RuntimePresentationComposition {
	static bind(container: Container): void {
		container
			.bind(LocaleResolver)
			.toResolvedValue(() => new LocalizationComposition().localeResolver());
		container
			.bind<RuntimeFactories["actionMessages"]>(
				RUNTIME_FACTORIES.actionMessages,
			)
			.toResolvedValue(
				(localeResolver: LocaleResolver) =>
					(...args: ActionMessagesArguments) =>
						new ActionMessages({ localeResolver }, ...args),
				[LocaleResolver],
			);
		RuntimePresentationComposition.bindReporting(container);
		RuntimePresentationComposition.bindAssets(container);
		container
			.bind<RuntimeFactories["organizerFeedback"]>(
				RUNTIME_FACTORIES.organizerFeedback,
			)
			.toResolvedValue(
				(attentionStageInput: AttentionStageInput) =>
					(...args: OrganizerFeedbackArguments) =>
						new OrganizerFeedback(
							{
								attentionStageInput,
								createReconcileOrganizerFeedback: (...input) =>
									new JourneyComposition().reconcileOrganizerFeedback(...input),
							},
							...args,
						),
				[AttentionStageInput],
			);
	}

	private static bindReporting(container: Container): void {
		container
			.bind(DiagnosticPolicy)
			.toResolvedValue(() => new JourneyPolicyComposition().diagnosticPolicy());
		container
			.bind(ActionFailurePresenter)
			.toResolvedValue(() => new ActionFailurePresenter());
		container.bind(ActionOutput).toResolvedValue(() => new ActionOutput());
		container.bind(ActionReport).toResolvedValue(() => new ActionReport());
		container
			.bind(ReferentialActionReport)
			.toResolvedValue(() => new ReferentialActionReport());
		container.bind(ActionRunner).toResolvedValue(
			(
				diagnosticPolicy: DiagnosticPolicy,
				actionFailurePresenter: ActionFailurePresenter,
				actionReport: ActionReport,
				actionOutput: ActionOutput,
				createActionMessages: RuntimeFactories["actionMessages"],
			) =>
				new ActionRunner({
					diagnosticPolicy,
					actionFailurePresenter,
					actionReport,
					actionOutput,
					createActionMessages,
				}),
			[
				DiagnosticPolicy,
				ActionFailurePresenter,
				ActionReport,
				ActionOutput,
				RUNTIME_FACTORIES.actionMessages,
			],
		);
		container
			.bind(SpeakerSyncFailureReport)
			.toResolvedValue(
				(createActionMessages: RuntimeFactories["actionMessages"]) =>
					new SpeakerSyncFailureReport({ createActionMessages }),
				[RUNTIME_FACTORIES.actionMessages],
			);
	}

	private static bindAssets(container: Container): void {
		container
			.bind<RuntimeFactories["assetMessages"]>(RUNTIME_FACTORIES.assetMessages)
			.toResolvedValue(
				(localeResolver: LocaleResolver) =>
					(...args: AssetMessagesArguments) =>
						new AssetMessages({ localeResolver }, ...args),
				[LocaleResolver],
			);
		container
			.bind<RuntimeFactories["assetDateFormatter"]>(
				RUNTIME_FACTORIES.assetDateFormatter,
			)
			.toResolvedValue(
				() =>
					(...args: AssetDateFormatterArguments) =>
						new AssetDateFormatter(...args),
			);
		container
			.bind<RuntimeFactories["assetRenderPresenter"]>(
				RUNTIME_FACTORIES.assetRenderPresenter,
			)
			.toResolvedValue(
				(createDate: RuntimeFactories["assetDateFormatter"]) =>
					(...args: AssetRenderPresenterImplArguments) =>
						new AssetRenderPresenterImpl(
							{ date: createDate(args[0].locale) },
							...args,
						),
				[RUNTIME_FACTORIES.assetDateFormatter],
			);
	}
}
