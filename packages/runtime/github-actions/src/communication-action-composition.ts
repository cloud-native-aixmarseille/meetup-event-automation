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
	communicationAction(): CommunicationAction {
		return new CommunicationAction({
			publicationUrlInput: new GithubActionsComposition().publicationUrlInput(),
			runtimeInput: new GithubActionsComposition().runtimeInput(),
			communicationRuntime: this.communicationRuntime(),
			conferenceHallInput: new GithubActionsComposition().conferenceHallInput(),
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
			communicationInput: new GithubActionsComposition().communicationInput(),
			automationConfigFactory:
				new JourneyPolicyComposition().automationConfigFactory(),
			localeResolver: new LocalizationComposition().localeResolver(),
		});
	}
}
