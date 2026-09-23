import { ActionRunner } from "../action-runner.js";
import { EventActions } from "../event-actions.js";

await ActionRunner.run(
	"action.event.reconcile",
	EventActions.runEventReconcileAction,
);
