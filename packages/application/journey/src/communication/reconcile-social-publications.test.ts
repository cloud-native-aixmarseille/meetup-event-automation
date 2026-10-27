import { describe, expect, it } from "vitest";
import { identity } from "../../testing/meetup-journey.fixtures.js";
import { socialFixture } from "../../testing/social-publication.fixtures.js";

describe("social publication reconciliation", () => {
	it("reserves before sending and never resends an accepted occurrence", async () => {
		// Arrange
		const f = await socialFixture();
		let reserved = false;
		const publish = f.publish;
		f.posts.publish.mockImplementation(async (input, guard) => {
			reserved =
				[...f.records.values()][0]?.attempts.at(-1)?.status === "reserved";
			return await publish(input, guard);
		});

		// Act
		const first = await f.useCase.execute(identity);
		const second = await f.useCase.execute(identity);

		// Assert
		expect(first.publications[0].status).toBe("published");
		expect(second.publications[0].status).toBe("complete");
		expect(reserved).toBe(true);
		expect(f.posts.publish).toHaveBeenCalledTimes(1);
	});
	it.each(["pending", "rejected"] as const)(
		"waits for separate %s publication approval",
		async (status) => {
			// Arrange
			const f = await socialFixture();
			f.dependencies.approvals.request.mockResolvedValue({
				status,
				notificationFailed: false,
			});

			// Act
			const result = await f.useCase.execute(identity);

			// Assert
			expect(result.publications[0].status).toBe(
				status === "pending" ? "pending" : "blocked",
			);
			expect(result.diagnostics[0].field).toBe(
				"social.slack-engineering.announcement",
			);
			expect(f.posts.publish).not.toHaveBeenCalled();
		},
	);
	it.each([
		"unreviewed",
		"stale-source",
		"revoked",
		"inactive",
		"unconfirmed",
		"changed-destination",
	])("blocks %s content", async (scenario) => {
		// Arrange
		const f = await socialFixture();
		if (scenario === "unreviewed")
			await f.store.save(await f.store.load(), [
				{ ...f.proposal, decision: null },
			]);
		if (scenario === "stale-source")
			f.state.context = {
				...f.context,
				plan: { ...f.plan, sourceFingerprint: "changed" },
			};
		if (scenario === "revoked")
			f.dependencies.canApprove.mockResolvedValue(false);
		if (scenario === "inactive") f.state.context = undefined;
		if (scenario === "unconfirmed")
			f.state.context = {
				...f.context,
				event: {
					...f.context.event,
					confirmations: { host: false, speakers: true },
				},
			};
		if (scenario === "changed-destination")
			f.state.destinations = f.state.destinations.map((item) =>
				item.provider === "slack" ? { ...item, channelId: "CCHANGED" } : item,
			);

		// Act
		const result = await f.useCase.execute(identity);

		// Assert
		expect(result.publications[0].status).toBe("blocked");
		expect(f.posts.publish).not.toHaveBeenCalled();
	});
	it("retains an uncertain reservation after a crash and requires recovery", async () => {
		// Arrange
		const f = await socialFixture();
		f.posts.publish.mockRejectedValue(new Error("Connection interrupted"));

		// Act
		const first = await f.useCase.execute(identity);
		const second = await f.useCase.execute(identity);

		// Assert
		expect(first.publications[0].status).toBe("uncertain");
		expect(second.publications[0].status).toBe("uncertain");
		expect(first.diagnostics[0].code).toBe(
			"communication.social.evaluation-failed",
		);
		expect(second.diagnostics[0].code).toBe("communication.social.uncertain");
		expect(f.posts.publish).toHaveBeenCalledTimes(1);
	});
	it("blocks replay if a retained proposal loses its journal", async () => {
		// Arrange
		const f = await socialFixture();

		// Act
		await f.useCase.execute(identity);
		f.records.clear();
		const result = await f.useCase.execute(identity);

		// Assert
		expect(result.publications[0].status).toBe("uncertain");
		expect(f.posts.publish).toHaveBeenCalledTimes(1);
	});
	it("preserves manual completion even if its checkbox is later cleared", async () => {
		// Arrange
		const f = await socialFixture();
		const context = f.context;
		f.state.context = {
			...context,
			event: {
				...context.event,
				operationalChecklists: {
					...context.event.operationalChecklists,
					communication: [
						...context.event.operationalChecklists.communication,
						{ name: "Engineering", completed: true },
					],
				},
			},
		};

		// Act
		const first = await f.useCase.execute(identity);
		f.state.context = context;
		const second = await f.useCase.execute(identity);

		// Assert
		expect(first.publications[0].status).toBe("manual");
		expect(second.publications[0].status).toBe("manual");
		expect(f.posts.publish).not.toHaveBeenCalled();
	});
	it("rechecks source immediately before the provider write", async () => {
		// Arrange
		const f = await socialFixture();
		let writes = 0;
		f.posts.publish.mockImplementation(async (_input, guard) => {
			f.state.context = undefined;
			await guard();
			writes++;
			throw new Error("Unexpected write");
		});

		// Act
		const result = await f.useCase.execute(identity);

		// Assert
		expect(result.publications[0].status).toBe("blocked");
		expect(writes).toBe(0);
		expect([...f.records.values()][0].attempts.at(-1)?.status).toBe("stale");
	});
	it("re-publishes a stale reservation after a new reviewed revision", async () => {
		// Arrange
		const f = await socialFixture();
		f.posts.publish.mockImplementationOnce(async (_input, guard) => {
			f.state.context = undefined;
			await guard();
			throw new Error("Pre-write staleness must not send");
		});

		// Act: a source change before the write leaves the reservation stale, then a
		// re-reviewed revision restores the source and publishes without recovery.
		const first = await f.useCase.execute(identity);
		f.state.context = f.context;
		await f.store.save(await f.store.load(), [
			{ ...f.proposal, revision: `${f.proposal.revision}-reviewed` },
		]);
		const second = await f.useCase.execute(identity);
		const record = [...f.records.values()][0];

		// Assert
		expect(first.publications[0].status).toBe("blocked");
		expect(second.publications[0].status).toBe("published");
		expect(record.attempts[0].status).toBe("stale");
		expect(record.attempts.at(-1)?.status).toBe("accepted");
		expect(record.attempts).toHaveLength(2);
	});
	it("keeps a stale reservation blocked without resending until re-review", async () => {
		// Arrange
		const f = await socialFixture();
		f.posts.publish.mockImplementationOnce(async (_input, guard) => {
			f.state.context = undefined;
			await guard();
			throw new Error("Pre-write staleness must not send");
		});

		// Act: same reviewed revision across runs must not reserve or resend again.
		const first = await f.useCase.execute(identity);
		f.state.context = f.context;
		const second = await f.useCase.execute(identity);
		const record = [...f.records.values()][0];

		// Assert
		expect(first.publications[0].status).toBe("blocked");
		expect(second.publications[0].status).toBe("blocked");
		expect(record.attempts).toHaveLength(1);
		expect(f.posts.publish).toHaveBeenCalledTimes(1);
	});
	it("does not let one ambiguous destination resend another successful one", async () => {
		// Arrange
		const f = await socialFixture();
		const destination = {
			...f.destination,
			key: "slack-second",
			channelId: "CSECOND",
		};
		const plan = f.plans.create(
			"slack-second:announcement",
			"fr",
			f.plan.facts,
			"09:00",
			destination,
		);
		const proposal = { ...f.proposal, id: "second", plan };
		f.state.destinations = [...f.state.destinations, destination];
		f.dependencies.gateways.set("slack-second", {
			posts: f.posts,
			images: f.images,
		});
		const publish = f.publish;
		f.posts.publish.mockImplementation(async (input, guard) =>
			input.destination.key === "slack-second"
				? { status: "uncertain", code: "timeout" }
				: await publish(input, guard),
		);
		f.dependencies.workspace.read.mockImplementation(
			async (_identity, target) => ({
				...f.context,
				plan: target === plan.target ? plan : f.plan,
			}),
		);
		await f.store.save(await f.store.load(), [f.proposal, proposal]);

		// Act
		const first = await f.useCase.execute(identity);
		const second = await f.useCase.execute(identity);

		// Assert
		expect(first.publications.map((item) => item.status)).toEqual([
			"published",
			"uncertain",
		]);
		expect(second.publications.map((item) => item.status)).toEqual([
			"complete",
			"uncertain",
		]);
		expect(f.posts.publish).toHaveBeenCalledTimes(2);
	});
});

