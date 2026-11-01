import { describe, expect, it } from "vitest";
import type { LinkedInShareRecord } from "./linkedin-sharing-ports.js";
import { LinkedInSharingState } from "./linkedin-sharing-state.js";

const pending: LinkedInShareRecord = {
	id: "urn:li:activity:12345",
	url: "https://www.linkedin.com/feed/update/urn:li:activity:12345/",
	status: "pending",
	attempts: 1,
	reservedAt: "2099-06-01T10:00:00Z",
};
describe("LinkedIn sharing state transitions", () => {
	it("requires a reservation before recording delivery", () => {
		// Arrange
		const state = new LinkedInSharingState();
		// Act
		const save = () =>
			state.validate(undefined, { ...pending, status: "sent" });
		// Assert
		expect(save).toThrow("reserve before sending");
	});
	it.each(["pending", "sent"] as const)(
		"prevents replay of %s notifications",
		(status) => {
			// Arrange
			const state = new LinkedInSharingState();
			const previous = { ...pending, status };
			// Act
			const retry = () => state.validate(previous, { ...pending, attempts: 2 });
			// Assert
			expect(retry).toThrow();
		},
	);
	it("permits another reservation only after confirmed non-delivery", () => {
		// Arrange
		const state = new LinkedInSharingState();
		const previous = {
			...pending,
			status: "retry" as const,
			retryAt: "2099-06-01T11:00:00Z",
		};
		// Act
		const retry = () => state.validate(previous, { ...pending, attempts: 2 });
		// Assert
		expect(retry).not.toThrow();
	});
});
