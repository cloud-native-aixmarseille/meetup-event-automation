import { ManageMeetupPublication } from "@meetup-automation/journey";
import { GithubActionsComposition } from "./dependency-composition.js";
import { MeetupPublicationAction } from "./meetup-publication-action.js";
import { MeetupPublicationComposition } from "./meetup-publication-composition.js";
export class MeetupActionComposition {
	private readonly runtime = new GithubActionsComposition();

	meetupPublicationAction(): MeetupPublicationAction {
		return new MeetupPublicationAction({
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
