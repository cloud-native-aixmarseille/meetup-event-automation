import { ReconcileMeetupIssueForm } from "@meetup-automation/journey";
import { EventComposition } from "./composition.js";
import { GithubActionsComposition } from "./dependency-composition.js";
import { IssueFormAction } from "./issue-form-action.js";
export class IssueFormActionComposition {
	private readonly runtime = new GithubActionsComposition();
	action(): IssueFormAction {
		return new IssueFormAction({
			reconcileIssueForm: (locale) =>
				EventComposition.createReferentialContainer({ locale }).get(
					ReconcileMeetupIssueForm,
				),
			referentialActionReport: this.runtime.referentialActionReport(),
			runtimeInput: this.runtime.runtimeInput(),
		});
	}
}
