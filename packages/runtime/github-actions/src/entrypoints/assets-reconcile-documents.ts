import { GithubActionsComposition } from "../dependency-composition.js";
import { DocumentActionComposition } from "../document-action-composition.js";

const runner = new GithubActionsComposition().actionRunner();
const action = new DocumentActionComposition().documentAction();

await runner.run(
	"action.assets.reconcile-documents",
	action.run.bind(action),
	true,
);
