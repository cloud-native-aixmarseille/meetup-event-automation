import { publicationRequest } from "../testing/approval.fixtures.js";
import { describe, expect, it } from "vitest";
import { decision, fixture, request } from "../testing/approval.fixtures.js";
import { ApprovalPresenter } from "./approval-presenter.js";
import { ApprovalRecord } from "./approval-record.js";
import { GithubOrganizerApproval } from "./github-organizer-approval.js";
import { ApprovalMessages } from "./i18n/approval-messages.js";

describe("organizer approval requests", () => {
	it("cannot finalize a decision until the GitHub write succeeds", async () => {
		// Arrange
		const f = fixture();
		await f.approvals.request(request);
		decision(f);
		f.update.mockRejectedValueOnce(new Error("write failed"));
		// Act
		const result = f.approvals.request(request);
		// Assert
		await expect(result).rejects.toThrow("write failed");
		expect(f.react).not.toHaveBeenCalled();
		expect(
			ApprovalRecord.read(f.comments[0]?.body ?? "").decision,
		).toBeUndefined();
	});
	it("retries the same reaction when its successful acknowledgement cannot be saved", async () => {
		// Arrange
		const f = fixture();
		await f.approvals.request(request);
		decision(f);
		f.react.mockImplementationOnce(async () => {
			f.update.mockRejectedValueOnce(new Error("write failed"));
			return true;
		});
		// Act
		const first = await f.approvals.synchronize();
		const recorded = ApprovalRecord.read(f.comments[0]?.body ?? "");
		const second = await f.approvals.synchronize();
		// Assert
		expect(first.notificationFailed).toBe(true);
		expect(recorded.decision?.status).toBe("approved");
		expect(recorded.reactionSent).toBeUndefined();
		expect(second.notificationFailed).toBe(false);
		expect(f.react).toHaveBeenCalledTimes(2);
		expect(f.react.mock.calls[1]).toEqual(f.react.mock.calls[0]);
		expect(f.dispatch).toHaveBeenCalledTimes(1);
	});
	it("does not accept a forged final decision in a pending request", async () => {
		// Arrange
		const f = fixture();
		await f.approvals.request(request);
		const record = ApprovalRecord.read(f.comments[0]?.body ?? "");
		record.decision = {
			status: "approved",
			actor: "organizer",
			decidedAt: request.requestedAt,
		};
		decision(f, { body: f.presenter.issue(record, record.decision) });
		// Act
		const result = await f.approvals.request(request);
		// Assert
		expect(result.status).toBe("pending");
		expect(f.comments[0]?.body).toContain("- [ ] Approve sending this batch");
		expect(f.react).not.toHaveBeenCalled();
		expect(f.permission).not.toHaveBeenCalled();
	});
	it("requests a new decision in the same comment when a rejected batch changes", async () => {
		// Arrange
		const f = fixture();
		await f.approvals.request(request);
		decision(f, {}, "rejected");
		await f.approvals.synchronize();
		const original = ApprovalRecord.read(f.comments[0]?.body ?? "");
		f.dispatch.mockResolvedValueOnce({
			outcome: "accepted",
			message: { destination: "C67890", messageId: "200.001" },
		});
		// Act
		const result = await f.approvals.request({
			...request,
			revision: "b".repeat(64),
		});
		const replacement = ApprovalRecord.read(f.comments[0]?.body ?? "");
		decision(f);
		await f.approvals.synchronize();
		// Assert
		expect(result.status).toBe("pending");
		expect(replacement.requestId).not.toBe(original.requestId);
		expect(replacement.decision).toBeUndefined();
		expect(f.comments).toHaveLength(1);
		expect(f.dispatch).toHaveBeenCalledTimes(2);
		expect(f.react.mock.calls).toEqual([
			[{ destination: "C12345", messageId: "100.001" }, "rejected"],
			[{ destination: "C67890", messageId: "200.001" }, "approved"],
		]);
	});
	it.each(["approved", "rejected"] as const)(
		"finalizes %s in place and reacts once on the recorded Slack destination",
		async (status) => {
			// Arrange
			const f = fixture();
			await f.approvals.request(request);
			const commentId = f.comments[0]?.id;
			decision(f, {}, status);
			// Act
			const first = await f.approvals.synchronize();
			const second = await f.approvals.synchronize();
			const result = await f.approvals.request(request);
			// Assert
			expect(result.status).toBe(status);
			expect(first.notificationFailed).toBe(false);
			expect(second.notificationFailed).toBe(false);
			expect(f.comments).toHaveLength(1);
			expect(f.comments[0]?.id).toBe(commentId);
			expect(f.comments[0]?.body).not.toContain("- [");
			expect(f.comments[0]?.body).toContain("@organizer");
			expect(f.comments[0]?.body).toContain(request.requestedAt);
			expect(f.dispatch).toHaveBeenCalledTimes(1);
			expect(f.react).toHaveBeenCalledExactlyOnceWith(
				{ destination: "C12345", messageId: "100.001" },
				status,
			);
		},
	);
	it.each(["approved", "rejected"] as const)(
		"restores a final %s decision after tampering with its metadata",
		async (status) => {
			// Arrange
			const f = fixture();
			await f.approvals.request(request);
			decision(f, {}, status);
			await f.approvals.synchronize();
			const original = f.comments[0]?.body ?? "";
			const replacement = original.replaceAll(
				status,
				status === "approved" ? "rejected" : "approved",
			);
			// Act
			decision(f, { body: replacement });
			const result = await f.approvals.request(request);
			// Assert
			expect(result.status).toBe(status);
			expect(f.comments[0]?.body).toBe(original);
			expect(f.create).toHaveBeenCalledTimes(1);
			expect(f.react).toHaveBeenCalledTimes(1);
		},
	);
	it("preserves a finalized decision when a human removes all comment metadata", async () => {
		// Arrange
		const f = fixture();
		await f.approvals.request(request);
		decision(f, {}, "rejected");
		await f.approvals.synchronize();
		const original = f.comments[0]?.body;
		// Act
		decision(f, { body: "- [x] Approve sending this batch" });
		const result = await f.approvals.request(request);
		// Assert
		expect(result.status).toBe("rejected");
		expect(f.comments[0]?.body).toBe(original);
		expect(f.comments).toHaveLength(1);
	});
	it("retries a failed reaction while retaining the final decision", async () => {
		// Arrange
		const f = fixture();
		await f.approvals.request(request);
		decision(f);
		f.react.mockResolvedValueOnce(false);
		// Act
		const first = await f.approvals.synchronize();
		const firstBody = f.comments[0]?.body;
		const second = await f.approvals.synchronize();
		// Assert
		expect(first.notificationFailed).toBe(true);
		expect(firstBody).toContain("✅ **Approved**");
		expect(firstBody).not.toContain("- [");
		expect(second.notificationFailed).toBe(false);
		expect(f.react).toHaveBeenCalledTimes(2);
		expect(f.dispatch).toHaveBeenCalledTimes(1);
	});
	it("retains a decision on a sent notification without a message reference", async () => {
		// Arrange
		const f = fixture();
		f.dispatch.mockResolvedValue({ outcome: "accepted" });
		await f.approvals.request(request);
		decision(f);
		// Act
		const result = await f.approvals.request(request);
		// Assert
		expect(result).toEqual({ status: "approved", notificationFailed: false });
		expect(f.comments[0]?.body).toContain("✅ **Approved**");
		expect(f.react).not.toHaveBeenCalled();
		expect(f.dispatch).toHaveBeenCalledTimes(1);
	});
	it("keeps an uncertain notification visible after an organizer decision without reposting", async () => {
		// Arrange
		const f = fixture();
		f.dispatch.mockResolvedValue({ outcome: "uncertain" });
		await f.approvals.request(request);
		decision(f);
		// Act
		const result = await f.approvals.request(request);
		// Assert
		expect(result).toEqual({ status: "approved", notificationFailed: true });
		expect(f.react).not.toHaveBeenCalled();
		expect(f.dispatch).toHaveBeenCalledTimes(1);
	});
	it("does not authorize dispatch after the recorded organizer loses write access", async () => {
		// Arrange
		const f = fixture();
		await f.approvals.request(request);
		decision(f);
		await f.approvals.synchronize();
		f.permission.mockResolvedValue({ data: { permission: "read" } });
		// Act
		const result = f.approvals.request(request);
		// Assert
		await expect(result).rejects.toThrow("no longer has approval permission");
		expect(f.comments[0]?.body).toContain("✅ **Approved**");
	});
	it.each([{ eventDate: "2099-06-09" }, { recipientCount: 1 }])(
		"resets a request whose displayed facts were changed: %j",
		async (changed) => {
			// Arrange
			const f = fixture();
			await f.approvals.request(request);
			const record = ApprovalRecord.read(f.comments[0]?.body ?? "");
			if (record.kind === "meetup-publication")
				throw new Error("Expected an email request");
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
		"preserves the recorded decision across retries and locale changes from %s",
		async (locale) => {
			// Arrange
			const f = fixture(locale);
			await f.approvals.request(request);
			decision(f);
			const translated = new GithubOrganizerApproval(
				f.client,
				"automation[bot]",
				new ApprovalPresenter(
					new ApprovalMessages(locale === "en" ? "fr" : "en"),
				),
				{ send: f.dispatch, react: f.react },
				"organizer-channel",
			);
			// Act
			const first = await f.approvals.request(request);
			const second = await translated.request(request);
			// Assert
			expect(first.status).toBe("approved");
			expect(second.status).toBe("approved");
			expect(f.comments).toHaveLength(1);
			expect(f.comments[0]?.body).not.toContain("- [");
			expect(f.comments[0]?.body).toContain("@organizer");
			expect(f.dispatch).toHaveBeenCalledTimes(1);
			expect(f.react).toHaveBeenCalledTimes(1);
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
						: body.replace("Up to 2", "Up to 1");
			decision(f, { body: altered });
			// Act
			const result = await f.approvals.request(request);
			// Assert
			expect(result.status).toBe("pending");
			expect(f.permission).not.toHaveBeenCalled();
		},
	);
	it.each(["approved", "rejected"] as const)(
		"preserves a finalized %s decision when old checkboxes are restored",
		async (status) => {
			// Arrange
			const f = fixture();
			await f.approvals.request(request);
			const pending = f.comments[0]?.body ?? "";
			decision(f, {}, status);
			await f.approvals.request(request);
			// Act
			decision(f, { body: pending }, "pending");
			const result = await f.approvals.request(request);
			// Assert
			expect(result.status).toBe(status);
			expect(f.comments[0]?.body).not.toContain("- [");
			expect(f.comments).toHaveLength(1);
			expect(f.react).toHaveBeenCalledTimes(1);
		},
	);
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
			expect(f.dispatch.mock.calls[0]?.[0].approvalUrl).toBe(
				"https://github.com/example/meetups/issues/42#issuecomment-100",
			);
			expect(f.comments[0]?.body).toContain(
				locale === "fr" ? "- [ ] Approuver" : "- [ ] Approve",
			);
		},
	);
	it.each(["write", "maintain", "admin"])(
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
			expect(f.comments[0]?.body).toContain("✅ **Approved** by @organizer");
			expect(f.comments[0]?.body).not.toContain("- [");
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
		expect(f.comments[0]?.body).toContain("❌ **Rejected** by @organizer");
		expect(f.comments[0]?.body).not.toContain("- [");
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

describe("shared post-event follow-up", () => {
	const followUp = {
		eventDate: request.eventDate,
		requestedAt: request.requestedAt,
		active: true,
		pendingTasks: [
			"thank-host",
			"thank-speakers",
			"share-slides",
			"import-attendance",
			"share-social",
		] as const,
	};
	it("creates an overview before emails are ready and upgrades the same comment", async () => {
		// Arrange
		const f = fixture();
		// Act
		const commentId = await f.approvals.synchronizeFollowUp(followUp);
		const waiting = f.comments[0]?.body;
		const result = await f.approvals.request({
			...request,
			kind: "email-thanks",
		});
		// Assert
		expect(commentId).toBe(100);
		expect(waiting).toContain("Thank-you emails are not ready for approval.");
		expect(waiting).not.toContain("- [ ]");
		expect(result.status).toBe("pending");
		expect(f.comments).toHaveLength(1);
		expect(f.comments[0]?.body).toContain("- [ ] Approve");
		expect(f.comments[0]?.body).toContain("Import attendance into CNCF");
		expect(f.dispatch).not.toHaveBeenCalled();
	});
	it("records a human decision before updating task progress and retains it on retry", async () => {
		// Arrange
		const f = fixture();
		await f.approvals.request({ ...request, kind: "email-thanks" });
		decision(f);
		// Act
		await f.approvals.synchronizeFollowUp({
			...followUp,
			pendingTasks: ["thank-host", "share-slides"],
		});
		const result = await f.approvals.request({
			...request,
			kind: "email-thanks",
		});
		const record = ApprovalRecord.read(f.comments[0]?.body ?? "");
		// Assert
		expect(result.status).toBe("approved");
		expect(record.decision?.actor).toBe("organizer");
		expect(record.followUp?.pendingTasks).toEqual([
			"thank-host",
			"share-slides",
		]);
		expect(f.comments[0]?.body).toContain("✅ Thank the speakers");
		expect(f.comments).toHaveLength(1);
		expect(f.dispatch).not.toHaveBeenCalled();
		expect(f.react).not.toHaveBeenCalled();
	});
	it("retains notification reservations but requires approval for changed email batches", async () => {
		// Arrange
		const f = fixture();
		await f.approvals.request({ ...request, kind: "email-thanks" });
		decision(f);
		await f.approvals.saveFollowUpAttention("serialized-reservation");
		// Act
		const changed = await f.approvals.request({
			...request,
			kind: "email-thanks",
			revision: "c".repeat(64),
		});
		const restored = await f.approvals.followUpAttention();
		// Assert
		expect(changed.status).toBe("pending");
		expect(restored).toEqual({
			commentId: 100,
			body: "serialized-reservation",
		});
		expect(f.comments).toHaveLength(1);
		expect(f.comments[0]?.body).toContain("- [ ] Approve");
	});
	it("removes approval controls when follow-up is no longer eligible", async () => {
		// Arrange
		const f = fixture();
		await f.approvals.request({ ...request, kind: "email-thanks" });
		// Act
		await f.approvals.synchronizeFollowUp({
			...followUp,
			active: false,
			eventDate: "",
		});
		const body = f.comments[0]?.body ?? "";
		// Assert
		expect(body).toContain("Follow-up paused.");
		expect(body).not.toContain("- [ ]");
		expect(f.comments).toHaveLength(1);
	});
	it("does not create an overview before follow-up is due", async () => {
		// Arrange
		const f = fixture();
		// Act
		const id = await f.approvals.synchronizeFollowUp({
			...followUp,
			active: false,
			eventDate: "",
		});
		// Assert
		expect(id).toBeUndefined();
		expect(f.comments).toHaveLength(0);
	});
	it("does not interpret an overview without emails as a pending approval", async () => {
		// Arrange
		const f = fixture();
		await f.approvals.synchronizeFollowUp(followUp);
		// Act
		const approvals = await f.approvals.readAttention();
		// Assert
		expect(approvals).toEqual([]);
	});
	it.each(["approved", "rejected"] as const)(
		"records organizer %s for Meetup publication",
		async (status) => {
			// Arrange
			const f = fixture();
			await f.approvals.request(publicationRequest);
			decision(f, {}, status);

			// Act
			const result = await f.approvals.request(publicationRequest);
			const attention = await f.approvals.readAttention();

			// Assert
			expect(result.status).toBe(status);
			expect(attention[0]).toMatchObject({
				kind: "meetup-publication",
				status,
			});
			expect(f.comments[0]?.body).not.toContain("- [");
			expect(f.dispatch).toHaveBeenCalledWith({
				destination: "organizer-channel",
				kind: "meetup-publication",
				eventDate: publicationRequest.eventDate,
				approvalUrl:
					"https://github.com/example/meetups/issues/42#issuecomment-100",
			});
			expect(f.react).toHaveBeenCalledWith(expect.anything(), status);
		},
	);

	it("requires a new decision when the reviewed publication changes", async () => {
		// Arrange
		const f = fixture();
		await f.approvals.request(publicationRequest);
		decision(f);
		await f.approvals.request(publicationRequest);

		// Act
		const result = await f.approvals.request({
			...publicationRequest,
			revision: "c".repeat(64),
			publication: {
				...publicationRequest.publication,
				title: "Changed content",
			},
		});

		// Assert
		expect(result.status).toBe("pending");
		expect(f.create).toHaveBeenCalledOnce();
		expect(f.comments[0]?.body).toContain(
			"- [ ] Approve publishing this Meetup event",
		);
	});

	it("rejects publication approval from a user without repository write permission", async () => {
		// Arrange
		const f = fixture();
		await f.approvals.request(publicationRequest);
		decision(f);
		f.permission.mockResolvedValue({ data: { permission: "read" } });

		// Act
		const result = await f.approvals.request(publicationRequest);

		// Assert
		expect(result.status).toBe("pending");
	});
	it("does not accept modified publication facts as organizer approval", async () => {
		// Arrange
		const f = fixture();
		await f.approvals.request(publicationRequest);
		const record = ApprovalRecord.read(f.comments[0]?.body ?? "");
		if (record.kind !== "meetup-publication")
			throw new Error("Expected publication request");
		decision(f, {
			body: f.presenter.issue(
				{
					...record,
					publication: {
						...record.publication,
						url: "https://www.meetup.com/example/events/67890/",
					},
				},
				{ status: "approved" },
			),
		});

		// Act
		const result = await f.approvals.request(publicationRequest);

		// Assert
		expect(result.status).toBe("pending");
		expect(f.permission).not.toHaveBeenCalled();
	});
});
