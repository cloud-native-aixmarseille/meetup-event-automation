import { CommunicationActionComposition } from "../communication-action-composition.js";
import { GithubActionsComposition } from "../dependency-composition.js";

const runner = new GithubActionsComposition().actionRunner();
const action = new CommunicationActionComposition().communicationAction();

await runner.run(
	"action.communication.reconcile-email",
	action.runCommunicationReconcileAction.bind(action),
	true,
);
