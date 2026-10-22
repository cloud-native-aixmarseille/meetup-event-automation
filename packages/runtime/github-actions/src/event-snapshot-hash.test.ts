import type { EventDocument } from "@meetup-automation/event";
import { describe, expect, it } from "vitest";
import { EventSnapshotHash } from "./event-snapshot-hash.js";

const source: EventDocument = {
	identity: { repository: "example/meetups", issueNumber: 12 },
	issueState: "open",
	issueTitle: "Meetup",
	labels: ["meetup", "event:scheduled"],
	body: "Organizer notes",
};
describe("prepared event revision", () => {
	it("canonicalizes label ordering without mutating the document", () => {
		// Arrange
		const revision = new EventSnapshotHash();
		const reordered = { ...source, labels: [...source.labels].reverse() };
		// Act
		const digest = revision.of(source);
		const equivalent = revision.of(reordered);
		// Assert
		expect(digest).toMatch(/^[a-f0-9]{64}$/);
		expect(digest).toBe(equivalent);
		expect(source.labels).toEqual(["meetup", "event:scheduled"]);
	});
	it.each([
		{ identity: { ...source.identity, repository: "example/other" } },
		{ identity: { ...source.identity, issueNumber: 13 } },
		{ issueState: "closed" as const },
		{ issueTitle: "Changed" },
		{ labels: ["meetup"] },
		{ body: "Human edit" },
	])(
		"invalidates prepared work when a material issue field changes: %j",
		(change) => {
			// Arrange
			const revision = new EventSnapshotHash();
			// Act
			const before = revision.of(source);
			const after = revision.of({ ...source, ...change });
			// Assert
			expect(after).not.toBe(before);
		},
	);
});
