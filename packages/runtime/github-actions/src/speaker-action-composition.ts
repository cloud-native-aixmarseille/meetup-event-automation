import { ConferenceHallProposalSourceComposition } from "@meetup-automation/conference-hall-proposal-source";
import { CsvReferentialRepositoryComposition } from "@meetup-automation/csv-referential-repository";
import { JourneyComposition } from "@meetup-automation/journey";
import { GithubActionsComposition } from "./dependency-composition.js";
import { SpeakerReconciliationAction } from "./speaker-reconciliation-action.js";
export class SpeakerActionComposition {
	private readonly runtime = new GithubActionsComposition();

	speakerReconciliationAction(): SpeakerReconciliationAction {
		return new SpeakerReconciliationAction({
			conferenceHallInput: this.runtime.conferenceHallInput(),
			speakerSyncFailureReport: this.runtime.speakerSyncFailureReport(),
			createReconcileSourceSpeakers: (...args) =>
				new JourneyComposition().reconcileSourceSpeakers(...args),
			createConferenceHallProposalSource: (...args) =>
				new ConferenceHallProposalSourceComposition().conferenceHallProposalSource(
					...args,
				),
			createCsvSpeakerCatalogStore: (...args) =>
				new CsvReferentialRepositoryComposition().csvSpeakerCatalogStore(
					...args,
				),
		});
	}
}
