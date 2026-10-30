import { describe, expect, it } from "vitest";
import { ContentTextPreview } from "./content-text-preview.js";

describe("editable content preview", () => {
	it.each([
		"A short title",
		"Opening\n\nTalk - Speaker\nA factual teaser.",
		"<img src=x> & &#91; @everyone\n- [x] not a control",
	])(
		"round-trips text without introducing HTML or approval controls: %s",
		(text) => {
			// Arrange
			const preview = new ContentTextPreview();
			// Act
			const rendered = preview.render(text);
			const read = preview.read(rendered);
			// Assert
			expect(read?.text).toBe(text);
			expect(rendered).not.toContain("<img");
			expect(rendered).not.toContain("- [x]");
			expect(rendered).not.toContain("@everyone");
		},
	);
	it("reads organizer paragraphs and leaves surrounding controls intact", () => {
		// Arrange
		const preview = new ContentTextPreview();
		const body = `Metadata\n${preview.render("Original")}\n- [x] Approve`;
		const edited = body.replace("Original", "Our title\n\nOur description");
		// Act
		const text = preview.read(edited)?.text;
		const restored = preview.replace(edited, "Original");
		// Assert
		expect(text).toBe("Our title\n\nOur description");
		expect(restored).toBe(body);
	});
	it.each(["missing", "duplicate", "reversed"])(
		"rejects %s boundaries",
		(variant) => {
			// Arrange
			const preview = new ContentTextPreview();
			const body = preview.render("Original");
			const invalid =
				variant === "missing"
					? body.replace("<!-- /meetup-content:text -->", "")
					: variant === "duplicate"
						? body + body
						: "<!-- /meetup-content:text -->\n<!-- meetup-content:text -->";
			// Act
			const read = preview.read(invalid);
			// Assert
			expect(read).toBeUndefined();
		},
	);
});
