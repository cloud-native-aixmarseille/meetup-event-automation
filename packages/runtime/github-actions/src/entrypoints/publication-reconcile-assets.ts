import { GithubActionsComposition } from "../dependency-composition.js";
import { PublicationActionComposition } from "../publication-action-composition.js";

const runner = new GithubActionsComposition().actionRunner();
const action = new PublicationActionComposition().publicationAction();

await runner.run(
	"action.publication.reconcile-assets",
	action.runPublicationReconcileAssetsAction.bind(action),
	true,
);
