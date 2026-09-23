import { ActionRunner } from "../action-runner.js";
import { ReferentialActions } from "../referential-actions.js";

await ActionRunner.run(
	"action.referential.validate",
	ReferentialActions.runReferentialValidateAction,
);
