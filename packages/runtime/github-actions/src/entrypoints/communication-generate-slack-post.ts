import { GithubActionsComposition } from "../dependency-composition.js";
import { DraftActionComposition } from "../draft-action-composition.js";

const runner = new GithubActionsComposition().actionRunner();
const action = new DraftActionComposition().slackPost();
await runner.run(
	"action.communication.generate-slack-post",
	action.run.bind(action),
	true,
);
