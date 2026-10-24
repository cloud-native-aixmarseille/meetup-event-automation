import { ReconcileEventPublications } from "@meetup-automation/journey";
import { GithubActionsComposition } from "./dependency-composition.js";
import { EventPublicationAction } from "./event-publication-action.js";
import { EventPublicationJourneyComposition } from "./event-publication-journey-composition.js";
import { PublicationCredentialsInput } from "./publication-credentials-input.js";
export class EventPublicationActionComposition {
	private readonly runtime = new GithubActionsComposition();

	action(): EventPublicationAction {
		return new EventPublicationAction({
			credentials: new PublicationCredentialsInput(
				this.runtime.runtimeInput(),
				this.runtime.aiInput(),
			),
			publicationUrlInput: this.runtime.publicationUrlInput(),
			createJourney: (input) =>
				EventPublicationJourneyComposition.create(input).get(
					ReconcileEventPublications,
				),
			runtimeInput: this.runtime.runtimeInput(),
			conferenceHallInput: this.runtime.conferenceHallInput(),
			eventPublicationConfiguration:
				this.runtime.eventPublicationConfiguration(),
		});
	}
}
