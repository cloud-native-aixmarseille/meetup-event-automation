import { GithubActionsComposition } from "../dependency-composition.js";
import { SpeakerActionComposition } from "../speaker-action-composition.js";

const runner = new GithubActionsComposition().actionRunner();
const action = new SpeakerActionComposition().speakerSyncAction();

await runner.run(
	"action.referential.sync-speakers",
	action.run.bind(action),
	false,
);
