import type {
	SocialDestination,
	SocialPostTiming,
} from "@meetup-automation/communication";
import type {
	ContentFacts,
	ContentLanguage,
	ContentPlan,
	ContentTarget,
} from "./promotional-content.js";
import type { PromotionalContentFingerprint } from "./promotional-content-fingerprint.js";

export class ContentPlanFactory {
	constructor(
		private readonly fingerprints: Pick<
			PromotionalContentFingerprint,
			"source"
		>,
		private readonly timing: Pick<SocialPostTiming, "plannedAt">,
	) {}
	create(
		target: ContentTarget,
		language: ContentLanguage,
		facts: ContentFacts,
		reminderTime: string,
		destination?: SocialDestination,
	): ContentPlan {
		const plan = {
			target,
			...(destination ? { destination } : {}),
			language,
			facts,
			plannedAt: this.timing.plannedAt(
				target.endsWith(":d7")
					? "d7"
					: target.endsWith(":d0")
						? "d0"
						: "announcement",
				facts.date,
				reminderTime,
				facts.timeZone,
				facts.startTime,
			),
		};
		return { ...plan, sourceFingerprint: this.fingerprints.source(plan) };
	}
}
