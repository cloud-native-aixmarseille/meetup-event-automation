import { GithubActionsComposition } from "../dependency-composition.js";
import { DraftActionComposition } from "../draft-action-composition.js";

const runner = new GithubActionsComposition().actionRunner();
const action = new DraftActionComposition().coverArtwork();
await runner.run("action.assets.generate-cover", action.run.bind(action), true);
