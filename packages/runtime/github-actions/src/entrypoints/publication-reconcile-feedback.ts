import { GithubActionsComposition } from "../dependency-composition.js";
import { FeedbackActionComposition } from "../feedback-action-composition.js";

const runner = new GithubActionsComposition().actionRunner();
const action = new FeedbackActionComposition().feedbackAction();

await runner.run(
	"action.publication.reconcile-feedback",
	action.run.bind(action),
	true,
);
