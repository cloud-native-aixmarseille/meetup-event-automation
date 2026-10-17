import { ActionRunner } from "../action-runner.js";
import { AttentionAction } from "../attention-action.js";
await ActionRunner.run(
	"action.communication.reconcile-attention",
	AttentionAction.run,
	false,
);
