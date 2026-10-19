import { GithubActionsComposition } from "../dependency-composition.js";
import { DraftActionComposition } from "../draft-action-composition.js";

const runner = new GithubActionsComposition().actionRunner();
const action = new DraftActionComposition().review();
await runner.run(
	"action.organizer.review-drafts",
	action.run.bind(action),
	true,
);
