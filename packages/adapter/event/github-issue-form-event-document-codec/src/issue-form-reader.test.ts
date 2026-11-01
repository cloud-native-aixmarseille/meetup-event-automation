import type { EventDocument } from "@meetup-automation/event";
import { EventDomainComposition } from "@meetup-automation/event";
import { GithubIssueFormEventDocumentCodecComposition } from "./dependency-composition.js";
import { IssueFormReader } from "./issue-form-reader.js";

const document: EventDocument = {
	identity: { repository: "example/meetups", issueNumber: 42 },
	issueState: "open",
	issueTitle: "[Meetup]",
	labels: ["meetup"],
	body: `### Event Title

Platform Night

### Event Date

2026-11-05

### Hoster

Example Host

### Event Description

An evening about platforms.
`,
};

describe("IssueFormReader", () => {
	it.each(["17", "_No response_"])(
		"accepts a proposal form without an agenda for selection %s",
		(selection) => {
			// Arrange
			const source = {
				...document,
				body: `${document.body}\n### Conference Hall proposals\n\n${selection}\n`,
			};

			// Act
			const result = new IssueFormReader({
				issueFormSections:
					new GithubIssueFormEventDocumentCodecComposition().issueFormSections(),
				managedIssueMarkers:
					new GithubIssueFormEventDocumentCodecComposition().managedIssueMarkers(),
				issueFormEventMapper:
					new GithubIssueFormEventDocumentCodecComposition().issueFormEventMapper(),
				proposalSelectionCodec:
					new GithubIssueFormEventDocumentCodecComposition().proposalSelectionCodec(),
				issueFormChecklists:
					new GithubIssueFormEventDocumentCodecComposition().issueFormChecklists(),
				meetupEventOperations:
					new EventDomainComposition().meetupEventOperations(),
				eventReferenceMetadata:
					new GithubIssueFormEventDocumentCodecComposition().eventReferenceMetadata(),
				eventDiagnostics: new EventDomainComposition().eventDiagnostics(),
				participantLinks:
					new GithubIssueFormEventDocumentCodecComposition().participantLinks(),
			}).decode(source);

			// Assert
			expect(result.event.agenda).toEqual([]);
			expect(result.diagnostics).not.toContainEqual(
				expect.objectContaining({
					code: "event.document.heading.missing",
					field: "Agenda",
				}),
			);
		},
	);

	it("requires an agenda heading when no proposal section exists", () => {
		// Arrange
		const reader = new IssueFormReader({
			issueFormSections:
				new GithubIssueFormEventDocumentCodecComposition().issueFormSections(),
			managedIssueMarkers:
				new GithubIssueFormEventDocumentCodecComposition().managedIssueMarkers(),
			issueFormEventMapper:
				new GithubIssueFormEventDocumentCodecComposition().issueFormEventMapper(),
			proposalSelectionCodec:
				new GithubIssueFormEventDocumentCodecComposition().proposalSelectionCodec(),
			issueFormChecklists:
				new GithubIssueFormEventDocumentCodecComposition().issueFormChecklists(),
			meetupEventOperations:
				new EventDomainComposition().meetupEventOperations(),
			eventReferenceMetadata:
				new GithubIssueFormEventDocumentCodecComposition().eventReferenceMetadata(),
			eventDiagnostics: new EventDomainComposition().eventDiagnostics(),
			participantLinks:
				new GithubIssueFormEventDocumentCodecComposition().participantLinks(),
		});

		// Act
		const result = reader.decode(document);

		// Assert
		expect(result.diagnostics).toContainEqual(
			expect.objectContaining({
				code: "event.document.heading.missing",
				field: "Agenda",
				severity: "error",
			}),
		);
	});

	it.each(["Agenda", "Conference Hall proposals"])(
		"still rejects duplicate %s sections in a proposal form",
		(heading) => {
			// Arrange
			const source = {
				...document,
				body: `${document.body}\n### Conference Hall proposals\n\n17\n\n### Agenda\n\n_No response_\n\n### ${heading}\n\n_No response_\n`,
			};

			// Act
			const result = new IssueFormReader({
				issueFormSections:
					new GithubIssueFormEventDocumentCodecComposition().issueFormSections(),
				managedIssueMarkers:
					new GithubIssueFormEventDocumentCodecComposition().managedIssueMarkers(),
				issueFormEventMapper:
					new GithubIssueFormEventDocumentCodecComposition().issueFormEventMapper(),
				proposalSelectionCodec:
					new GithubIssueFormEventDocumentCodecComposition().proposalSelectionCodec(),
				issueFormChecklists:
					new GithubIssueFormEventDocumentCodecComposition().issueFormChecklists(),
				meetupEventOperations:
					new EventDomainComposition().meetupEventOperations(),
				eventReferenceMetadata:
					new GithubIssueFormEventDocumentCodecComposition().eventReferenceMetadata(),
				eventDiagnostics: new EventDomainComposition().eventDiagnostics(),
				participantLinks:
					new GithubIssueFormEventDocumentCodecComposition().participantLinks(),
			}).decode(source);

			// Assert
			expect(result.diagnostics).toContainEqual(
				expect.objectContaining({
					code: "event.document.heading.duplicate",
					field: heading,
					severity: "error",
				}),
			);
		},
	);
});
