import {
	SynchronizeMeetupIssueForm,
	ValidateMeetupReferentials,
} from "@meetup-automation/journey";
import { EventComposition } from "./composition.js";
import { GithubActionsComposition } from "./dependency-composition.js";
import { ReferentialActions } from "./referential-actions.js";
export class ReferentialActionComposition {
	private readonly runtime = new GithubActionsComposition();

	referentialActions(): ReferentialActions {
		return new ReferentialActions({
			validateReferentials: (locale) =>
				EventComposition.createReferentialContainer({ locale }).get(
					ValidateMeetupReferentials,
				),
			synchronizeIssueForm: (locale) =>
				EventComposition.createReferentialContainer({ locale }).get(
					SynchronizeMeetupIssueForm,
				),
			referentialActionReport: this.runtime.referentialActionReport(),
			runtimeInput: this.runtime.runtimeInput(),
		});
	}
}
