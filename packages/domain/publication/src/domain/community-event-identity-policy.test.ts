import { describe, expect, it } from "vitest";
import { CommunityEventIdentityPolicy } from "./community-event-identity-policy.js";
import { CommunityGroupUrl } from "./community-group-url.js";

const prefix = "https://community.example.test/cncf/group/example/event/";
const id = "10000000-0000-4000-8000-000000000001";
const identity = {
	id,
	reviewUrl: `https://community.example.test/dashboard/group/events/${id}/update`,
};
function policy() {
	const group = CommunityGroupUrl.parse(prefix);
	if (!group) throw new Error("Invalid fixture");
	return new CommunityEventIdentityPolicy(group);
}
describe("community event identity", () => {
	it("accepts a saved editor identity before its public slug is available", () => {
		// Arrange
		const subject = policy();
		// Act
		const valid = subject.valid(identity);
		// Assert
		expect(valid).toBe(true);
	});
	it.each([
		{ id: "other" },
		{
			reviewUrl: identity.reviewUrl.replace(
				id,
				"20000000-0000-4000-8000-000000000002",
			),
		},
		{ reviewUrl: `${identity.reviewUrl}?next=other` },
		{
			reviewUrl: identity.reviewUrl.replace(
				"community.example.test",
				"other.example.test",
			),
		},
		{ publicUrl: `${prefix.replace("/example/", "/other/")}event` },
		{ publicUrl: `${prefix}event/` },
		{ publicUrl: `${prefix}event?x=1` },
		{ publicUrl: `${prefix}event#fragment` },
	])("rejects out-of-scope or mismatched identities: %j", (changes) => {
		// Arrange
		const subject = policy();
		// Act
		const valid = subject.valid({ ...identity, ...changes });
		// Assert
		expect(valid).toBe(false);
	});
});
