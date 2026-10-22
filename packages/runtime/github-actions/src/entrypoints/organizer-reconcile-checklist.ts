import { ChecklistActionComposition } from "../checklist-action-composition.js";
import { GithubActionsComposition } from "../dependency-composition.js";

const runner = new GithubActionsComposition().actionRunner();
const action = new ChecklistActionComposition().action();
await runner.run(
	"action.organizer.reconcile-checklist",
	action.run.bind(action),
	false,
);
