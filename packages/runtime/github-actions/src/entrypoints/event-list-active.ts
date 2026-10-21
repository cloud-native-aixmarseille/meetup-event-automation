import { GithubActionsComposition } from "../dependency-composition.js";
import { EventActionComposition } from "../event-action-composition.js";

const runner = new GithubActionsComposition().actionRunner();
const action = new EventActionComposition().eventActions();

await runner.run(
	"action.event.list-active",
	action.runEventListActiveAction.bind(action),
	false,
);
