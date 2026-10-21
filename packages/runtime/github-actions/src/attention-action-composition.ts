import { ManageMeetupAttention } from "@meetup-automation/journey";
import { AttentionAction } from "./attention-action.js";
import { AttentionComposition } from "./attention-composition.js";
import { GithubActionsComposition } from "./dependency-composition.js";
import { OrganizerFeedback } from "./organizer-feedback.js";
export class AttentionActionComposition {
	attentionAction(): AttentionAction {
		return new AttentionAction({
			publicationUrlInput: new GithubActionsComposition().publicationUrlInput(),
			createAttention: (input) => {
				const container = AttentionComposition.create(input);
				return {
					feedback: container.get(OrganizerFeedback),
					attention: container.get(ManageMeetupAttention),
				};
			},
			runtimeInput: new GithubActionsComposition().runtimeInput(),
			attentionStages: new GithubActionsComposition().attentionStages(),
		});
	}
}