describe("scheduled social publication", () => {
	it.each([
		["2026-10-21T06:59:59Z", "scheduled", 0],
		["2026-10-21T07:00:00Z", "published", 1],
		["2026-10-21T21:59:59Z", "published", 1],
		["2026-10-21T22:00:00Z", "expired", 0],
	] as const)(
		"evaluates reminder eligibility at %s",
		async (now, status, sends) => {
			// Arrange
			const f = await socialFixture("slack-engineering:d7");
			f.state.now = now;

			// Act
			const result = await f.useCase.execute(identity);

			// Assert
			expect(result.publications[0].status).toBe(status);
			expect(f.posts.publish).toHaveBeenCalledTimes(sends);
		},
	);
	it("honors Retry-After without making another attempt early", async () => {
		// Arrange
		const f = await socialFixture();
		f.posts.publish.mockResolvedValueOnce({
			status: "deferred",
			code: "rate-limit",
			retryAfterSeconds: 120,
		});

		// Act
		const first = await f.useCase.execute(identity);
		f.state.now = "2026-10-20T12:01:59Z";
		const early = await f.useCase.execute(identity);
		const earlyCalls = f.posts.publish.mock.calls.length;
		f.state.now = "2026-10-20T12:02:00Z";
		const due = await f.useCase.execute(identity);

		// Assert
		expect([
			first.publications[0].status,
			early.publications[0].status,
			due.publications[0].status,
		]).toEqual(["scheduled", "scheduled", "published"]);
		expect(earlyCalls).toBe(1);
		expect(f.posts.publish).toHaveBeenCalledTimes(2);
	});
	it("stops bounded automatic retry after ten definitive deferrals", async () => {
		// Arrange
		const f = await socialFixture();
		f.posts.publish.mockResolvedValue({
			status: "deferred",
			code: "rate-limit",
			retryAfterSeconds: 60,
		});

		// Act
		for (let minute = 0; minute < 10; minute++) {
			f.state.now = `2026-10-20T12:0${minute}:00Z`;
			await f.useCase.execute(identity);
		}
		f.state.now = "2026-10-20T12:10:00Z";
		const result = await f.useCase.execute(identity);

		// Assert
		expect(result.publications[0].status).toBe("blocked");
		expect(f.posts.publish).toHaveBeenCalledTimes(10);
	});
	it("ignores a destination removed from the allowlist", async () => {
		// Arrange
		const f = await socialFixture();
		f.state.destinations = [];

		// Act
		const result = await f.useCase.execute(identity);

		// Assert
		expect(result.publications).toEqual([]);
		expect(f.posts.publish).not.toHaveBeenCalled();
	});
});

