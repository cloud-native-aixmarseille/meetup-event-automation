import { describe, expect, it, vi } from "vitest";
import {
	communityRequest,
	createStoredApproval,
	detailedRequest,
	publicationRequest,
	request,
} from "../testing/approval.fixtures.js";
import { ApprovalPresenter } from "./approval-presenter.js";
import { GithubOrganizerApprovalComposition } from "./dependency-composition.js";

describe("approval rendering composition", () => {
	it.each([request, detailedRequest, publicationRequest, communityRequest])(
		"uses the injected renderer for $kind and encodes metadata once",
		(input) => {
			// Arrange
			const record = createStoredApproval(input);
			const codec = { marker: vi.fn().mockReturnValue("metadata") };
			const renderers = {
				"social-publication": { issue: vi.fn().mockReturnValue("social") },
				"email-introduction": {
					issue: vi.fn().mockReturnValue("introduction"),
				},
				"email-thanks": { issue: vi.fn().mockReturnValue("thanks") },
				"content-review": { issue: vi.fn().mockReturnValue("content") },
				"community-publication": {
					issue: vi.fn().mockReturnValue("community"),
				},
				"meetup-publication": { issue: vi.fn().mockReturnValue("publication") },
			};
			const presenter = new ApprovalPresenter(codec, renderers);
			const decision = { status: "pending" as const };
			const expected = {
				"social-publication": "social",
				"email-introduction": "introduction",
				"email-thanks": "thanks",
				"meetup-publication": "publication",
				"community-publication": "community",
				"content-review": "content",
			};

			// Act
			const result = presenter.issue(record, decision);

			// Assert
			expect(result).toBe(`metadata\n\n${expected[record.kind]}`);
			expect(codec.marker).toHaveBeenCalledExactlyOnceWith(record);
			expect(renderers[record.kind].issue).toHaveBeenCalledExactlyOnceWith(
				record,
				decision,
			);
			for (const [kind, renderer] of Object.entries(renderers)) {
				if (kind !== record.kind) expect(renderer.issue).not.toHaveBeenCalled();
			}
		},
	);
	it.each(["-->", "--!>"])(
		"keeps %s in metadata escaped while preserving reviewed facts",
		(terminator) => {
			// Arrange
			const record = createStoredApproval({
				...detailedRequest,
				details: {
					...detailedRequest.details,
					emails: detailedRequest.details.emails.map((email) => ({
						...email,
						recipientName: `${terminator}<img> @person`,
					})),
				},
			});
			const composition = new GithubOrganizerApprovalComposition();
			const presenter = composition.approvalPresenter(
				composition.approvalMessages("en"),
			);
			const codec = composition.approvalCommentCodec();

			// Act
			const body = presenter.issue(record, { status: "pending" });
			const restored = codec.read(body);

			// Assert
			expect(body.match(/--!?>/g)).toHaveLength(1);
			expect(body).not.toContain("<img>");
			expect(restored.details).toEqual(record.details);
		},
	);
});
