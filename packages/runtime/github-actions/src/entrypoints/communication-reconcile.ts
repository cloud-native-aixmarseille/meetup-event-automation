import { ActionRunner } from "../action-runner.js";
import { CommunicationAction } from "../communication-action.js";

await ActionRunner.run(
	"action.communication.reconcile",
	CommunicationAction.runCommunicationReconcileAction,
);
