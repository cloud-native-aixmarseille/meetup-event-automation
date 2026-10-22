import { describe, expect, it, vi } from "vitest";
import { OpenFeedbackClient } from "./openfeedback-client.js";

describe("OpenFeedback HTTP boundary", () => {
	it("authenticates GET requests without a body and prohibits redirects", async () => {
		// Arrange
		const fetcher = vi
			.fn<typeof fetch>()
			.mockResolvedValue(Response.json({ id: "event-1" }));
		const client = new OpenFeedbackClient("oforg_synthetic", fetcher);

		// Act
		await client.request("/events/event-1/talks", "GET");

		// Assert
		expect(fetcher).toHaveBeenCalledWith(
			"https://api.openfeedback.io/events/event-1/talks",
			expect.objectContaining({
				method: "GET",
				redirect: "error",
				headers: {
					"x-api-key": "oforg_synthetic",
					"Content-Type": "application/json",
				},
			}),
		);
		expect(fetcher.mock.calls[0][1]).not.toHaveProperty("body");
	});
});
