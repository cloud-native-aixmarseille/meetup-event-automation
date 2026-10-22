import { GithubActionsComposition } from "../dependency-composition.js";
import { SlidesPdfActionComposition } from "../slides-pdf-action-composition.js";

const runner = new GithubActionsComposition().actionRunner();
const action = new SlidesPdfActionComposition().action();
await runner.run(
	"action.assets.reconcile-slides-pdf",
	action.run.bind(action),
	true,
);
