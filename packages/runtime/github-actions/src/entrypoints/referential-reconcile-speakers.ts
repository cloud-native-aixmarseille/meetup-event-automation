import { GithubActionsComposition } from "../dependency-composition.js";
import { SpeakerActionComposition } from "../speaker-action-composition.js";

const runner = new GithubActionsComposition().actionRunner();
const action = new SpeakerActionComposition().speakerReconciliationAction();

await runner.run(
	"action.referential.reconcile-speakers",
	action.run.bind(action),
	false,
);
