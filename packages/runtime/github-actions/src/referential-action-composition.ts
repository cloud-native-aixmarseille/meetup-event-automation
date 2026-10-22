import { ValidateMeetupReferentials } from "@meetup-automation/journey";
import { EventComposition } from "./composition.js";
import { GithubActionsComposition } from "./dependency-composition.js";
import { ReferentialAction } from "./referential-action.js";
export class ReferentialActionComposition {
	private readonly runtime = new GithubActionsComposition();
	action(): ReferentialAction {
		return new ReferentialAction({
			validateReferentials: (locale) =>
				EventComposition.createReferentialContainer({ locale }).get(
					ValidateMeetupReferentials,
				),
			referentialActionReport: this.runtime.referentialActionReport(),
		});
	}
}
