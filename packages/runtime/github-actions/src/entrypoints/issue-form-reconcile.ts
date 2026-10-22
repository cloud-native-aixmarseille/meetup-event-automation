import { GithubActionsComposition } from "../dependency-composition.js";
import { IssueFormActionComposition } from "../issue-form-action-composition.js";

const runner = new GithubActionsComposition().actionRunner();
const action = new IssueFormActionComposition().action();
await runner.run("action.issue-form.reconcile", action.run.bind(action), false);
