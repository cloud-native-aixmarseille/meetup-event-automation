import type { SocialDestination } from "@meetup-automation/communication";
import type { EventIdentity } from "@meetup-automation/event";
import type { ContentProposal } from "../proposals/promotional-content.js";
import type { SocialPublicationResult } from "./social-publication-contracts.js";
import type { SocialReminderPlans } from "./social-reminder-plans.js";

export class MissingSocialReminders {
	constructor(
		private readonly plans: Pick<SocialReminderPlans, "targets" | "read">,
	) {}

	async evaluate(
		identity: EventIdentity,
		destinations: readonly SocialDestination[],
		proposals: ReadonlyMap<string, ContentProposal>,
	): Promise<SocialPublicationResult[]> {
		const missing: SocialPublicationResult[] = [];
		for (const target of this.plans.targets(destinations)) {
			const context = await this.plans.read(identity, target);
			if (
				!context ||
				proposals.get(target)?.plan.facts.date === context.plan.facts.date
			)
				continue;
			missing.push({
				target,
				occurrence: context.plan.facts.date,
				status: "missing",
				diagnostics: [
					{
						code: "communication.social.missing",
						severity: "warning",
						category: "incomplete",
						field: `social.${target.replace(":", ".")}`,
						message: "Social reminder draft is missing",
					},
				],
			});
		}
		return missing;
	}
}
