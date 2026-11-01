import { LinkedInPostReference } from "@meetup-automation/communication";
import { describe, expect, it } from "vitest";
import {
	LINKEDIN_SHARING_MARKER,
	LinkedInSharingCodec,
} from "./linkedin-sharing-codec.js";
import { SocialJournalValueSchema } from "./social-journal-value-schema.js";

const record = {
	id: "urn:li:activity:12345",
	url: "https://www.linkedin.com/feed/update/urn:li:activity:12345/",
	status: "pending" as const,
	attempts: 1,
	reservedAt: "2099-06-01T10:00:00Z",
};
describe("LinkedIn sharing state codec", () => {
	it("round trips validated notification state", () => {
		// Arrange
		const codec = new LinkedInSharingCodec(
			new SocialJournalValueSchema(),
			new LinkedInPostReference(),
		);
		// Act
		const decoded = codec.read(codec.write(record));
		// Assert
		expect(decoded).toEqual(record);
	});
	it.each([
		{ id: "wrong" },
		{ url: "https://example.test" },
		{ status: "unknown" },
		{ status: "retry" },
		{ retryAt: "2099-06-02T00:00:00Z" },
		{ attempts: 0 },
		{ attempts: 11 },
		{ reservedAt: "unknown" },
		{ privateEmail: "private@example.test" },
	])("rejects malformed state %j", (patch) => {
		// Arrange
		const codec = new LinkedInSharingCodec(
			new SocialJournalValueSchema(),
			new LinkedInPostReference(),
		);
		const body = `${LINKEDIN_SHARING_MARKER}${JSON.stringify({ ...record, ...patch })} -->`;
		// Act
		const read = () => codec.read(body);
		// Assert
		expect(read).toThrow();
	});
});
