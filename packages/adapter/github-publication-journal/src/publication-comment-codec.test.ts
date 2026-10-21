import { describe, expect, it } from "vitest";
import { PublicationCommentCodec } from "./publication-comment-codec.js";

describe("PublicationCommentCodec", () => {
	it.each(["-->", "--!>"])(
		"round-trips metadata without allowing %s to terminate the hidden comment",
		(terminator) => {
			// Arrange
			const record = { url: `https://example.test/${terminator}<script>` };

			// Act
			const encoded = PublicationCommentCodec.encode(record);
			const decoded = PublicationCommentCodec.decode(encoded);

			// Assert
			expect(decoded).toEqual(record);
			expect(encoded).not.toContain("<script>");
			expect(encoded.match(/--!?>/g)).toHaveLength(1);
		},
	);

	it("rejects a pending state that also claims an event identity", () => {
		// Arrange
		const body = `${PublicationCommentCodec.marker}{"state":"pending","url":"https://example.test/event"}\n-->`;

		// Act
		const decode = () => PublicationCommentCodec.decode(body);

		// Assert
		expect(decode).toThrow("Publication journal is corrupted");
	});
});
