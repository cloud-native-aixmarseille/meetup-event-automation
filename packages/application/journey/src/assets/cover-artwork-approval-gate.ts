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
export class CoverArtworkApprovalGate {
	constructor(
		private readonly store: ContentProposalStore,
		private readonly authority: ContentAuthority,
		private readonly projection: Pick<ContentFactsProjection, "create">,
		private readonly plans: Pick<ContentPlanFactory, "create">,
		private readonly policy: Pick<PromotionalContentPolicy, "current">,
		private readonly settings: () => Promise<{
			publication: ScheduledEventSettings;
			content: ContentSettings;
		}>,
	) {}
	async cover(event: MeetupEvent) {
		const proposal = (await this.store.load()).proposals
			.filter((item) => item.plan.target === "cover")
			.at(-1);
		if (proposal?.accepted?.media.length !== 1) return undefined;
		const settings = await this.settings();
		const plan = this.plans.create(
			"cover",
			proposal.plan.language,
			this.projection.create(
				event,
				settings.publication,
				settings.content,
				null,
				"cover",
			),
			settings.content.reminderTime,
		);
		if (
			!this.policy.current(proposal, plan) ||
			!(await this.authority.authorized(proposal))
		)
			return undefined;
		return proposal.accepted.media[0];
	}
}
