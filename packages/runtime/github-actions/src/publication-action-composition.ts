import { ManageMeetupAssets } from "@meetup-automation/journey";
import { GithubActionsComposition } from "./dependency-composition.js";
import { PublicationAction } from "./publication-action.js";
import { PublicationComposition } from "./publication-composition.js";
export class PublicationActionComposition {
	publicationAction(): PublicationAction {
		return new PublicationAction({
			createJourney: (input) =>
				PublicationComposition.createPublicationContainer(input).get(
					ManageMeetupAssets,
				),
			runtimeInput: new GithubActionsComposition().runtimeInput(),
			assetContentConfiguration:
				new GithubActionsComposition().assetContentConfiguration(),
			conferenceHallInput: new GithubActionsComposition().conferenceHallInput(),
			actionOutput: new GithubActionsComposition().actionOutput(),
			createActionMessages: (...args) =>
				new GithubActionsComposition().actionMessages(...args),
		});
	}
}
