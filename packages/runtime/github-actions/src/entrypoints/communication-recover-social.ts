import { GithubActionsComposition } from "../dependency-composition.js";
import { SocialRecoveryActionComposition } from "../social-recovery-action-composition.js";

const runner = new GithubActionsComposition().actionRunner();
const action = new SocialRecoveryActionComposition().action();
await runner.run(
	"action.communication.recover-social",
	action.run.bind(action),
	false,
);
