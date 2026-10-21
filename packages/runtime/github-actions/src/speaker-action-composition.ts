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
	speakerSyncAction(): SpeakerSyncAction {
		return new SpeakerSyncAction({
			conferenceHallInput: new GithubActionsComposition().conferenceHallInput(),
			automationConfigFactory:
				new JourneyPolicyComposition().automationConfigFactory(),
			speakerSyncFailureReport:
				new GithubActionsComposition().speakerSyncFailureReport(),
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
