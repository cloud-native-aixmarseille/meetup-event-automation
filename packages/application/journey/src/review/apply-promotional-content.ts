import type { SocialPostTiming } from "@meetup-automation/communication";
import type { EventIdentity } from "@meetup-automation/event";
import type { ApplyEventCopy } from "../event/apply-event-copy.js";
import type {
	ContentPlan,
	ContentProposal,
} from "../proposals/promotional-content.js";
import type { PromotionalContentPolicy } from "../proposals/promotional-content-policy.js";
import type { ContentProposalStore } from "../proposals/promotional-content-ports.js";
import type { ContentReview } from "./content-review.js";
import type { ContentWorkspace } from "./content-workspace.js";

export class ApplyPromotionalContent {
	constructor(
		private readonly store: ContentProposalStore,
		private readonly workspace: Pick<ContentWorkspace, "read">,
		private readonly eventCopy: Pick<ApplyEventCopy, "apply">,
		private readonly review: Pick<ContentReview, "approved">,
		private readonly policy: Pick<PromotionalContentPolicy, "current">,
		private readonly timing: Pick<
			SocialPostTiming,
			"publicationEligible" | "expired"
		>,
		private readonly now: () => string,
	) {}
	async execute(
		identity: EventIdentity,
		proposal: ContentProposal,
	): Promise<"accepted" | "pending" | "stale" | "scheduled"> {
		const context = await this.workspace.read(
			identity,
			proposal.plan.target,
			proposal.plan.language,
		);
		if (!context || !this.policy.current(proposal, context.plan))
			return "stale";
		const accepted = await this.review.approved(proposal, context.plan);
		if (!accepted) return "pending";
		if (
			context.destination !== null &&
			context.destination !== proposal.destinationBefore &&
			context.destination !== accepted.text
		)
			return "stale";
		const availability = this.availability(context.plan);
		if (availability) return availability;
		const snapshot = await this.store.load();
		if (
			snapshot.proposals
				.filter((item) => item.plan.target === proposal.plan.target)
				.at(-1)?.id !== proposal.id
		)
			return "stale";
		// Recheck public facts and issue revision after permission and media reads.
		const fresh = await this.workspace.read(
			identity,
			proposal.plan.target,
			proposal.plan.language,
		);
		if (
			!fresh ||
			!this.policy.current(proposal, fresh.plan) ||
			fresh.destination !== context.destination
		)
			return "stale";
		if (!(await this.review.approved(proposal, fresh.plan))) return "pending";
		const freshAvailability = this.availability(fresh.plan);
		if (freshAvailability) return freshAvailability;
		if (context.destination !== null && context.destination !== accepted.text)
			await this.eventCopy.apply(fresh, accepted.text);
		const current = await this.store.load();
		await this.store.save(
			current,
			current.proposals.map((item) =>
				item.id === proposal.id && !item.accepted
					? { ...item, accepted }
					: item,
			),
		);
		return "accepted";
	}
	private availability(plan: ContentPlan): "stale" | "scheduled" | undefined {
		if (!plan.target.includes(":")) return undefined;
		const now = this.now();
		if (this.timing.publicationEligible(plan, now)) return undefined;
		return this.timing.expired(plan, now) ? "stale" : "scheduled";
	}
}
