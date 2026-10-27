import { GithubActionsComposition } from "./dependency-composition.js";
import { DraftSourceComposition } from "./draft-source-composition.js";
import { SocialCredentialsInput } from "./social-credentials-input.js";
import { SocialPublicationAction } from "./social-publication-action.js";
import { SocialPublicationComposition } from "./social-publication-composition.js";

export class SocialPublicationActionComposition {
	action(): SocialPublicationAction {
		const composition = new SocialPublicationComposition();
		return new SocialPublicationAction({
			input: new DraftSourceComposition().create(),
			credentials: new SocialCredentialsInput(
				new GithubActionsComposition().runtimeInput(),
			),
			compose: composition.create.bind(composition),
		});
	}
}
