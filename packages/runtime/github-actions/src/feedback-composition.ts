import type {
	EventClock,
	EventDocumentCodec,
	EventRepository,
} from "@meetup-automation/event";
import {
	type AutomationConfig,
	JourneyComposition,
	ManageMeetupEvent,
	ManageMeetupFeedback,
} from "@meetup-automation/journey";
import { KuttFeedbackLinkGatewayComposition } from "@meetup-automation/kutt-feedback-link-gateway";
import { OpenfeedbackEventGatewayComposition } from "@meetup-automation/openfeedback-event-gateway";
import type {
	FeedbackEventGateway,
	FeedbackLinkGateway,
} from "@meetup-automation/publication";
import {
	EventComposition,
	type EventCompositionInput,
	SERVICES,
} from "./composition.js";

export const FEEDBACK_LINKS = Symbol("FeedbackLinkGateway");
export const FEEDBACK_EVENTS = Symbol("FeedbackEventGateway");

export class FeedbackComposition {
	static createFeedbackContainer(
		input: EventCompositionInput & {
			kuttApiKey: string;
			kuttBaseUrl: string;
			kuttLinkId: string;
			openFeedbackApiKey: string;
		},
	) {
		const container = EventComposition.createEventContainer(input);
		container
			.bind<FeedbackEventGateway>(FEEDBACK_EVENTS)
			.toDynamicValue(() =>
				new OpenfeedbackEventGatewayComposition()
					.openFeedbackEventGatewayFactory()
					.create(input.openFeedbackApiKey),
			);
		container
			.bind<FeedbackLinkGateway>(FEEDBACK_LINKS)
			.toDynamicValue(() =>
				new KuttFeedbackLinkGatewayComposition().kuttFeedbackLinkGateway(
					input.kuttApiKey,
					input.kuttLinkId,
					input.kuttBaseUrl,
				),
			);
		container.bind(ManageMeetupFeedback).toDynamicValue((context) =>
			new JourneyComposition().manageMeetupFeedback({
				eventLabel: context.get<AutomationConfig>(SERVICES.config).event[
					"issue-label"
				],
				eventRepository: context.get<EventRepository>(SERVICES.eventRepository),
				documentCodec: context.get<EventDocumentCodec>(
					SERVICES.eventDocumentCodec,
				),
				clock: context.get<EventClock>(SERVICES.eventClock),
				manageEvent: context.get(ManageMeetupEvent),
				links: context.get<FeedbackLinkGateway>(FEEDBACK_LINKS),
				events: context.get<FeedbackEventGateway>(FEEDBACK_EVENTS),
			}),
		);
		return container;
	}
}
