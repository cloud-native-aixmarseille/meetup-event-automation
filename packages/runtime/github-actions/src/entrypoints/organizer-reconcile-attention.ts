import { AttentionActionComposition } from "../attention-action-composition.js";
import { GithubActionsComposition } from "../dependency-composition.js";

const runner = new GithubActionsComposition().actionRunner();
const action = new AttentionActionComposition().attentionAction();

await runner.run(
	"action.organizer.reconcile-attention",
	action.run.bind(action),
	false,
);
