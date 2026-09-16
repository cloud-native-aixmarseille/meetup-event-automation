import { ActionRunner } from "../action-runner.js";
import { CommunicationAction } from "../communication-action.js";

ActionRunner.run(CommunicationAction.runCommunicationReconcileAction);
