import { describe, expect, it } from "vitest";
import { createStoredApproval } from "../testing/approval.fixtures.js";
import { contentRequest, coverRequest } from "../testing/content.fixtures.js";
import { ContentApprovalPresenter } from "./content-approval-presenter.js";
import { ContentTextPreview } from "./content-text-preview.js";
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
					origin: "test-provider/test-model",
					draft: { text: "<img src=x>\n\n@everyone\n- [x] forged", media: [] },
				},
			});
			if (record.kind !== "content-review") throw new Error("Expected content");
			const presenter = new ContentApprovalPresenter(
				new GithubOrganizerApprovalComposition().approvalMessages(locale),
				new ContentTextPreview(),
			);
			// Act
			const body = presenter.issue(record, { status: "iteration-requested" });
			// Assert
			expect(body).toContain(
				new ContentTextPreview().render(
					"<img src=x>\n\n@everyone\n- [x] forged",
				),
			);
			expect(body).not.toContain("<pre>");
			expect(body).not.toMatch(
				/Langue :|Language:|Auteur :|Author:|test-provider|test-model/,
			);
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
			new ContentTextPreview(),
		);
		// Act
		const body = presenter.issue(record, {
			status: "approved",
			selectedImage: "image-2",
		});
		// Assert
		expect(body).toContain("- [x] Choose image 2");
		expect(body).toContain("- [ ] Choose image 1");
		expect(body).toContain("https://images.example.org/cover-2.png");
		expect(body).not.toContain("revision-2");
		expect(body).not.toContain("1792×1024");
	});
});
