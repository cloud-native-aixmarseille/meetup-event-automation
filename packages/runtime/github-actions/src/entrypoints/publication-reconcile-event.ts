import { GithubActionsComposition } from "../dependency-composition.js";
import { EventPublicationActionComposition } from "../event-publication-action-composition.js";

const runner = new GithubActionsComposition().actionRunner();
const action = new EventPublicationActionComposition().action();

await runner.run(
	"action.publication.reconcile-event",
	action.run.bind(action),
	false,
);
