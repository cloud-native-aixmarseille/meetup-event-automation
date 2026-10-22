import { GithubActionsComposition } from "../dependency-composition.js";
import { FeedbackLinkActionComposition } from "../feedback-link-action-composition.js";

const runner = new GithubActionsComposition().actionRunner();
const action = new FeedbackLinkActionComposition().action();
await runner.run(
	"action.feedback.reconcile-short-link",
	action.run.bind(action),
	true,
);
