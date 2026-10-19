import { GithubActionsComposition } from "../dependency-composition.js";
import { DraftActionComposition } from "../draft-action-composition.js";

const runner = new GithubActionsComposition().actionRunner();
const action = new DraftActionComposition().linkedinPost();
await runner.run(
	"action.communication.generate-linkedin-post",
	action.run.bind(action),
	true,
);
