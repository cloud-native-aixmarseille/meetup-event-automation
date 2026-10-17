import { ActionRunner } from "../action-runner.js";
import { SpeakerSyncAction } from "../speaker-sync-action.js";

await ActionRunner.run(
	"action.referential.sync-speakers",
	SpeakerSyncAction.run,
	false,
);
