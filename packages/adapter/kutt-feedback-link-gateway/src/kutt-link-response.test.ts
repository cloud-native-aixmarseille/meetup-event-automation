import { describe, expect, it } from "vitest";
import { KuttLinkResponse } from "./kutt-link-response.js";

describe("KuttLinkResponse", () => {
	it.each([null, [], { id: "link-a", address: {}, target: true, link: 1 }])(
		"rejects malformed link payloads %#",
		(value) => {
			// Arrange
			const payload = value;

			// Act
			const parse = () => KuttLinkResponse.link(payload);

			// Assert
			expect(parse).toThrow("Invalid Kutt link response");
		},
	);

	it.each([null, [], { total: "1", data: [] }, { total: 1, data: [null] }])(
		"rejects malformed listing payloads %#",
		(value) => {
			// Arrange
			const payload = value;

			// Act
			const parse = () => KuttLinkResponse.page(payload);

			// Assert
			expect(parse).toThrow(/Invalid Kutt/);
		},
	);

	it("returns only the fields used to preserve an existing link", () => {
		// Arrange
		const link = {
			id: "link-a",
			address: "feedback",
			target: "https://example.test/event",
			link: "https://example.test/feedback",
		};

		// Act
		const parsed = KuttLinkResponse.page({
			total: 1,
			data: [{ ...link, secret: "private" }],
		});

		// Assert
		expect(parsed).toEqual({ total: 1, data: [link] });
	});
});
