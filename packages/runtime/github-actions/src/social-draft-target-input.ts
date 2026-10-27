import * as core from "@actions/core";
import type { SocialDestination } from "@meetup-automation/communication";
import type { ContentTarget } from "@meetup-automation/journey";

export class SocialDraftTargetInput {
	constructor(private readonly provider: SocialDestination["provider"]) {}
	read(input: {
		readonly destinations: readonly SocialDestination[];
	}): ContentTarget {
		const target = core.getInput("target", { required: true });
		const [key, milestone, extra] = target.split(":");
		if (
			extra !== undefined ||
			!["announcement", "d7", "d0"].includes(milestone) ||
			!input.destinations.some(
				(destination) =>
					destination.key === key && destination.provider === this.provider,
			)
		)
			throw new Error(
				"Draft target is not a configured destination for this action",
			);
		return target as ContentTarget;
	}
}
