import { GithubActionsComposition } from "./dependency-composition.js";
import { SocialRecoveryAction } from "./social-recovery-action.js";
import { SocialRecoveryComposition } from "./social-recovery-composition.js";

export class SocialRecoveryActionComposition {
	action(): SocialRecoveryAction {
		const composition = new SocialRecoveryComposition();
		return new SocialRecoveryAction({
			runtime: new GithubActionsComposition().runtimeInput(),
			compose: composition.create.bind(composition),
		});
	}
}
