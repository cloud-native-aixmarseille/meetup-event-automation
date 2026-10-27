import { describe, expect, it } from "vitest";
import { socialRecoveryFixture } from "../../testing/social-recovery.fixtures.js";
import { RecoverSocialPublication } from "./recover-social-publication.js";

const evidence = "https://github.com/example/events/issues/42#issuecomment-100";
const slackPost =
	"https://community.slack.com/archives/CEXAMPLE/p1792497600123456";

describe("explicit social delivery recovery", () => {
	it("keeps an accepted recovery complete on reruns", async () => {
		// Arrange
		const f = socialRecoveryFixture();
		const input = {
			intentId: f.initial.intentId,
			outcome: "published" as const,
			reference: slackPost,
		};

		// Act
		await f.recovery.execute(input);
		const result = await f.recovery.execute(input);

		// Assert
		expect(result).toBe("complete");
		expect(f.approvals.request).toHaveBeenCalledTimes(1);
		expect(f.journal.save).toHaveBeenCalledTimes(1);
	});
	it.each(["rejected", "deferred"] as const)(
		"does not ask to overwrite definitive %s with publication",
		async (status) => {
			// Arrange
			const f = socialRecoveryFixture();
			f.setRecord({
				...f.initial,
				attempts: [{ ...f.initial.attempts[0], status }],
			});

			// Act
			const recover = f.recovery.execute({
				intentId: f.initial.intentId,
				outcome: "published",
				reference: slackPost,
			});

			// Assert
			await expect(recover).rejects.toThrow("Definitive non-acceptance");
			expect(f.approvals.request).not.toHaveBeenCalled();
			expect(f.journal.save).not.toHaveBeenCalled();
		},
	);
	it("retains the uncertain attempt when recovery persistence fails", async () => {
		// Arrange
		const f = socialRecoveryFixture();
		f.journal.save.mockRejectedValue(new Error("Storage unavailable"));

		// Act
		const recover = f.recovery.execute({
			intentId: f.initial.intentId,
			outcome: "not-published",
			reference: evidence,
		});

		// Assert
		await expect(recover).rejects.toThrow("Storage unavailable");
		expect(f.current()).toEqual(f.initial);
	});
	it("rejects invalid remote evidence before requesting approval", async () => {
		// Arrange
		const f = socialRecoveryFixture();

		// Act
		const recover = f.recovery.execute({
			intentId: f.initial.intentId,
			outcome: "published",
			reference:
				"https://community.slack.com/archives/COTHER/p1792497600123456",
		});

		// Assert
		await expect(recover).rejects.toThrow("does not match Slack destination");
		expect(f.approvals.request).not.toHaveBeenCalled();
		expect(f.journal.save).not.toHaveBeenCalled();
	});
	it("records a verified Slack post with organizer decision provenance", async () => {
		// Arrange
		const f = socialRecoveryFixture();

		// Act
		const result = await f.recovery.execute({
			intentId: f.initial.intentId,
			outcome: "published",
			reference: slackPost,
		});

		// Assert
		expect(f.recovery).toBeInstanceOf(RecoverSocialPublication);
		expect(result).toBe("recovered");
		expect(f.current()?.attempts[0]).toMatchObject({
			status: "accepted",
			receipt: {
				provider: "slack",
				workspaceId: "TEXAMPLE",
				channelId: "CEXAMPLE",
				ts: "1792497600.123456",
				url: slackPost,
			},
			recovery: {
				actor: "organizer",
				decidedAt: f.approved.decidedAt,
				outcome: "published",
				reference: slackPost,
			},
		});
		expect(f.journal.save).toHaveBeenCalledTimes(1);
	});
	it("retains a LinkedIn activity permalink as the manually verified post identity", async () => {
		// Arrange
		const f = socialRecoveryFixture("linkedin");
		const reference =
			"https://www.linkedin.com/posts/example-event-activity-123456789-community/";

		// Act
		await f.recovery.execute({
			intentId: f.initial.intentId,
			outcome: "published",
			reference,
		});

		// Assert
		expect(f.current()?.attempts[0].receipt).toEqual({
			provider: "linkedin",
			organizationUrn: "urn:li:organization:123",
			postUrn: "urn:li:activity:123456789",
			url: reference,
		});
	});
	it.each(["reserved", "uncertain", "rejected", "deferred"] as const)(
		"preserves %s provider evidence when non-publication is confirmed",
		async (status) => {
			// Arrange
			const f = socialRecoveryFixture();
			const attempt = { ...f.initial.attempts[0], status };
			f.setRecord({ ...f.initial, attempts: [attempt] });

			// Act
			const result = await f.recovery.execute({
				intentId: f.initial.intentId,
				outcome: "not-published",
				reference: evidence,
			});

			// Assert
			expect(result).toBe("recovered");
			expect(f.current()?.attempts[0]).toEqual({
				...attempt,
				recovery: {
					actor: "organizer",
					decidedAt: f.approved.decidedAt,
					outcome: "not-published",
					reference: evidence,
				},
			});
		},
	);
	it("does not repeat a verified non-publication decision or overwrite its provenance", async () => {
		// Arrange
		const f = socialRecoveryFixture();
		const input = {
			intentId: f.initial.intentId,
			outcome: "not-published" as const,
			reference: evidence,
		};

		// Act
		const first = await f.recovery.execute(input);
		const second = await f.recovery.execute(input);

		// Assert
		expect(first).toBe("recovered");
		expect(second).toBe("recovered");
		expect(f.approvals.request).toHaveBeenCalledTimes(1);
		expect(f.journal.save).toHaveBeenCalledTimes(1);
	});
	it("rejects a request to replace retained recovery evidence", async () => {
		// Arrange
		const f = socialRecoveryFixture();
		await f.recovery.execute({
			intentId: f.initial.intentId,
			outcome: "not-published",
			reference: evidence,
		});

		// Act
		const recover = f.recovery.execute({
			intentId: f.initial.intentId,
			outcome: "published",
			reference: slackPost,
		});

		// Assert
		await expect(recover).rejects.toThrow("evidence cannot change");
		expect(f.journal.save).toHaveBeenCalledTimes(1);
	});
	it("keeps manual completion terminal even without a provider attempt", async () => {
		// Arrange
		const f = socialRecoveryFixture();
		f.setRecord({
			...f.initial,
			attempts: [],
			manual: {
				recordedAt: "2026-10-20T12:00:00Z",
				reference: "https://github.com/example/events/issues/42",
			},
		});

		// Act
		const result = await f.recovery.execute({
			intentId: f.initial.intentId,
			outcome: "not-published",
			reference: evidence,
		});

		// Assert
		expect(result).toBe("complete");
		expect(f.approvals.request).not.toHaveBeenCalled();
		expect(f.journal.save).not.toHaveBeenCalled();
	});
	it.each(["pending", "rejected", "iteration-requested"] as const)(
		"does not recover a %s decision",
		async (status) => {
			// Arrange
			const f = socialRecoveryFixture();
			f.approvals.request.mockResolvedValue({
				status,
				notificationFailed: false,
			});

			// Act
			const result = await f.recovery.execute({
				intentId: f.initial.intentId,
				outcome: "not-published",
				reference: evidence,
			});

			// Assert
			expect(result).toBe(status === "pending" ? "pending" : "rejected");
			expect(f.journal.save).not.toHaveBeenCalled();
		},
	);
	it.each([
		{ actor: undefined },
		{ actor: " " },
		{ decidedAt: undefined },
		{ decidedAt: "invalid" },
		{ decidedAt: "2026-10-20T11:00:00Z" },
	])("requires usable actor and decision-time provenance %#", async (patch) => {
		// Arrange
		const f = socialRecoveryFixture();
		f.approvals.request.mockResolvedValue({ ...f.approved, ...patch });

		// Act
		const recover = f.recovery.execute({
			intentId: f.initial.intentId,
			outcome: "not-published",
			reference: evidence,
		});

		// Assert
		await expect(recover).rejects.toThrow("provenance is unavailable");
		expect(f.journal.save).not.toHaveBeenCalled();
	});
	it("blocks a record that changed while its decision was verified", async () => {
		// Arrange
		const f = socialRecoveryFixture();
		f.approvals.request.mockImplementation(async () => {
			f.setRecord({
				...f.initial,
				attempts: [
					...f.initial.attempts,
					{ ...f.initial.attempts[0], id: "attempt-two" },
				],
			});
			return f.approved;
		});

		// Act
		const recover = f.recovery.execute({
			intentId: f.initial.intentId,
			outcome: "not-published",
			reference: evidence,
		});

		// Assert
		await expect(recover).rejects.toThrow("changed during recovery");
		expect(f.journal.save).not.toHaveBeenCalled();
	});
	it("requires retained draft evidence for the attempt revision", async () => {
		// Arrange
		const f = socialRecoveryFixture();
		f.store.load.mockResolvedValue({ revision: "empty", proposals: [] });

		// Act
		const recover = f.recovery.execute({
			intentId: f.initial.intentId,
			outcome: "not-published",
			reference: evidence,
		});

		// Assert
		await expect(recover).rejects.toThrow("draft evidence is missing");
		expect(f.approvals.request).not.toHaveBeenCalled();
	});
	it("binds recovery approval to the attempt identity", async () => {
		// Arrange
		const f = socialRecoveryFixture();
		f.approvals.request.mockResolvedValue({
			status: "pending",
			notificationFailed: false,
		});
		const input = {
			intentId: f.initial.intentId,
			outcome: "not-published" as const,
			reference: evidence,
		};

		// Act
		await f.recovery.execute(input);
		f.setRecord({
			...f.initial,
			attempts: [{ ...f.initial.attempts[0], id: "attempt-two" }],
		});
		await f.recovery.execute(input);

		// Assert
		expect(f.approvals.request.mock.calls[0][0].revision).not.toBe(
			f.approvals.request.mock.calls[1][0].revision,
		);
		expect(f.journal.save).not.toHaveBeenCalled();
	});
});
