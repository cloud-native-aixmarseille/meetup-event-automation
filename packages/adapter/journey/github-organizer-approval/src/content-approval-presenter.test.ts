import { describe, expect, it } from "vitest";
import { createStoredApproval } from "../testing/approval.fixtures.js";
import { contentRequest, coverRequest } from "../testing/content.fixtures.js";
import { ContentApprovalPresenter } from "./content-approval-presenter.js";
import { GithubOrganizerApprovalComposition } from "./dependency-composition.js";

describe("content review presentation", () => {
	it.each(["en", "fr"])(
		"shows exact escaped text with independent controls in %s",
		(locale) => {
			// Arrange
			const record = createStoredApproval({
				...contentRequest,
				content: {
					...contentRequest.content,
					draft: { text: "<img src=x>\n@everyone", media: [] },
				},
			});
			if (record.kind !== "content-review") throw new Error("Expected content");
			const presenter = new ContentApprovalPresenter(
				new GithubOrganizerApprovalComposition().approvalMessages(locale),
			);
			// Act
			const body = presenter.issue(record, { status: "iteration-requested" });
			// Assert
			expect(body).toContain("<pre>&lt;img src=x&gt;\n@everyone</pre>");
			expect(body.match(/- \[x\]/g)).toHaveLength(1);
			expect(body.match(/- \[ \]/g)).toHaveLength(2);
		},
	);
	it("binds cover approval to one image rather than the whole batch", () => {
		// Arrange
		const record = createStoredApproval(coverRequest);
		if (record.kind !== "content-review") throw new Error("Expected content");
		const presenter = new ContentApprovalPresenter(
			new GithubOrganizerApprovalComposition().approvalMessages("en"),
		);
		// Act
		const body = presenter.issue(record, {
			status: "approved",
			selectedImage: "image-2",
		});
		// Assert
		expect(body).toContain("- [x] Approve image 2 as the cover");
		expect(body).toContain("- [ ] Approve image 1 as the cover");
		expect(body).toContain("1792×1024");
	});
});
