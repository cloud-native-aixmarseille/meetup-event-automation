import { describe, expect, it } from "vitest";
import { SlackMessageReference } from "./slack-message-reference.js";

describe("Slack reference interpretation", () => {
	it.each([
		{ channel: "C999", ts: "123.456" },
		{ channel: "C123", ts: 123 },
		{ channel: "C123", ts: "<!channel>" },
		undefined,
	])(
		"rejects an acknowledgement outside the requested destination or format",
		(payload) => {
			// Arrange
			const destination = "C123";

			// Act
			const reference = new SlackMessageReference().read(payload, destination);

			// Assert
			expect(reference).toBeUndefined();
		},
	);
});
