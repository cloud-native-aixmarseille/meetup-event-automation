import { ManageMeetupPublication } from "@meetup-automation/journey";
import { GithubActionsComposition } from "./dependency-composition.js";
import { MeetupPublicationAction } from "./meetup-publication-action.js";
import { MeetupPublicationComposition } from "./meetup-publication-composition.js";
export class MeetupActionComposition {
	meetupPublicationAction(): MeetupPublicationAction {
		return new MeetupPublicationAction({
			publicationUrlInput: new GithubActionsComposition().publicationUrlInput(),
			createJourney: (input) =>
				MeetupPublicationComposition.create(input).get(ManageMeetupPublication),
			runtimeInput: new GithubActionsComposition().runtimeInput(),
			conferenceHallInput: new GithubActionsComposition().conferenceHallInput(),
			meetupPublicationConfiguration:
				new GithubActionsComposition().meetupPublicationConfiguration(),
		});
	}
}
