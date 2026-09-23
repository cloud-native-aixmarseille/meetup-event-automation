import { ActionRunner } from "../action-runner.js";
import { PublicationAction } from "../publication-action.js";

await ActionRunner.run(
	"action.publication.reconcile-assets",
	PublicationAction.runPublicationReconcileAssetsAction,
);
