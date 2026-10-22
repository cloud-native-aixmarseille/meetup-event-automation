import {
	type EventClock,
	type EventDocumentCodec,
	EventDomainComposition,
	type EventRepository,
} from "@meetup-automation/event";
import {
	type AutomationConfig,
	ReconcileFeedbackLink,
} from "@meetup-automation/journey";
import { KuttFeedbackLinkGatewayComposition } from "@meetup-automation/kutt-feedback-link-gateway";
import { PublicationDomainComposition } from "@meetup-automation/publication";
import {
	EventComposition,
	type EventDocumentCompositionInput,
	SERVICES,
} from "./composition.js";
import { FeedbackLinkAction } from "./feedback-link-action.js";

export class FeedbackLinkActionComposition {
	static create(
		input: EventDocumentCompositionInput & {
			apiKey: string;
			baseUrl: string;
			linkId: string;
		},
	) {
		const container = EventComposition.createDocumentContainer(input);
		const config = container.get<AutomationConfig>(SERVICES.config);
		return new ReconcileFeedbackLink({
			events: container.get<EventRepository>(SERVICES.eventRepository),
			codec: container.get<EventDocumentCodec>(SERVICES.eventDocumentCodec),
			clock: container.get<EventClock>(SERVICES.eventClock),
			concurrency: new EventDomainComposition().eventDocumentConcurrency(),
			selection: new PublicationDomainComposition().feedbackLinkSelection(),
			policy: new PublicationDomainComposition().feedbackPolicy(),
			links: new KuttFeedbackLinkGatewayComposition().kuttFeedbackLinkGateway(
				input.apiKey,
				input.linkId,
				input.baseUrl,
			),
			label: config.event["issue-label"],
			timeZone: config.timezone,
		});
	}
	action(): FeedbackLinkAction {
		return new FeedbackLinkAction(FeedbackLinkActionComposition.create);
	}
}
