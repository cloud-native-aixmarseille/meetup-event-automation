import { GithubActionsComposition } from "../dependency-composition.js";
import { MeetupActionComposition } from "../meetup-action-composition.js";

const runner = new GithubActionsComposition().actionRunner();
const action = new MeetupActionComposition().meetupPublicationAction();

await runner.run(
	"action.publication.reconcile-meetup",
	action.run.bind(action),
	false,
);
