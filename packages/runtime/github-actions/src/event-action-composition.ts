import { ListActiveEvents } from "@meetup-automation/event";
import {
	type AutomationConfig,
	ManageMeetupEvent,
} from "@meetup-automation/journey";
import { EventComposition, SERVICES } from "./composition.js";
import { GithubActionsComposition } from "./dependency-composition.js";
import { EventActions } from "./event-actions.js";
export class EventActionComposition {
	private readonly runtime = new GithubActionsComposition();

	eventActions(): EventActions {
		return new EventActions({
			publicationUrlInput: this.runtime.publicationUrlInput(),
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
			runtimeInput: this.runtime.runtimeInput(),
			conferenceHallInput: this.runtime.conferenceHallInput(),
			actionOutput: this.runtime.actionOutput(),
		});
	}
}
