import { EventDomainComposition } from "@meetup-automation/event";
import { EventReferenceMetadata } from "./event-reference-metadata.js";
import {
	GitHubIssueFormEventDocumentCodec,
	type GitHubIssueFormEventDocumentCodecArguments,
} from "./github-issue-form-event-document-codec.js";
import { IssueFormChecklists } from "./issue-form-checklists.js";
import { IssueFormEventMapper } from "./issue-form-event-mapper.js";
import { IssueFormFields } from "./issue-form-fields.js";
import {
	IssueFormReader,
	type IssueFormReaderArguments,
} from "./issue-form-reader.js";
import { IssueFormSections } from "./issue-form-sections.js";
import {
	IssueFormWriter,
	type IssueFormWriterArguments,
} from "./issue-form-writer.js";
import { ManagedIssueMarkers } from "./managed-issue-markers.js";
import { MarkdownLines } from "./markdown-lines.js";
import { ParticipantLinks } from "./participant-links.js";
import { ParticipantReferenceParser } from "./participant-reference-parser.js";
import { ProposalSelectionCodec } from "./proposal-selection-codec.js";
import { ReferenceBindings } from "./reference-bindings.js";
import { ReferenceMetadataShape } from "./reference-metadata-shape.js";
/** Assembles this package's collaborators; no business decisions or I/O. */
export class GithubIssueFormEventDocumentCodecComposition {
	eventReferenceMetadata(): EventReferenceMetadata {
		return new EventReferenceMetadata({
			managedIssueMarkers: this.managedIssueMarkers(),
			eventDiagnostics: new EventDomainComposition().eventDiagnostics(),
			referenceMetadataShape: this.referenceMetadataShape(),
			referenceBindings: this.referenceBindings(),
		});
	}
	gitHubIssueFormEventDocumentCodec(
		...args: GitHubIssueFormEventDocumentCodecArguments
	): GitHubIssueFormEventDocumentCodec {
		return new GitHubIssueFormEventDocumentCodec(
			{
				createIssueFormReader: (...args) => this.issueFormReader(...args),
				createIssueFormWriter: (...args) => this.issueFormWriter(...args),
			},
			...args,
		);
	}
	issueFormChecklists(): IssueFormChecklists {
		return new IssueFormChecklists({
			eventDiagnostics: new EventDomainComposition().eventDiagnostics(),
			issueFormSections: this.issueFormSections(),
			markdownLines: this.markdownLines(),
		});
	}
	issueFormEventMapper(): IssueFormEventMapper {
		return new IssueFormEventMapper({
			eventDiagnostics: new EventDomainComposition().eventDiagnostics(),
			issueFormFields: this.issueFormFields(),
			eventOccurrenceParser:
				new EventDomainComposition().eventOccurrenceParser(),
		});
	}
	issueFormFields(): IssueFormFields {
		return new IssueFormFields({
			eventDiagnostics: new EventDomainComposition().eventDiagnostics(),
			participantReferenceParser: this.participantReferenceParser(),
		});
	}
	issueFormReader(...args: IssueFormReaderArguments): IssueFormReader {
		return new IssueFormReader(
			{
				issueFormSections: this.issueFormSections(),
				managedIssueMarkers: this.managedIssueMarkers(),
				issueFormEventMapper: this.issueFormEventMapper(),
				proposalSelectionCodec: this.proposalSelectionCodec(),
				issueFormChecklists: this.issueFormChecklists(),
				meetupEventOperations:
					new EventDomainComposition().meetupEventOperations(),
				eventReferenceMetadata: this.eventReferenceMetadata(),
				eventDiagnostics: new EventDomainComposition().eventDiagnostics(),
				participantLinks: this.participantLinks(),
			},
			...args,
		);
	}
	issueFormSections(): IssueFormSections {
		return new IssueFormSections({
			markdownLines: this.markdownLines(),
			eventDiagnostics: new EventDomainComposition().eventDiagnostics(),
		});
	}
	issueFormWriter(...args: IssueFormWriterArguments): IssueFormWriter {
		return new IssueFormWriter(
			{
				proposalSelectionCodec: this.proposalSelectionCodec(),
				managedIssueMarkers: this.managedIssueMarkers(),
				eventReferenceMetadata: this.eventReferenceMetadata(),
				participantLinks: this.participantLinks(),
				issueFormSections: this.issueFormSections(),
				issueFormChecklists: this.issueFormChecklists(),
			},
			...args,
		);
	}
	managedIssueMarkers(): ManagedIssueMarkers {
		return new ManagedIssueMarkers({
			markdownLines: this.markdownLines(),
			eventDiagnostics: new EventDomainComposition().eventDiagnostics(),
		});
	}
	markdownLines(): MarkdownLines {
		return new MarkdownLines();
	}
	participantLinks(): ParticipantLinks {
		return new ParticipantLinks({
			referenceBindings: this.referenceBindings(),
			proposalSelectionCodec: this.proposalSelectionCodec(),
		});
	}
	participantReferenceParser(): ParticipantReferenceParser {
		return new ParticipantReferenceParser();
	}
	proposalSelectionCodec(): ProposalSelectionCodec {
		return new ProposalSelectionCodec({
			issueFormSections: this.issueFormSections(),
			managedIssueMarkers: this.managedIssueMarkers(),
		});
	}
	referenceBindings(): ReferenceBindings {
		return new ReferenceBindings();
	}
	referenceMetadataShape(): ReferenceMetadataShape {
		return new ReferenceMetadataShape({
			referenceBindings: this.referenceBindings(),
		});
	}
}
