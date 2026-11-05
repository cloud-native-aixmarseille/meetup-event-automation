import { GithubActionsComposition } from "../dependency-composition.js";
import { DraftActionComposition } from "../draft-action-composition.js";

const runner = new GithubActionsComposition().actionRunner();
const action = new DraftActionComposition().reminders();
await runner.run(
	"action.communication.prepare-reminders",
	action.run.bind(action),
	true,
);
