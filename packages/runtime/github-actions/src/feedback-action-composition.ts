import { ManageMeetupFeedback } from "@meetup-automation/journey";
import { GithubActionsComposition } from "./dependency-composition.js";
import { FeedbackAction } from "./feedback-action.js";
import { FeedbackComposition } from "./feedback-composition.js";
export class FeedbackActionComposition {
	feedbackAction(): FeedbackAction {
		return new FeedbackAction({
			publicationUrlInput: new GithubActionsComposition().publicationUrlInput(),
			createJourney: (input) =>
				FeedbackComposition.createFeedbackContainer(input).get(
					ManageMeetupFeedback,
				),
			runtimeInput: new GithubActionsComposition().runtimeInput(),
			conferenceHallInput: new GithubActionsComposition().conferenceHallInput(),
		});
	}
}
