import { GithubActionsComposition } from "../dependency-composition.js";
import { SocialPublicationActionComposition } from "../social-publication-action-composition.js";

const runner = new GithubActionsComposition().actionRunner();
const action = new SocialPublicationActionComposition().action();
await runner.run(
	"action.communication.reconcile-social",
	action.run.bind(action),
	true,
);
