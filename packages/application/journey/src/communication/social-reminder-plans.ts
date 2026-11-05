import type {
	SocialDestination,
	SocialPostTiming,
} from "@meetup-automation/communication";
import type {
	EventIdentity,
	MeetupPublicationChecklist,
} from "@meetup-automation/event";
import type {
	ContentLanguage,
	ContentTarget,
} from "../proposals/promotional-content.js";
import type { ContentWorkspace } from "../review/content-workspace.js";

export class SocialReminderPlans {
	constructor(
		private readonly workspace: Pick<ContentWorkspace, "read">,
		private readonly timing: Pick<SocialPostTiming, "expired">,
		private readonly publication: Pick<
			MeetupPublicationChecklist,
			"isPublished"
		>,
		private readonly language: ContentLanguage,
		private readonly now: () => string,
	) {}

	targets(destinations: readonly SocialDestination[]): ContentTarget[] {
		return destinations.flatMap((destination) => [
			`${destination.key}:d7` as ContentTarget,
			`${destination.key}:d0` as ContentTarget,
		]);
	}

	async read(identity: EventIdentity, target: ContentTarget) {
		const context = await this.workspace.read(identity, target, this.language);
		if (
			!context ||
			!this.publication.isPublished(context.event) ||
			this.timing.expired(context.plan, this.now())
		)
			return undefined;
		return context;
	}
}
