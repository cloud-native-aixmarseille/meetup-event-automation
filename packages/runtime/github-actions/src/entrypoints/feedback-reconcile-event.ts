import { GithubActionsComposition } from "../dependency-composition.js";
import { FeedbackActionComposition } from "../feedback-action-composition.js";

const runner = new GithubActionsComposition().actionRunner();
const action = new FeedbackActionComposition().feedbackAction();

await runner.run(
	"action.feedback.reconcile-event",
	action.run.bind(action),
	true,
);
