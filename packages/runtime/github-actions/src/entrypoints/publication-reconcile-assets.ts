import { ActionRunner } from "../action-runner.js";
import { PublicationAction } from "../publication-action.js";

ActionRunner.run(PublicationAction.runPublicationReconcileAssetsAction);
