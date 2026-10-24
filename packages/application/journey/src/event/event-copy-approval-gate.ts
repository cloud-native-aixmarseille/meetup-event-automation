import type { MeetupEvent } from "@meetup-automation/event";
import type { ContentAuthority } from "../ports/content-authority.js";
import type { ContentPlanFactory } from "../proposals/content-plan-factory.js";
import type { PromotionalContentPolicy } from "../proposals/promotional-content-policy.js";
import type { ContentProposalStore } from "../proposals/promotional-content-ports.js";
import type {
	ContentFactsProjection,
	ContentSettings,
} from "../review/content-facts-projection.js";
import type { ScheduledEventSettings } from "../use-cases/scheduled-event-projection.js";

/** Only proposal-managed fields acquire a content gate; other event work keeps its own rules. */
export class EventCopyApprovalGate {
	constructor(
		private readonly store: ContentProposalStore,
		private readonly authority: ContentAuthority,
		private readonly projection: Pick<
			ContentFactsProjection,
			"create" | "destination"
		>,
		private readonly plans: Pick<ContentPlanFactory, "create">,
		private readonly policy: Pick<PromotionalContentPolicy, "current">,
		private readonly settings: () => Promise<{
			publication: ScheduledEventSettings;
			content: ContentSettings;
		}>,
	) {}
	async blocked(
		event: MeetupEvent,
	): Promise<readonly ("title" | "description")[]> {
		const { proposals } = await this.store.load();
		const managed = proposals.filter(
			(item) =>
				item.plan.target === "title" || item.plan.target === "description",
		);
		if (!managed.length) return [];
		const settings = await this.settings();
		const facts = this.projection.create(
			event,
			settings.publication,
			settings.content,
			null,
		);
		const blocked: ("title" | "description")[] = [];
		for (const target of ["title", "description"] as const) {
			const proposal = managed
				.filter((item) => item.plan.target === target)
				.at(-1);
			if (!proposal) continue;
			const plan = this.plans.create(
				target,
				proposal.plan.language,
				facts,
				settings.content.reminderTime,
			);
			if (
				!proposal.accepted ||
				proposal.accepted.text !== this.projection.destination(event, target) ||
				!this.policy.current(proposal, plan) ||
				!(await this.authority.authorized(proposal))
			)
				blocked.push(target);
		}
		return blocked;
	}
}
