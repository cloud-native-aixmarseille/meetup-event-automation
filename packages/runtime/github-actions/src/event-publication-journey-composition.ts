import type {
	EventClock,
	EventDocumentCodec,
	EventRepository,
} from "@meetup-automation/event";
import {
	GithubEventWebsiteComposition,
	type GithubWebsiteClient,
} from "@meetup-automation/github-event-website";
import {
	EventPublicationComposition,
	ManageMeetupEvent,
	ReconcileEventPublications,
} from "@meetup-automation/journey";
import {
	EventComposition,
	type EventCompositionInput,
	SERVICES,
} from "./composition.js";
import { ContentGateComposition } from "./content-gate-composition.js";
import { EventPublicationApprovalComposition } from "./event-publication-approval-composition.js";
import type { EventWebsiteSettings } from "./event-website-configuration.js";
import { PublicationAdapterComposition } from "./publication-adapter-composition.js";
import type { ConfiguredPublicationAdapter } from "./publication-credentials-input.js";

export class EventPublicationJourneyComposition {
	static create(
		input: EventCompositionInput & {
			locale: string;
			issueNumber: number;
			commentAuthorLogin: string;
			adapters: readonly ConfiguredPublicationAdapter[];
			slackToken: string;
			slackOrganizerChannelId: string;
			website?: {
				settings: EventWebsiteSettings;
				createClient: () => GithubWebsiteClient;
			};
		},
	) {
		const container = EventComposition.createEventContainer(input);
		container.bind(ReconcileEventPublications).toDynamicValue((context) => {
			const clock = context.get<EventClock>(SERVICES.eventClock);
			const approval = EventPublicationApprovalComposition.create(input);
			const adapters = new PublicationAdapterComposition();
			const website = input.website
				? new GithubEventWebsiteComposition().create(
						input.website.createClient,
						{
							owner: input.owner,
							repo: input.website.settings.repository,
							path: input.website.settings.path,
						},
						input.locale,
					)
				: undefined;
			return new EventPublicationComposition().collection(
				{
					repository: context.get<EventRepository>(SERVICES.eventRepository),
					codec: context.get<EventDocumentCodec>(SERVICES.eventDocumentCodec),
					clock,
					manageEvent: context.get(ManageMeetupEvent),
					contentGate: new ContentGateComposition().create(
						input,
						input.issueNumber,
						input.commentAuthorLogin,
					),
				},
				input.adapters.map((adapter) =>
					adapters.create({ ...input, clock, approval, website }, adapter),
				),
				input.adapters
					.filter((adapter) => adapter.provider === "meetup")
					.map((adapter) =>
						adapters.slides({ ...input, clock, approval, website }, adapter, {
							repository: context.get<EventRepository>(
								SERVICES.eventRepository,
							),
							codec: context.get<EventDocumentCodec>(
								SERVICES.eventDocumentCodec,
							),
						}),
					),
			);
		});
		return container;
	}
}
