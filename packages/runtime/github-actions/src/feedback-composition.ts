import type {
	EventClock,
	EventDocumentCodec,
	EventRepository,
} from "@meetup-automation/event";
import {
	ManageMeetupEvent,
	ManageMeetupFeedback,
} from "@meetup-automation/journey";
import { KuttFeedbackLinkGateway } from "@meetup-automation/kutt-feedback-link-gateway";
import type { FeedbackLinkGateway } from "@meetup-automation/publication";
import {
	EventComposition,
	type EventCompositionInput,
	SERVICES,
} from "./composition.js";

export const FEEDBACK_LINKS = Symbol("FeedbackLinkGateway");

export class FeedbackComposition {
	static createFeedbackContainer(
		input: EventCompositionInput & {
			kuttApiKey: string;
			kuttLinkId: string;
		},
	) {
		const container = EventComposition.createEventContainer(input);
		container
			.bind<FeedbackLinkGateway>(FEEDBACK_LINKS)
			.toDynamicValue(
				() => new KuttFeedbackLinkGateway(input.kuttApiKey, input.kuttLinkId),
			);
		container.bind(ManageMeetupFeedback).toDynamicValue(
			(context) =>
				new ManageMeetupFeedback({
					eventRepository: context.get<EventRepository>(
						SERVICES.eventRepository,
					),
					documentCodec: context.get<EventDocumentCodec>(
						SERVICES.eventDocumentCodec,
					),
					clock: context.get<EventClock>(SERVICES.eventClock),
					manageEvent: context.get(ManageMeetupEvent),
					links: context.get<FeedbackLinkGateway>(FEEDBACK_LINKS),
				}),
		);
		return container;
	}
}
