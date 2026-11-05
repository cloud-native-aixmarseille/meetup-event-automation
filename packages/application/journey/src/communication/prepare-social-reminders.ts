import type { SocialDestination } from "@meetup-automation/communication";
import type { EventDiagnostic, EventIdentity } from "@meetup-automation/event";
import type { GenerateTextProposal } from "../proposals/generate-text-proposal.js";
import type { PreparePromotionalContent } from "../proposals/prepare-promotional-content.js";
import type {
	ContentOrigin,
	ContentTarget,
} from "../proposals/promotional-content.js";
import type { PromotionalContentPolicy } from "../proposals/promotional-content-policy.js";
import type { ContentProposalStore } from "../proposals/promotional-content-ports.js";
import type { SocialReminderPlans } from "./social-reminder-plans.js";

export class PrepareSocialReminders {
	constructor(
		private readonly plans: Pick<SocialReminderPlans, "targets" | "read">,
		private readonly store: ContentProposalStore,
		private readonly prepare: Pick<PreparePromotionalContent, "execute">,
		private readonly generate: Pick<GenerateTextProposal, "execute">,
		private readonly policy: Pick<PromotionalContentPolicy, "current">,
	) {}

	async execute(
		identity: EventIdentity,
		destinations: readonly SocialDestination[],
		origin: ContentOrigin,
		guidance: string,
	) {
		const diagnostics: EventDiagnostic[] = [];
		const results: { target: ContentTarget; status: string }[] = [];
		for (const target of this.plans.targets(destinations)) {
			let status: string | undefined;
			try {
				status = await this.prepareTarget(identity, target, origin, guidance);
			} catch {
				status = "failed";
			}
			if (!status) continue;
			results.push({ target, status });
			if (status === "complete") continue;
			diagnostics.push({
				code: `communication.social.${status === "failed" ? "preparation-failed" : status === "recovery" ? "generation-recovery" : "missing"}`,
				severity: status === "failed" ? "error" : "warning",
				category: "incomplete",
				field: `social.${target.replace(":", ".")}`,
				message: `Social reminder preparation: ${status}`,
			});
		}
		return { results, diagnostics };
	}

	private async prepareTarget(
		identity: EventIdentity,
		target: ContentTarget,
		origin: ContentOrigin,
		guidance: string,
	) {
		const context = await this.plans.read(identity, target);
		if (!context) return undefined;
		const previous = (await this.store.load()).proposals
			.filter((proposal) => proposal.plan.target === target)
			.at(-1);
		// Automatic scans retain existing editorial decisions and delivery history.
		if (previous?.plan.facts.date === context.plan.facts.date) {
			if (previous.draft) return "complete";
			return previous.attempts.length ||
				!this.policy.current(previous, context.plan)
				? "recovery"
				: this.generate.execute(previous.id);
		}
		const proposal = await this.prepare.execute(
			context.plan,
			origin,
			guidance,
			context.destination,
			[],
		);
		if (!proposal) return "blocked";
		if (!this.policy.current(proposal, context.plan)) return "recovery";
		return this.generate.execute(proposal.id);
	}
}
