import { ActionRunner } from "../action-runner.js";
import { MeetupPublicationAction } from "../meetup-publication-action.js";

await ActionRunner.run(
	"action.publication.reconcile-meetup",
	MeetupPublicationAction.run,
	false,
);
