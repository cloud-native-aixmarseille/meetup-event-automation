import { MeetupPublicationChecklist } from "@meetup-automation/event";
import {
	PrepareSocialReminders,
	SocialReminderPlans,
} from "@meetup-automation/journey";
import type { AiConfiguration } from "./ai-configuration.js";
import type { DraftSource } from "./draft-workspace-composition.js";
import { SocialPostComposition } from "./social-post-composition.js";

export class SocialReminderComposition {
	create(
		input: DraftSource & { readonly credentials: string },
		ai: AiConfiguration,
	) {
		const services = new SocialPostComposition().linkedin(input, ai);
		return {
			generator: services.generator,
			prepare: new PrepareSocialReminders(
				new SocialReminderPlans(
					services.workspace,
					services.timing,
					new MeetupPublicationChecklist(),
					input.locale,
					() => new Date().toISOString(),
				),
				services.store,
				services.prepare,
				services.generate,
				services.policy,
			),
		};
	}
}
