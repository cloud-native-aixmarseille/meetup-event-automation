import { ReferentialDomainComposition } from "@meetup-automation/referential";
import { ConferenceHallProposalSource } from "./conference-hall-proposal-source.js";
import { ProposalExportParser } from "./proposal-export-parser.js";
/** Assembles this package's collaborators; no business decisions or I/O. */
export class ConferenceHallProposalSourceComposition {
	conferenceHallProposalSource(
		event: string,
		apiKey: string,
		request: typeof fetch = fetch,
		now: () => number = Date.now,
	): ConferenceHallProposalSource {
		return new ConferenceHallProposalSource(
			{
				sourceSpeakerEquality:
					new ReferentialDomainComposition().sourceSpeakerEquality(),
				proposalExportParser: this.proposalExportParser(),
			},
			event,
			apiKey,
			request,
			now,
		);
	}
	proposalExportParser(): ProposalExportParser {
		return new ProposalExportParser({
			sourceSpeakerEquality:
				new ReferentialDomainComposition().sourceSpeakerEquality(),
		});
	}
}
