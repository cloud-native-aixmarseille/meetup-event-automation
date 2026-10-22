import { GithubActionsComposition } from "../dependency-composition.js";
import { ReferentialActionComposition } from "../referential-action-composition.js";

const runner = new GithubActionsComposition().actionRunner();
const action = new ReferentialActionComposition().action();
await runner.run("action.referential.validate", action.run.bind(action), false);
