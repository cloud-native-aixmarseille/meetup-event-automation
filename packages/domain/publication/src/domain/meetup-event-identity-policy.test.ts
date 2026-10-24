import { describe, expect, it } from "vitest";
import { MeetupEventIdentityPolicy } from "./meetup-event-identity-policy.js";
import { MeetupGroupUrl } from "./meetup-group-url.js";

const url = "https://www.meetup.com/example/events/123/";
function policy() {
	const group = MeetupGroupUrl.parse("https://www.meetup.com/example/");
	if (!group) throw new Error("Invalid fixture group");
	return new MeetupEventIdentityPolicy(group);
}
describe("Meetup publication identity", () => {
	it("normalizes the numeric identity and canonical URL", () => {
		// Arrange
		const subject = policy();
		// Act
		const identity = subject.fromUrl(url.slice(0, -1));
		// Assert
		expect(identity).toEqual({ id: "123", reviewUrl: url, publicUrl: url });
	});
	it.each([
		{ id: "456" },
		{ publicUrl: undefined },
		{ reviewUrl: url.replace("example", "other") },
		{ publicUrl: url.replace("123", "456") },
		{ reviewUrl: `${url}?next=other` },
	])("rejects mismatched or out-of-scope identities: %j", (changes) => {
		// Arrange
		const subject = policy();
		// Act
		const valid = subject.valid({
			id: "123",
			reviewUrl: url,
			publicUrl: url,
			...changes,
		});
		// Assert
		expect(valid).toBe(false);
	});
});