describe("social persistence failures", () => {
	it("retains the reservation when provider success cannot be recorded", async () => {
		// Arrange
		const f = await socialFixture();
		const save = f.journal.save.getMockImplementation();
		if (!save) throw new Error("Fixture journal unavailable");
		f.journal.save.mockImplementation(async (previous, next) => {
			if (next.attempts.at(-1)?.status === "accepted")
				throw new Error("private provider detail");
			await save(previous, next);
		});

		// Act
		const first = await f.useCase.execute(identity);
		const second = await f.useCase.execute(identity);

		// Assert
		expect(first.diagnostics[0].code).toBe(
			"communication.social.evaluation-failed",
		);
		expect(second.publications[0].status).toBe("uncertain");
		expect(JSON.stringify(first)).not.toContain("private provider detail");
		expect(f.posts.publish).toHaveBeenCalledTimes(1);
	});
	it("does not call a provider when the journal cannot reserve work", async () => {
		// Arrange
		const f = await socialFixture();
		f.journal.save.mockRejectedValue(new Error("Storage unavailable"));

		// Act
		const result = await f.useCase.execute(identity);

		// Assert
		expect(result.diagnostics[0]).toMatchObject({
			code: "communication.social.evaluation-failed",
			severity: "error",
		});
		expect(f.posts.publish).not.toHaveBeenCalled();
	});
});
