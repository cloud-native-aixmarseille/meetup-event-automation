import { describe, expect, it } from "vitest";
import { PublicationCommentCodec } from "./publication-comment-codec.js";

describe("PublicationCommentCodec", () => {
	it.each([
		{ groupUrl: "https://www.meetup.com/example/", fingerprint: "bad" },
		{ groupUrl: "https://untrusted.example/", fingerprint: "a".repeat(64) },
		{
			groupUrl: "https://www.meetup.com/example/",
			fingerprint: "a".repeat(64),
			photoId: "0",
		},
		{
			groupUrl: "https://www.meetup.com/example/",
			fingerprint: "a".repeat(64),
			photoId: 123,
		},
	])("rejects malformed cover identity metadata: %j", (cover) => {
		// Arrange
		const codec = new PublicationCommentCodec();
		const body = `${PublicationCommentCodec.marker}${JSON.stringify({ state: "pending", cover })}\n-->`;
		// Act
		const decode = () => codec.decode(body);
		// Assert
		expect(decode).toThrow("Invalid Meetup cover journal");
	});
	it.each(["-->", "--!>"])(
		"round-trips metadata without allowing %s to terminate the hidden comment",
		(terminator) => {
			// Arrange
			const record = { url: `https://example.test/${terminator}<script>` };

			// Act
			const encoded = new PublicationCommentCodec().encode(record);
			const decoded = new PublicationCommentCodec().decode(encoded);

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
		const decode = () => new PublicationCommentCodec().decode(body);

		// Assert
		expect(decode).toThrow("Publication journal is corrupted");
	});
});
