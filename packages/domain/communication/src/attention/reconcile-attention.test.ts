import { describe, expect, it } from "vitest";
import {
	condition,
	facts,
	observation,
	reconciliationFixture,
} from "../../testing/attention.fixtures.js";
import { CommunicationDomainComposition } from "../dependency-composition.js";
import { ReconcileAttention } from "./reconcile-attention.js";

describe("durable attention reconciliation", () => {
	it("continues recovery reminders after closure when delivery evidence becomes unavailable", async () => {
		// Arrange
		const fixture = reconciliationFixture();
		const input = facts({ recovery: [{ key: "uncertain", uncertain: true }] });
		const initial = new CommunicationDomainComposition()
			.evaluateAttention()
			.execute(input, new Date("2099-06-01T10:00:00Z"));
		const closed = new CommunicationDomainComposition()
			.evaluateAttention()
			.execute(
				{ ...input, closed: true, recovery: undefined },
				new Date("2099-06-02T10:00:00Z"),
			);

		// Act
		await fixture.useCase.execute(initial);
		fixture.time("2099-06-02T10:00:00Z");
		const result = await fixture.useCase.execute(closed);

		// Assert
		expect(result.active).toBe(1);
		expect(fixture.notification.post).toHaveBeenCalledTimes(2);
		expect(fixture.state()?.episodes[0]?.status).toBe("unknown");
	});
	it("stops an existing stage alert after closure even if the stage keeps failing", async () => {
		// Arrange
		const fixture = reconciliationFixture();
		const input = facts({
			stages: [{ owner: "communications", outcome: "failure", blocked: false }],
		});
		const initial = new CommunicationDomainComposition()
			.evaluateAttention()
			.execute(input, new Date("2099-06-01T10:00:00Z"));
		const closed = new CommunicationDomainComposition()
			.evaluateAttention()
			.execute({ ...input, closed: true }, new Date("2099-06-02T10:00:00Z"));

		// Act
		await fixture.useCase.execute(initial);
		fixture.time("2099-06-02T10:00:00Z");
		const result = await fixture.useCase.execute(closed);

		// Assert
		expect(result.active).toBe(0);
		expect(fixture.notification.post).toHaveBeenCalledTimes(1);
		expect(fixture.notification.update).toHaveBeenCalledTimes(1);
		expect(fixture.state()?.episodes[0]?.status).toBe("stopped");
	});
	it("does not post stage failures for events already closed at first observation", async () => {
		// Arrange
		const fixture = reconciliationFixture();
		const input = facts({
			closed: true,
			stages: [{ owner: "communications", outcome: "failure", blocked: false }],
		});
		const closed = new CommunicationDomainComposition()
			.evaluateAttention()
			.execute(input, new Date("2099-06-01T10:00:00Z"));

		// Act
		const result = await fixture.useCase.execute(closed);

		// Assert
		expect(result.active).toBe(0);
		expect(fixture.notification.post).not.toHaveBeenCalled();
	});

	it("groups conditions, edits new failures, and resolves in place within the daily cap", async () => {
		// Arrange
		const fixture = reconciliationFixture();
		const failure = condition({
			key: "integration-failure:assets",
			code: "integration-failure",
			resource: "assets",
			owner: "assets",
			severity: "error",
			policy: "daily",
		});

		// Act
		await fixture.useCase.execute(observation());
		await fixture.useCase.execute(observation());
		await fixture.useCase.execute(
			observation({ conditions: [condition(), failure] }),
		);
		await fixture.useCase.execute(observation({ conditions: [] }));
		await fixture.useCase.execute(observation());

		// Assert
		expect(fixture.notification.post).toHaveBeenCalledTimes(1);
		expect(fixture.notification.update).toHaveBeenCalledTimes(3);
		expect(fixture.state()?.episodes[0]?.episode).toBe(2);
		expect(fixture.repository.save.mock.invocationCallOrder[1]).toBeLessThan(
			fixture.notification.post.mock.invocationCallOrder[0],
		);
	});
	it("emits only the most urgent missed milestone and does not repeat it", async () => {
		// Arrange
		const fixture = reconciliationFixture();
		fixture.time("2099-06-07T10:00:00Z");

		// Act
		await fixture.useCase.execute(observation());
		await fixture.useCase.execute(observation());
		fixture.time("2099-06-08T10:00:00Z");
		await fixture.useCase.execute(observation());

		// Assert
		expect(fixture.notification.post).toHaveBeenCalledTimes(2);
		expect(fixture.state()?.episodes[0]?.lastWindow).toBe("preparation:0");
	});
	it("holds an ambiguous reservation across days, resolution, and locale changes", async () => {
		// Arrange
		const fixture = reconciliationFixture();
		const notification = {
			...fixture.notification,
			post: async () => ({ outcome: "uncertain" as const }),
		};
		const initial = new ReconcileAttention(
			{
				attentionPolicy: new CommunicationDomainComposition().attentionPolicy(),
				attentionEpisodes:
					new CommunicationDomainComposition().attentionEpisodes(),
			},
			fixture.repository,
			notification,
			{
				now: () => new Date("2099-06-01T10:00:00Z"),
			},
		);

		// Act
		await initial.execute(observation());
		fixture.time("2099-06-05T10:00:00Z");
		fixture.notification.fingerprint.mockReturnValue("new-language");
		const result = await fixture.useCase.execute(
			observation({ conditions: [] }),
		);

		// Assert
		expect(result.notificationFailed).toBe(true);
		expect(fixture.notification.post).not.toHaveBeenCalled();
		expect(fixture.state()?.post?.status).toBe("pending");
	});
	it("does not post when reservation persistence fails", async () => {
		// Arrange
		const fixture = reconciliationFixture();
		fixture.repository.save
			.mockImplementationOnce(async () => {})
			.mockRejectedValueOnce(new Error("private provider error"));

		// Act
		const operation = fixture.useCase.execute(observation());

		// Assert
		await expect(operation).rejects.toThrow("private provider error");
		expect(fixture.notification.post).not.toHaveBeenCalled();
	});
	it("holds the durable reservation when acknowledgement persistence fails", async () => {
		// Arrange
		const fixture = reconciliationFixture();
		const persist = fixture.repository.save.getMockImplementation();
		fixture.repository.save.mockImplementation(async (state) => {
			if (state.post?.status === "accepted")
				throw new Error("write unavailable");
			await persist?.(state);
		});

		// Act
		const operation = fixture.useCase.execute(observation());

		// Assert
		await expect(operation).rejects.toThrow("write unavailable");
		expect(fixture.state()?.post?.status).toBe("pending");
		expect(fixture.notification.post).toHaveBeenCalledTimes(1);
	});
	it("retries definitive nonacceptance only after the provider backoff", async () => {
		// Arrange
		const fixture = reconciliationFixture();
		const initial = new ReconcileAttention(
			{
				attentionPolicy: new CommunicationDomainComposition().attentionPolicy(),
				attentionEpisodes:
					new CommunicationDomainComposition().attentionEpisodes(),
			},
			fixture.repository,
			{
				...fixture.notification,
				post: async () => ({
					outcome: "retry" as const,
					retryAfterSeconds: 600,
				}),
			},
			{ now: () => new Date("2099-06-01T10:00:00Z") },
		);

		// Act
		await initial.execute(observation());
		fixture.time("2099-06-01T10:05:00Z");
		await fixture.useCase.execute(observation());
		const before = fixture.notification.post.mock.calls.length;
		fixture.time("2099-06-01T10:10:00Z");
		await fixture.useCase.execute(observation());

		// Assert
		expect(before).toBe(0);
		expect(fixture.notification.post).toHaveBeenCalledTimes(1);
	});
	it("keeps a failed known-message update retryable without another post", async () => {
		// Arrange
		const fixture = reconciliationFixture();
		fixture.notification.update.mockResolvedValueOnce(false);

		// Act
		await fixture.useCase.execute(observation());
		const failed = await fixture.useCase.execute(
			observation({ conditions: [] }),
		);
		const retried = await fixture.useCase.execute(
			observation({ conditions: [] }),
		);

		// Assert
		expect(failed.notificationFailed).toBe(true);
		expect(retried.notificationFailed).toBe(false);
		expect(fixture.notification.post).toHaveBeenCalledTimes(1);
		expect(fixture.notification.update).toHaveBeenCalledTimes(2);
	});
});
