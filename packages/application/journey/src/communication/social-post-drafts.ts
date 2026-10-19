import type {
	SocialPostChannel,
	SocialPostDraft,
	SocialPostMilestone,
} from "@meetup-automation/communication";
import type {
	ContentDraft,
	ContentPlan,
	ContentTarget,
} from "../proposals/promotional-content.js";
import type { ProposalDefinition } from "../proposals/proposal-definition.js";

export class SocialPostDrafts implements ProposalDefinition {
	constructor(private readonly posts: SocialPostDraft) {}
	supports(target: ContentTarget): boolean {
		return target.includes(":");
	}
	source(plan: Omit<ContentPlan, "sourceFingerprint">): unknown {
		const { channel } = this.destination(plan.target);
		return {
			...this.posts.source(plan.facts, channel),
			...(channel === "linkedin"
				? { announcement: plan.facts.announcement }
				: {}),
		};
	}
	ready(plan: ContentPlan): boolean {
		return (
			this.posts.ready(plan.facts) &&
			(this.destination(plan.target).channel !== "linkedin" ||
				Boolean(plan.facts.announcement))
		);
	}
	valid(plan: ContentPlan, draft: ContentDraft): boolean {
		if (!this.posts.valid(plan.facts, draft.text)) return false;
		if (this.destination(plan.target).channel !== "linkedin")
			return draft.media.length === 0;
		const expected = plan.facts.announcement;
		const image = draft.media[0];
		return (
			draft.media.length === 1 &&
			Boolean(expected) &&
			image?.fingerprint === expected?.fingerprint &&
			image?.id === expected?.id &&
			image?.url === expected?.url &&
			image?.sourceRevision === expected?.sourceRevision &&
			image?.source?.id === expected?.source?.id &&
			image?.source?.revision === expected?.source?.revision
		);
	}
	brief(plan: ContentPlan, guidance: string) {
		const { channel, milestone } = this.destination(plan.target);
		return this.posts.brief(
			plan.facts,
			channel,
			milestone,
			plan.language,
			guidance,
		);
	}
	media(plan: ContentPlan): ContentDraft["media"] {
		return this.destination(plan.target).channel === "linkedin" &&
			plan.facts.announcement
			? [plan.facts.announcement]
			: [];
	}
	private destination(target: ContentTarget): {
		channel: SocialPostChannel;
		milestone: SocialPostMilestone;
	} {
		const [channel, milestone] = target.split(":");
		if (
			(channel !== "slack-aix" &&
				channel !== "slack-openbar" &&
				channel !== "linkedin") ||
			(milestone !== "announcement" && milestone !== "d7" && milestone !== "d0")
		)
			throw new Error("Unsupported social post destination");
		return { channel, milestone };
	}
}
