import type { SocialDeliveryRecord } from "@meetup-automation/communication";
import type {
	EventIdentity,
	MeetupPublicationChecklist,
} from "@meetup-automation/event";
import type { ContentProposal } from "../proposals/promotional-content.js";
import type { ContentContext } from "../review/content-workspace.js";
import type { SocialPublicationApprovalRequest } from "./social-publication-approval-request.js";
import type { SocialPublicationDependencies } from "./social-publication-contracts.js";
import { SocialPublicationStaleError } from "./social-publication-stale-error.js";

export class SocialPublicationReview {
	constructor(
		private readonly dependencies: Pick<
			SocialPublicationDependencies,
			| "configuration"
			| "store"
			| "workspace"
			| "policy"
			| "fingerprints"
			| "canApprove"
			| "timing"
			| "now"
			| "approvals"
		>,
		private readonly requests: Pick<
			SocialPublicationApprovalRequest,
			"request"
		>,
		private readonly publication: Pick<
			MeetupPublicationChecklist,
			"isPublished"
		>,
	) {}
	async context(
		identity: EventIdentity,
		proposal: ContentProposal,
	): Promise<ContentContext | undefined> {
		const destination = proposal.plan.destination;
		if (!destination || !proposal.decision || !proposal.draft) return undefined;
		const configured = (await this.dependencies.configuration()).find(
			(item) => item.key === destination.key,
		);
		if (
			this.dependencies.fingerprints.digest(configured) !==
			this.dependencies.fingerprints.digest(destination)
		)
			return undefined;
		const latest = (await this.dependencies.store.load()).proposals
			.filter((item) => item.plan.target === proposal.plan.target)
			.at(-1);
		if (latest?.id !== proposal.id || latest.revision !== proposal.revision)
			return undefined;
		const context = await this.dependencies.workspace.read(
			identity,
			proposal.plan.target,
			proposal.plan.language,
		);
		if (
			!context?.event.host?.displayName.trim() ||
			!context.event.confirmations.speakers ||
			!this.publication.isPublished(context.event) ||
			!this.dependencies.policy.eligible(proposal, context.plan) ||
			!(await this.dependencies.canApprove(proposal.decision.actor))
		)
			return undefined;
		return context;
	}
	async requireCurrent(
		identity: EventIdentity,
		proposal: ContentProposal,
		record: SocialDeliveryRecord,
	): Promise<void> {
		if (
			!(await this.context(identity, proposal)) ||
			!this.dependencies.timing.publicationEligible(
				proposal.plan,
				this.dependencies.now(),
			)
		)
			throw new SocialPublicationStaleError(
				"Social publication source is no longer eligible",
			);
		const decision = await this.dependencies.approvals.request(
			this.requests.request(proposal, record),
		);
		if (
			decision.status !== "approved" ||
			!decision.actor ||
			!decision.decidedAt
		)
			throw new SocialPublicationStaleError(
				"Social publication approval is unavailable",
			);
		if (
			!(await this.dependencies.canApprove(decision.actor)) ||
			!(await this.context(identity, proposal)) ||
			!this.dependencies.timing.publicationEligible(
				proposal.plan,
				this.dependencies.now(),
			)
		)
			throw new SocialPublicationStaleError(
				"Social publication source changed during approval verification",
			);
	}
}
