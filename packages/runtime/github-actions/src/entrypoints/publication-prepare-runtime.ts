import { GithubActionsComposition } from "../dependency-composition.js";
import { PublicationRuntimeActionComposition } from "../publication-runtime-action-composition.js";

const runner = new GithubActionsComposition().actionRunner();
const action = new PublicationRuntimeActionComposition().action();

await runner.run(
	"action.publication.prepare-runtime",
	action.run.bind(action),
	false,
);
