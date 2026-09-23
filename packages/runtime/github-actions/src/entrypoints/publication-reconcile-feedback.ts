import { ActionRunner } from "../action-runner.js";
import { FeedbackAction } from "../feedback-action.js";

await ActionRunner.run(FeedbackAction.run);
