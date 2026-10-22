import { ManageMeetupFeedback } from "@meetup-automation/journey";
import { GithubActionsComposition } from "./dependency-composition.js";
import { FeedbackAction } from "./feedback-action.js";
import { FeedbackComposition } from "./feedback-composition.js";
export class FeedbackActionComposition {
	private readonly runtime = new GithubActionsComposition();

	feedbackAction(): FeedbackAction {
		return new FeedbackAction({
			publicationUrlInput: this.runtime.publicationUrlInput(),
			createJourney: (input) =>
				FeedbackComposition.createFeedbackContainer(input).get(
					ManageMeetupFeedback,
				),
			runtimeInput: this.runtime.runtimeInput(),
			conferenceHallInput: this.runtime.conferenceHallInput(),
		});
	}
}
