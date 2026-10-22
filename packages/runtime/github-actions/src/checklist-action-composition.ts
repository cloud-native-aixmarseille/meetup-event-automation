import type {
	EventCommentRepository,
	EventRepository,
} from "@meetup-automation/event";
import type { AutomationConfig } from "@meetup-automation/journey";
import { ChecklistAction } from "./checklist-action.js";
import { EventComposition, SERVICES } from "./composition.js";
import { GithubActionsComposition } from "./dependency-composition.js";

export class ChecklistActionComposition {
	action(): ChecklistAction {
		const runtime = new GithubActionsComposition();
		return new ChecklistAction({
			runtime: runtime.runtimeInput(),
			create: (input) => {
				const container = EventComposition.createDocumentContainer({
					...input,
					retireCommunicationReports: true,
				});
				return runtime.organizerFeedback(
					container.get<EventRepository>(SERVICES.eventRepository),
					container.get<EventCommentRepository>(
						SERVICES.eventCommentRepository,
					),
					container.get<AutomationConfig>(SERVICES.config).event["issue-label"],
				);
			},
		});
	}
}
