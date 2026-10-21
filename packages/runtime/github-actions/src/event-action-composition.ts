import { ListActiveEvents } from "@meetup-automation/event";
import {
	type AutomationConfig,
	ManageMeetupEvent,
} from "@meetup-automation/journey";
import { EventComposition, SERVICES } from "./composition.js";
import { GithubActionsComposition } from "./dependency-composition.js";
import { EventActions } from "./event-actions.js";
export class EventActionComposition {
	eventActions(): EventActions {
		return new EventActions({
			createEventJourney: (input) =>
				EventComposition.createEventContainer(input).get(ManageMeetupEvent),
			createEventListing: (input) => {
				const container = EventComposition.createDocumentContainer(input);
				return {
					events: container.get(ListActiveEvents),
					label: container.get<AutomationConfig>(SERVICES.config).event[
						"issue-label"
					],
				};
			},
			runtimeInput: new GithubActionsComposition().runtimeInput(),
			conferenceHallInput: new GithubActionsComposition().conferenceHallInput(),
			actionOutput: new GithubActionsComposition().actionOutput(),
		});
	}
}
