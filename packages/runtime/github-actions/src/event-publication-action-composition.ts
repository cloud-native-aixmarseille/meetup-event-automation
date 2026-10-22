import { ManageMeetupPublication } from "@meetup-automation/journey";
import { GithubActionsComposition } from "./dependency-composition.js";
import { EventPublicationAction } from "./event-publication-action.js";
import { MeetupPublicationComposition } from "./meetup-publication-composition.js";
export class EventPublicationActionComposition {
	private readonly runtime = new GithubActionsComposition();

	action(): EventPublicationAction {
		return new EventPublicationAction({
			aiInput: this.runtime.aiInput(),
			publicationUrlInput: this.runtime.publicationUrlInput(),
			createJourney: (input) =>
				MeetupPublicationComposition.create(input).get(ManageMeetupPublication),
			runtimeInput: this.runtime.runtimeInput(),
			conferenceHallInput: this.runtime.conferenceHallInput(),
			meetupPublicationConfiguration:
				this.runtime.meetupPublicationConfiguration(),
		});
	}
}
