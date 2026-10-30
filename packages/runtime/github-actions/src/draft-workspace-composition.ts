import { randomUUID } from "node:crypto";
import { SocialPostTiming } from "@meetup-automation/communication";
import {
	type EventDocumentCodec,
	EventDocumentConcurrency,
	type EventRepository,
	type MeetupEvent,
} from "@meetup-automation/event";
import {
	GithubContentStoreComposition,
	GithubOrganizerApprovalComposition,
} from "@meetup-automation/github-organizer-approval";
import {
	ApplyEventCopy,
	ContentFactsProjection,
	ContentPlanFactory,
	ContentProposalFactory,
	ContentWorkspace,
	DraftProposalComposition,
	JourneyPolicyComposition,
	ManageMeetupEvent,
	PreparePromotionalContent,
} from "@meetup-automation/journey";
import type { ContentMedia } from "@meetup-automation/publication";
import { DateTemplateFormatter } from "@meetup-automation/templating";
import { AssetDateFormatter } from "./assets/asset-date-formatter.js";
import { EventComposition, SERVICES } from "./composition.js";
import type { DraftSourceInput } from "./draft-source-input.js";

export type DraftSource = Awaited<ReturnType<DraftSourceInput["read"]>>;
export class DraftWorkspaceComposition {
	create(
		input: DraftSource,
		announcement: (event: MeetupEvent) => Promise<ContentMedia | null>,
	) {
		const container = EventComposition.createEventContainer(input);
		const client =
			new GithubOrganizerApprovalComposition().githubApprovalClient(
				input.client,
				input.owner,
				input.repo,
				input.issueNumber,
			);
		const storage = new GithubContentStoreComposition();
		const store = storage.store(client, input.commentAuthorLogin);
		const definitions = new DraftProposalComposition();
		const fingerprints = definitions.fingerprints();
		const timing = new SocialPostTiming();
		const policy = definitions.policy();
		const factory = new ContentProposalFactory(randomUUID, () =>
			new Date().toISOString(),
		);
		const workspace = new ContentWorkspace({
			diagnostics: new JourneyPolicyComposition().diagnosticPolicy(),
			repository: container.get<EventRepository>(SERVICES.eventRepository),
			manageEvent: container.get(ManageMeetupEvent),
			plans: new ContentPlanFactory(fingerprints, timing),
			projection: new ContentFactsProjection(
				(date, language) =>
					new AssetDateFormatter(
						new DateTemplateFormatter(language),
						language,
					).format(date, "UTC", "month") ?? "",
			),
			publication: input.publication,
			settings: input.settings,
			destinations: input.destinations,
			announcement,
		});
		return {
			repository: container.get<EventRepository>(SERVICES.eventRepository),
			codec: container.get<EventDocumentCodec>(SERVICES.eventDocumentCodec),
			eventCopy: new ApplyEventCopy(
				container.get<EventRepository>(SERVICES.eventRepository),
				container.get<EventDocumentCodec>(SERVICES.eventDocumentCodec),
				new EventDocumentConcurrency(),
			),
			client,
			store,
			fingerprints,
			timing,
			policy,
			factory,
			workspace,
			recoveries: storage.recoveries(client),
			prepare: new PreparePromotionalContent(store, factory, policy, (actor) =>
				client.canApprove(actor),
			),
		};
	}
}
