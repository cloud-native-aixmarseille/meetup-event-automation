import { ManageMeetupAssets } from "@meetup-automation/journey";
import { GithubActionsComposition } from "./dependency-composition.js";
import { PublicationAction } from "./publication-action.js";
import { PublicationComposition } from "./publication-composition.js";
export class PublicationActionComposition {
	private readonly runtime = new GithubActionsComposition();

	publicationAction(): PublicationAction {
		return new PublicationAction({
			publicationUrlInput: this.runtime.publicationUrlInput(),
			createJourney: (input) =>
				PublicationComposition.createPublicationContainer(input).get(
					ManageMeetupAssets,
				),
			runtimeInput: this.runtime.runtimeInput(),
			assetContentConfiguration: this.runtime.assetContentConfiguration(),
			conferenceHallInput: this.runtime.conferenceHallInput(),
			actionOutput: this.runtime.actionOutput(),
		});
	}
}
