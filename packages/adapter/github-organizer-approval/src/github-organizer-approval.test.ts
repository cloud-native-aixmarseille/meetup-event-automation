import { describe, expect, it } from "vitest";
import { decision, fixture, request } from "../testing/approval.fixtures.js";
import { ApprovalPresenter } from "./approval-presenter.js";
import { ApprovalRecord } from "./approval-record.js";
import { GithubOrganizerApproval } from "./github-organizer-approval.js";
import { ApprovalMessages } from "./i18n/approval-messages.js";

describe("organizer approval requests", () => {
	it.each([{ eventDate: "2099-06-09" }, { recipientCount: 1 }])(
		"resets a request whose displayed facts were changed: %j",
		async (changed) => {
			// Arrange
			const f = fixture();
			await f.approvals.request(request);
			const record = ApprovalRecord.read(f.comments[0]?.body ?? "");
			decision(f, {
				body: f.presenter.issue(
					{ ...record, ...changed },
					{ status: "approved" },
				),
			});
			// Act
			const result = await f.approvals.request(request);
			// Assert
			expect(result.status).toBe("pending");
			expect(f.comments[0]?.body).toContain("- [ ] Approve sending this batch");
			expect(f.permission).not.toHaveBeenCalled();
		},
	);
	it.each(["en", "fr"])(
		"preserves approval and its human editor across retries and locale changes from %s",
		async (locale) => {
			// Arrange
			const f = fixture(locale);
			await f.approvals.request(request);
			decision(f);
			const writes = f.update.mock.calls.length;
			const translated = new GithubOrganizerApproval(
				f.client,
				"automation[bot]",
				new ApprovalPresenter(
					new ApprovalMessages(locale === "en" ? "fr" : "en"),
				),
				{ dispatch: f.dispatch },
				"organizer-channel",
			);
			// Act
			const first = await f.approvals.request(request);
			const second = await translated.request(request);
			// Assert
			expect(first.status).toBe("approved");
			expect(second.status).toBe("approved");
			expect(f.update).toHaveBeenCalledTimes(writes);
			expect(f.permission).toHaveBeenCalledTimes(2);
		},
	);
	it.each(["both", "changed description", "command"])(
		"holds mail for an ambiguous or altered request: %s",
		async (variant) => {
			// Arrange
			const f = fixture();
			await f.approvals.request(request);
			decision(f);
			const body = f.comments[0]?.body ?? "";
			const altered =
				variant === "both"
					? body.replace("- [ ] Reject", "- [x] Reject")
					: variant === "command"
						? `${body}\n/approve approval-synthetic`
						: body.replace("up to 2", "up to 1");
			decision(f, { body: altered });
			// Act
			const result = await f.approvals.request(request);
			// Assert
			expect(result.status).toBe("pending");
			expect(f.permission).not.toHaveBeenCalled();
		},
	);
	it("withdraws approval when its checkbox is cleared", async () => {
		// Arrange
		const f = fixture();
		await f.approvals.request(request);
		decision(f);
		await f.approvals.request(request);
		// Act
		decision(f, {}, "pending");
		const result = await f.approvals.request(request);
		// Assert
		expect(result.status).toBe("pending");
	});
	it("blocks approval if the request changes while its editor is being read", async () => {
		// Arrange
		const f = fixture();
		await f.approvals.request(request);
		decision(f);
		f.graphql.mockResolvedValue({
			node: { id: "comment-100", body: "newer request" },
		});
		// Act
		const result = f.approvals.request(request);
		// Assert
		await expect(result).rejects.toThrow(
			"Approval comment changed during verification",
		);
		expect(f.permission).not.toHaveBeenCalled();
	});
	it("preserves a choice made while the Slack notification is in flight", async () => {
		// Arrange
		const f = fixture();
		f.dispatch.mockImplementation(async () => {
			decision(f);
			return { outcome: "accepted" };
		});
		// Act
		const result = f.approvals.request(request);
		// Assert
		await expect(result).rejects.toThrow(
			"Approval comment changed before persistence",
		);
		expect(f.comments[0]?.body).toContain("- [x] Approve sending this batch");
	});
	it.each(["en", "fr"])(
		"creates one issue request and one Slack alert in %s",
		async (locale) => {
			// Arrange
			const f = fixture(locale);
			// Act
			const first = await f.approvals.request(request);
			const second = await f.approvals.request(request);
			// Assert
			expect(first.status).toBe("pending");
			expect(second.status).toBe("pending");
			expect(f.create).toHaveBeenCalledTimes(1);
			expect(f.dispatch).toHaveBeenCalledTimes(1);
			expect(f.dispatch.mock.calls[0]?.[0].content).toContain(
				"https://github.com/example/meetups/issues/42#issuecomment-100",
			);
			expect(f.comments[0]?.body).toContain(
				locale === "fr" ? "- [ ] Approuver" : "- [ ] Approve",
			);
		},
	);
	it.each(["write", "admin"])(
		"accepts approval with %s permission",
		async (permission) => {
			// Arrange
			const f = fixture();
			await f.approvals.request(request);
			decision(f);
			f.permission.mockResolvedValue({ data: { permission } });
			// Act
			const result = await f.approvals.request(request);
			// Assert
			expect(result.status).toBe("approved");
			expect(f.comments[0]?.body).toContain("- [x] Approve sending this batch");
		},
	);
	it.each(["read", "triage", "none"])(
		"ignores a decision with %s permission",
		async (permission) => {
			// Arrange
			const f = fixture();
			await f.approvals.request(request);
			decision(f);
			f.permission.mockResolvedValue({ data: { permission } });
			// Act
			const result = await f.approvals.request(request);
			// Assert
			expect(result.status).toBe("pending");
		},
	);
	it.each([
		{ editor: { login: "another[bot]", __typename: "Bot" } },
		{ editor: { login: "ghost", __typename: "User" } },
		{ editor: null },
		{ lastEditedAt: "2099-05-01T10:00:00.000Z" },
		{ lastEditedAt: "invalid" },
		{ lastEditedAt: null },
	])("ignores ineligible editors or stale edits %j", async (overrides) => {
		// Arrange
		const f = fixture();
		await f.approvals.request(request);
		decision(f, overrides);
		// Act
		const result = await f.approvals.request(request);
		// Assert
		expect(result.status).toBe("pending");
		expect(f.permission).not.toHaveBeenCalled();
	});

	it("honors a changed checkbox choice without resending the alert", async () => {
		// Arrange
		const f = fixture();
		await f.approvals.request(request);
		decision(f);
		decision(f, {}, "rejected");
		// Act
		const result = await f.approvals.request(request);
		// Assert
		expect(result.status).toBe("rejected");
		expect(f.comments[0]?.body).toContain("- [x] Reject sending this batch");
		expect(f.dispatch).toHaveBeenCalledTimes(1);
	});
	it("invalidates a prior approval when the revision changes, even if old facts return", async () => {
		// Arrange
		const f = fixture();
		await f.approvals.request(request);
		decision(f);
		// Act
		const changed = await f.approvals.request({
			...request,
			revision: "b".repeat(64),
		});
		const restored = await f.approvals.request(request);
		// Assert
		expect(changed.status).toBe("pending");
		expect(restored.status).toBe("pending");
		expect(f.create).toHaveBeenCalledTimes(1);
		expect(f.dispatch).toHaveBeenCalledTimes(3);
	});
	it("ignores forged managed comments from other authors", async () => {
		// Arrange
		const f = fixture();
		f.comments.push({
			id: 1,
			body: "<!-- meetup-organizer-approval:v1 malformed -->",
			user: { login: "outsider", type: "User" },
		});
		// Act
		const result = await f.approvals.request(request);
		// Assert
		expect(result.status).toBe("pending");
		expect(f.create).toHaveBeenCalledTimes(1);
	});
	it("fails closed on malformed trusted state", async () => {
		// Arrange
		const f = fixture();
		f.comments.push({
			id: 1,
			body: "<!-- meetup-organizer-approval:v1 malformed -->",
			user: { login: "automation[bot]", type: "Bot" },
		});
		// Act
		const result = f.approvals.request(request);
		// Assert
		await expect(result).rejects.toThrow();
		expect(f.dispatch).not.toHaveBeenCalled();
	});
	it("does not repeat a Slack alert with an uncertain acknowledgement", async () => {
		// Arrange
		const f = fixture();
		f.dispatch.mockResolvedValue({ outcome: "uncertain" });
		// Act
		const first = await f.approvals.request(request);
		const second = await f.approvals.request(request);
		// Assert
		expect(first.notificationFailed).toBe(true);
		expect(second.notificationFailed).toBe(true);
		expect(f.dispatch).toHaveBeenCalledTimes(1);
	});
	it("retries a definitively deferred Slack alert", async () => {
		// Arrange
		const f = fixture();
		f.dispatch.mockResolvedValueOnce({
			outcome: "deferred",
			diagnosticCode: "rate-limited",
		});
		// Act
		await f.approvals.request(request);
		const result = await f.approvals.request(request);
		// Assert
		expect(result.notificationFailed).toBe(false);
		expect(f.dispatch).toHaveBeenCalledTimes(2);
	});
	it("does not send Slack if notification reservation cannot be persisted", async () => {
		// Arrange
		const f = fixture();
		f.update.mockRejectedValue(new Error("write failed"));
		// Act
		const result = f.approvals.request(request);
		// Assert
		await expect(result).rejects.toThrow("write failed");
		expect(f.dispatch).not.toHaveBeenCalled();
	});
});
