import { GithubActionsComposition } from "../dependency-composition.js";
import { ReferentialActionComposition } from "../referential-action-composition.js";

const runner = new GithubActionsComposition().actionRunner();
const action = new ReferentialActionComposition().referentialActions();

await runner.run(
	"action.referential.validate",
	action.runReferentialValidateAction.bind(action),
	false,
);
