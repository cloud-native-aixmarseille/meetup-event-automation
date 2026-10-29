import { GithubActionsComposition } from "../dependency-composition.js";
import { RegistrationActionComposition } from "../registration-action-composition.js";

const runner = new GithubActionsComposition().actionRunner();
const action = new RegistrationActionComposition().action();
await runner.run(
	"action.publication.reconcile-registrations",
	action.run.bind(action),
	false,
);
