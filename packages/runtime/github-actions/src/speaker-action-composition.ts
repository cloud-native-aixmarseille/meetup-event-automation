import { ConferenceHallProposalSourceComposition } from "@meetup-automation/conference-hall-proposal-source";
import { CsvReferentialRepositoryComposition } from "@meetup-automation/csv-referential-repository";
import {
	JourneyComposition,
	JourneyPolicyComposition,
} from "@meetup-automation/journey";
import { YamlIssueFormProjectionComposition } from "@meetup-automation/yaml-issue-form-projection";
import { GithubActionsComposition } from "./dependency-composition.js";
import { SpeakerSyncAction } from "./speaker-sync-action.js";
export class SpeakerActionComposition {
	private readonly runtime = new GithubActionsComposition();

	speakerSyncAction(): SpeakerSyncAction {
		return new SpeakerSyncAction({
			conferenceHallInput: this.runtime.conferenceHallInput(),
			automationConfigFactory:
				new JourneyPolicyComposition().automationConfigFactory(),
			speakerSyncFailureReport: this.runtime.speakerSyncFailureReport(),
			createSynchronizeSourceSpeakers: (...args) =>
				new JourneyComposition().synchronizeSourceSpeakers(...args),
			createConferenceHallProposalSource: (...args) =>
				new ConferenceHallProposalSourceComposition().conferenceHallProposalSource(
					...args,
				),
			createCsvSpeakerCatalogStore: (...args) =>
				new CsvReferentialRepositoryComposition().csvSpeakerCatalogStore(
					...args,
				),
			createYamlIssueFormProjection: (...args) =>
				new YamlIssueFormProjectionComposition().yamlIssueFormProjection(
					...args,
				),
		});
	}
}
