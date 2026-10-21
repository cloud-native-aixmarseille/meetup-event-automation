import { ReferentialDomainComposition } from "@meetup-automation/referential";
import {
	ConferenceHallProposalSource,
	type ConferenceHallProposalSourceArguments,
} from "./conference-hall-proposal-source.js";
import { ProposalExportParser } from "./proposal-export-parser.js";
/** Assembles this package's collaborators; no business decisions or I/O. */
export class ConferenceHallProposalSourceComposition {
	conferenceHallProposalSource(
		...args: ConferenceHallProposalSourceArguments
	): ConferenceHallProposalSource {
		return new ConferenceHallProposalSource(
			{
				sourceSpeakerEquality:
					new ReferentialDomainComposition().sourceSpeakerEquality(),
				proposalExportParser: this.proposalExportParser(),
			},
			...args,
		);
	}
	proposalExportParser(): ProposalExportParser {
		return new ProposalExportParser({
			sourceSpeakerEquality:
				new ReferentialDomainComposition().sourceSpeakerEquality(),
		});
	}
}
