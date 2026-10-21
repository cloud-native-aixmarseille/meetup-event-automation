import {
	SynchronizeMeetupIssueForm,
	ValidateMeetupReferentials,
} from "@meetup-automation/journey";
import { EventComposition } from "./composition.js";
import { GithubActionsComposition } from "./dependency-composition.js";
import { ReferentialActions } from "./referential-actions.js";
export class ReferentialActionComposition {
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
			referentialActionReport:
				new GithubActionsComposition().referentialActionReport(),
			runtimeInput: new GithubActionsComposition().runtimeInput(),
			createActionMessages: (...args) =>
				new GithubActionsComposition().actionMessages(...args),
		});
	}
}
