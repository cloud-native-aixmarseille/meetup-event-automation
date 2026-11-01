import { describe, expect, it, vi } from "vitest";
import { LinkedInPostReference } from "./linkedin-post-reference.js";
import type {
	LinkedInShareRecord,
	LinkedInSharingNotification,
} from "./linkedin-sharing-ports.js";
import { ReconcileLinkedInSharing } from "./reconcile-linkedin-sharing.js";

const url = "https://www.linkedin.com/feed/update/urn:li:activity:12345/";
function fixture() {
	const records = new Map<string, LinkedInShareRecord>();
	const save = vi.fn(async (_previous, next: LinkedInShareRecord) => {
		records.set(next.id, next);
	});
	const send = vi
		.fn<LinkedInSharingNotification["send"]>()
		.mockResolvedValue({ result: { outcome: "accepted" } });
	const beforeSend = vi.fn().mockResolvedValue(undefined);
	let now = new Date("2099-06-01T10:00:00Z");
	const useCase = new ReconcileLinkedInSharing(
		new LinkedInPostReference(),
		{ load: async (id) => records.get(id), save },
		{ send },
		{ now: () => now },
	);
	return {
		useCase,
		records,
		save,
		send,
		beforeSend,
		advance: () => {
			now = new Date(now.getTime() + 3600_000);
		},
	};
}
describe("LinkedIn sharing notifications", () => {
	it("notifies once per post despite aliases, removed links and reruns", async () => {
		// Arrange
		const f = fixture();
		const alias =
			"https://www.linkedin.com/posts/example_topic-activity-12345-community/?utm_source=share";
		// Act
		await f.useCase.execute([url, alias], f.beforeSend);
		await f.useCase.execute([], f.beforeSend);
		await f.useCase.execute([alias, url], f.beforeSend);
		// Assert
		expect(f.send).toHaveBeenCalledExactlyOnceWith(url);
		expect([...f.records.values()]).toEqual([
			expect.objectContaining({ status: "sent", attempts: 1 }),
		]);
		expect(f.save.mock.invocationCallOrder[0]).toBeLessThan(
			f.send.mock.invocationCallOrder[0],
		);
	});
	it("notifies distinct posts independently and ignores invalid links", async () => {
		// Arrange
		const f = fixture();
		const second = url.replace("12345", "67890");
		// Act
		await f.useCase.execute(
			[url, "https://www.linkedin.com/company/example/", second],
			f.beforeSend,
		);
		// Assert
		expect(f.send.mock.calls).toEqual([[url], [second]]);
	});
	it("honors a definite rate limit before retrying", async () => {
		// Arrange
		const f = fixture();
		f.send.mockResolvedValueOnce({
			result: { outcome: "deferred", diagnosticCode: "rate-limited" },
			retryAfterSeconds: 1800,
		});
		// Act
		const first = await f.useCase.execute([url], f.beforeSend);
		await f.useCase.execute([url], f.beforeSend);
		f.advance();
		const retried = await f.useCase.execute([url], f.beforeSend);
		// Assert
		expect(first.notificationFailed).toBe(true);
		expect(retried.notificationFailed).toBe(false);
		expect(f.send).toHaveBeenCalledTimes(2);
	});
	it.each(["uncertain", "exception"])(
		"does not resend after %s delivery",
		async (failure) => {
			// Arrange
			const f = fixture();
			if (failure === "exception")
				f.send.mockRejectedValueOnce(new Error("timeout"));
			else f.send.mockResolvedValueOnce({ result: { outcome: "uncertain" } });
			// Act
			await f.useCase.execute([url], f.beforeSend);
			f.advance();
			const result = await f.useCase.execute([url], f.beforeSend);
			// Assert
			expect(result.notificationFailed).toBe(true);
			expect(f.send).toHaveBeenCalledTimes(1);
		},
	);
	it("does not send without a durable reservation", async () => {
		// Arrange
		const f = fixture();
		f.save.mockRejectedValueOnce(new Error("write failed"));
		// Act
		const result = await f.useCase.execute([url], f.beforeSend);
		// Assert
		expect(result.notificationFailed).toBe(true);
		expect(f.send).not.toHaveBeenCalled();
	});
	it("does not send after concurrent issue changes", async () => {
		// Arrange
		const f = fixture();
		f.beforeSend.mockRejectedValueOnce(new Error("changed"));
		// Act
		const result = await f.useCase.execute([url], f.beforeSend);
		// Assert
		expect(result.notificationFailed).toBe(true);
		expect(f.send).not.toHaveBeenCalled();
		expect(f.save).not.toHaveBeenCalled();
	});
	it("keeps the reservation if recording success fails", async () => {
		// Arrange
		const f = fixture();
		f.save
			.mockImplementationOnce(async (_previous, next) => {
				f.records.set(next.id, next);
			})
			.mockRejectedValueOnce(new Error("write failed"));
		// Act
		await f.useCase.execute([url], f.beforeSend);
		const result = await f.useCase.execute([url], f.beforeSend);
		// Assert
		expect(result.notificationFailed).toBe(true);
		expect(f.send).toHaveBeenCalledTimes(1);
	});
	it("rechecks the issue after reserving and safely retries a cancelled send", async () => {
		// Arrange
		const f = fixture();
		f.beforeSend
			.mockResolvedValueOnce(undefined)
			.mockRejectedValueOnce(new Error("changed"));
		// Act
		const stale = await f.useCase.execute([url], f.beforeSend);
		const deferred = [...f.records.values()][0];
		const retried = await f.useCase.execute([url], f.beforeSend);
		// Assert
		expect(stale.notificationFailed).toBe(true);
		expect(deferred.status).toBe("retry");
		expect(retried.notificationFailed).toBe(false);
		expect(f.send).toHaveBeenCalledExactlyOnceWith(url);
	});
});
