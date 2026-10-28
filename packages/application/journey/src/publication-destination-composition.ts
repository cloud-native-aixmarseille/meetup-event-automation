import {
	type EventClock,
	EventDomainComposition,
} from "@meetup-automation/event";
import {
	type CommunityEvent,
	CommunityEventIdentityPolicy,
	CommunityEventPolicy,
	type CommunityGroupUrl,
	type EventPublicationGateway,
	MeetupEventIdentityPolicy,
	type MeetupGroupUrl,
	type MeetupPublicationEvent,
	PublicationDomainComposition,
	type PublicationJournal,
	type ScheduledEvent,
} from "@meetup-automation/publication";
import { CommunityPublicationRevision } from "./approval/community-publication-revision.js";
import type { CoverArtworkApprovalGate } from "./assets/cover-artwork-approval-gate.js";
import { EventPublicationComposition } from "./event-publication-composition.js";
import { JourneyPolicyComposition } from "./policy-composition.js";
import type { OrganizerApproval } from "./ports/organizer-approval.js";
import { CommunityPublicationIssueProjection } from "./use-cases/community-publication-issue-projection.js";
import {
	CommunityPublicationProjection,
	type CommunityPublicationSettings,
} from "./use-cases/community-publication-projection.js";
import { MeetupPublicationIssueProjection } from "./use-cases/meetup-publication-issue-projection.js";
import { MeetupPublicationProjection } from "./use-cases/meetup-publication-projection.js";
import type { ScheduledEventSettings } from "./use-cases/scheduled-event-projection.js";

type DestinationInput<Event extends ScheduledEvent, Settings> = {
	gateway: EventPublicationGateway<Event>;
	journal: PublicationJournal;
	approval: OrganizerApproval;
	clock: EventClock;
	settings: Settings;
};

export class PublicationDestinationComposition {
	meetup(
		input: DestinationInput<MeetupPublicationEvent, ScheduledEventSettings> & {
			artwork: Pick<CoverArtworkApprovalGate, "cover">;
		},
		group: MeetupGroupUrl,
	) {
		return new EventPublicationComposition().destination(
			{
				...input,
				key: { provider: "meetup", target: group.eventUrlPrefix },
				field: "meetup",
				label: "Meetup",
				approvalKind: "meetup-publication",
				projection: new MeetupPublicationProjection(
					new JourneyPolicyComposition().scheduledEventProjection(),
					input.artwork,
				),
				policy: new PublicationDomainComposition().scheduledEventPolicy(),
				identityPolicy: new MeetupEventIdentityPolicy(group),
				pendingRecovery: "verified-link",
				issueProjection: new MeetupPublicationIssueProjection(
					new EventDomainComposition().meetupPublicationChecklist(),
				),
				revision: new JourneyPolicyComposition().meetupPublicationRevision(),
			},
			input.clock,
		);
	}
	community(
		input: DestinationInput<CommunityEvent, CommunityPublicationSettings> & {
			target: string;
		},
		group: CommunityGroupUrl,
	) {
		return new EventPublicationComposition().destination(
			{
				...input,
				key: { provider: "ocgroups", target: input.target },
				field: "community",
				label: "Community",
				approvalKind: "community-publication",
				projection: new CommunityPublicationProjection(
					new JourneyPolicyComposition().scheduledEventProjection(),
				),
				policy: new CommunityEventPolicy(
					new PublicationDomainComposition().scheduledEventPolicy(),
				),
				identityPolicy: new CommunityEventIdentityPolicy(group),
				pendingRecovery: "journal-identity",
				issueProjection: new CommunityPublicationIssueProjection(),
				revision: new CommunityPublicationRevision(
					new PublicationDomainComposition().contentFingerprint(),
				),
			},
			input.clock,
		);
	}
}
