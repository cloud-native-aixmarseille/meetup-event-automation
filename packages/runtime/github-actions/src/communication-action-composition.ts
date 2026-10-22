import {
	JourneyPolicyComposition,
	ManageMeetupCommunications,
} from "@meetup-automation/journey";
import { LocalizationComposition } from "@meetup-automation/localization";
import { CommunicationRuntime } from "./communication.js";
import { CommunicationAction } from "./communication-action.js";
import { CommunicationComposition } from "./communication-composition.js";
import { GithubActionsComposition } from "./dependency-composition.js";
export class CommunicationActionComposition {
	private readonly runtime = new GithubActionsComposition();

	communicationAction(): CommunicationAction {
		return new CommunicationAction({
			publicationUrlInput: this.runtime.publicationUrlInput(),
			runtimeInput: this.runtime.runtimeInput(),
			communicationRuntime: this.communicationRuntime(),
			conferenceHallInput: this.runtime.conferenceHallInput(),
			communicationDiagnosticProjection:
				new JourneyPolicyComposition().communicationDiagnosticProjection(),
		});
	}
	communicationRuntime(): CommunicationRuntime {
		return new CommunicationRuntime({
			createJourney: (input) =>
				CommunicationComposition.createCommunicationContainer(input).get(
					ManageMeetupCommunications,
				),
			communicationInput: this.runtime.communicationInput(),
			automationConfigFactory:
				new JourneyPolicyComposition().automationConfigFactory(),
			localeResolver: new LocalizationComposition().localeResolver(),
		});
	}
}
