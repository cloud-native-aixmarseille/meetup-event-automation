import type { SocialDeliveryRecord } from "@meetup-automation/communication";
import { EventDocumentConcurrency } from "@meetup-automation/event";
import { describe, expect, it, vi } from "vitest";
import { createTestEvent } from "../../../../domain/event/testing/event.fixtures.js";
import { NotifyLinkedInSharing } from "./notify-linkedin-sharing.js";

const url = "https://www.linkedin.com/feed/update/urn:li:activity:12345/";
function fixture(records: readonly SocialDeliveryRecord[] = []) {
	const event = createTestEvent({ date: "2099-06-01", linkedInPosts: [url] });
	const source = {
		identity: event.identity,
		issueState: "open" as const,
		issueTitle: "Meetup",
		labels: ["meetup"],
		body: "source",
	};
	const find = vi.fn().mockResolvedValue(source);
	const execute = vi.fn().mockResolvedValue({ notificationFailed: false });
	const useCase = new NotifyLinkedInSharing(
		{ find, applyPatch: vi.fn(), listPage: vi.fn() },
		{ decode: () => ({ event, diagnostics: [] }) },
		new EventDocumentConcurrency(),
		{ list: async () => records },
		{ execute },
	);
	return { source, find, execute, useCase };
}
describe("notify organizers about published LinkedIn posts", () => {
	it("uses manually supplied posts and checks the issue again before sending", async () => {
		// Arrange
		const f = fixture();
		// Act
		await f.useCase.execute(f.source);
		await f.execute.mock.calls[0][1]();
		// Assert
		expect(f.execute.mock.calls[0][0]).toEqual([url]);
		expect(f.find).toHaveBeenCalledExactlyOnceWith(f.source.identity);
	});
	it.each(["accepted", "reserved", "uncertain"] as const)(
		"uses a provider receipt only after %s publication",
		async (status) => {
			// Arrange
			const receipt = {
				provider: "linkedin" as const,
				organizationUrn: "urn:li:organization:123",
				postUrn: "urn:li:share:67890",
			};
			const record: SocialDeliveryRecord = {
				intentId: "intent",
				occurrence: "2099-06-01",
				purpose: "announcement",
				destination: {
					key: "linkedin",
					provider: "linkedin",
					label: "LinkedIn",
					organizationUrn: receipt.organizationUrn,
				},
				attempts: [
					{
						id: "attempt",
						revision: "revision",
						reservedAt: "2099-06-01T10:00:00Z",
						status,
						...(status === "accepted" ? { receipt } : {}),
					},
				],
			};
			const f = fixture([record]);
			// Act
			await f.useCase.execute(f.source);
			// Assert
			expect(f.execute.mock.calls[0][0]).toEqual(
				status === "accepted"
					? [url, "https://www.linkedin.com/feed/update/urn:li:share:67890/"]
					: [url],
			);
		},
	);
	it("rejects an issue changed after reading its post links", async () => {
		// Arrange
		const f = fixture();
		f.find.mockResolvedValue({ ...f.source, body: "changed" });
		await f.useCase.execute(f.source);
		// Act
		const check = f.execute.mock.calls[0][1]();
		// Assert
		await expect(check).rejects.toThrow();
	});
});
