import { ReconcileMeetupDocuments } from "@meetup-automation/journey";
import { GithubActionsComposition } from "./dependency-composition.js";
import { DocumentAction } from "./document-action.js";
import { DocumentComposition } from "./document-composition.js";
export class DocumentActionComposition {
	private readonly runtime = new GithubActionsComposition();

	documentAction(): DocumentAction {
		return new DocumentAction({
			publicationUrlInput: this.runtime.publicationUrlInput(),
			createJourney: (input) =>
				DocumentComposition.createDocumentContainer(input).get(
					ReconcileMeetupDocuments,
				),
			runtimeInput: this.runtime.runtimeInput(),
			assetContentConfiguration: this.runtime.assetContentConfiguration(),
			conferenceHallInput: this.runtime.conferenceHallInput(),
			actionOutput: this.runtime.actionOutput(),
		});
	}
}
