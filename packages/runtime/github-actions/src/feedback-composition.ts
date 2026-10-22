import type {
	EventDocumentCodec,
	EventRepository,
} from "@meetup-automation/event";
import {
	JourneyComposition,
	ManageMeetupEvent,
	ReconcileMeetupFeedback,
} from "@meetup-automation/journey";
import { OpenfeedbackEventGatewayComposition } from "@meetup-automation/openfeedback-event-gateway";
import type { FeedbackEventGateway } from "@meetup-automation/publication";
import {
	EventComposition,
	type EventCompositionInput,
	SERVICES,
} from "./composition.js";

export const FEEDBACK_EVENTS = Symbol("FeedbackEventGateway");

export class FeedbackComposition {
	static createFeedbackContainer(
		input: EventCompositionInput & {
			openFeedbackApiKey: string;
		},
	) {
		const container = EventComposition.createEventContainer(input);
		container
			.bind<FeedbackEventGateway>(FEEDBACK_EVENTS)
			.toDynamicValue(() =>
				new OpenfeedbackEventGatewayComposition()
					.openFeedbackEventGatewayFactory()
					.create(input.openFeedbackApiKey, fetch),
			);
		container.bind(ReconcileMeetupFeedback).toDynamicValue((context) =>
			new JourneyComposition().reconcileMeetupFeedback({
				eventRepository: context.get<EventRepository>(SERVICES.eventRepository),
				documentCodec: context.get<EventDocumentCodec>(
					SERVICES.eventDocumentCodec,
				),
				manageEvent: context.get(ManageMeetupEvent),
				events: context.get<FeedbackEventGateway>(FEEDBACK_EVENTS),
			}),
		);
		return container;
	}
}
