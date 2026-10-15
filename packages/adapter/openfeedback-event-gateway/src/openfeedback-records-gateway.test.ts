import { describe, expect, it, vi } from "vitest";
import {
	revision,
	snapshot,
	speakerPage,
	storedSnapshot,
} from "../testing/feedback-agenda.fixtures.js";
import { OpenFeedbackClient } from "./openfeedback-client.js";
import { OpenFeedbackRecordsGateway } from "./openfeedback-records-gateway.js";

describe("OpenFeedback resource operations", () => {
	it("follows list cursors and retains record revisions", async () => {
		// Arrange
		const first = { id: "speaker-a", name: "Alex Example", revision };
		const second = { id: "speaker-b", name: "Sam Example", revision };
		const fetcher = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(
				Response.json({
					...speakerPage,
					speakers: [first],
					nextCursor: first.id,
				}),
			)
			.mockResolvedValueOnce(
				Response.json({ ...speakerPage, speakers: [second] }),
			);
		const gateway = new OpenFeedbackRecordsGateway(
			new OpenFeedbackClient("oforg_synthetic", fetcher),
		);

		// Act
		const records = await gateway.list("event-1", "speakers");

		// Assert
		expect(records).toEqual([first, second]);
		expect(fetcher.mock.calls[1][0]).toBe(
			"https://api.openfeedback.io/events/event-1/speakers?limit=100&after=speaker-a",
		);
	});

	it.each([
		{ speakers: null },
		{ nextCursor: undefined },
		{ nextCursor: "bad/id" },
		{ nextCursor: "__reserved__" },
		{ speakers: [], nextCursor: "speaker-a" },
		{ nextCursor: "different-id" },
	])("rejects malformed pages or cursors: %j", async (changes) => {
		// Arrange
		const fetcher = vi
			.fn<typeof fetch>()
			.mockResolvedValue(Response.json({ ...speakerPage, ...changes }));
		const gateway = new OpenFeedbackRecordsGateway(
			new OpenFeedbackClient("oforg_synthetic", fetcher),
		);

		// Act
		const operation = gateway.list("event-1", "speakers");

		// Assert
		await expect(operation).rejects.toThrow("Invalid OpenFeedback");
		expect(fetcher).toHaveBeenCalledOnce();
	});

	it("stops when a page repeats its cursor", async () => {
		// Arrange
		const page = { ...speakerPage, nextCursor: speakerPage.speakers[0].id };
		const fetcher = vi
			.fn<typeof fetch>()
			.mockImplementation(async () => Response.json(page));
		const gateway = new OpenFeedbackRecordsGateway(
			new OpenFeedbackClient("oforg_synthetic", fetcher),
		);

		// Act
		const operation = gateway.list("event-1", "speakers");

		// Assert
		await expect(operation).rejects.toThrow(
			"Invalid OpenFeedback pagination cursor",
		);
		expect(fetcher).toHaveBeenCalledTimes(2);
	});

	it("bounds the number of records loaded for synchronization", async () => {
		// Arrange
		const first = Array.from({ length: 100 }, (_, index) => ({
			id: `speaker-${index}`,
			name: "Example",
			revision,
		}));
		const second = Array.from({ length: 100 }, (_, index) => ({
			id: `speaker-${index + 100}`,
			name: "Example",
			revision,
		}));
		const fetcher = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(
				Response.json({
					...speakerPage,
					speakers: first,
					nextCursor: first[99].id,
				}),
			)
			.mockResolvedValueOnce(
				Response.json({
					...speakerPage,
					speakers: second,
					nextCursor: second[99].id,
				}),
			);
		const gateway = new OpenFeedbackRecordsGateway(
			new OpenFeedbackClient("oforg_synthetic", fetcher),
		);

		// Act
		const operation = gateway.list("event-1", "speakers");

		// Assert
		await expect(operation).rejects.toThrow("synchronization limits");
		expect(fetcher).toHaveBeenCalledTimes(2);
	});

	it("creates missing speakers using caller-supplied stable IDs", async () => {
		// Arrange
		const record = snapshot.speakers[0];
		const fetcher = vi
			.fn<typeof fetch>()
			.mockResolvedValue(Response.json({ id: record.id }, { status: 201 }));
		const gateway = new OpenFeedbackRecordsGateway(
			new OpenFeedbackClient("oforg_synthetic", fetcher),
		);

		// Act
		await gateway.synchronize("event-1", "speakers", record, undefined);

		// Assert
		expect(fetcher).toHaveBeenCalledExactlyOnceWith(
			"https://api.openfeedback.io/events/event-1/speakers",
			expect.objectContaining({ method: "POST", body: JSON.stringify(record) }),
		);
	});

	it("patches an existing speaker with its read revision", async () => {
		// Arrange
		const record = { ...snapshot.speakers[0], name: "Alex Renamed" };
		const fetcher = vi
			.fn<typeof fetch>()
			.mockResolvedValue(Response.json({ id: record.id }));
		const gateway = new OpenFeedbackRecordsGateway(
			new OpenFeedbackClient("oforg_synthetic", fetcher),
		);

		// Act
		await gateway.synchronize(
			"event-1",
			"speakers",
			record,
			storedSnapshot.speakers[0],
		);

		// Assert
		expect(fetcher).toHaveBeenCalledExactlyOnceWith(
			`https://api.openfeedback.io/events/event-1/speakers/${record.id}`,
			expect.objectContaining({
				method: "PATCH",
				body: JSON.stringify({ name: "Alex Renamed", revision }),
			}),
		);
	});

	it("does not write unchanged records", async () => {
		// Arrange
		const fetcher = vi.fn<typeof fetch>();
		const gateway = new OpenFeedbackRecordsGateway(
			new OpenFeedbackClient("oforg_synthetic", fetcher),
		);

		// Act
		await gateway.synchronize(
			"event-1",
			"speakers",
			snapshot.speakers[0],
			storedSnapshot.speakers[0],
		);

		// Assert
		expect(fetcher).not.toHaveBeenCalled();
	});

	it.each([401, 404, 409, 500])(
		"does not automatically retry rejected changes: HTTP %s",
		async (status) => {
			// Arrange
			const fetcher = vi
				.fn<typeof fetch>()
				.mockResolvedValue(
					new Response("private provider details", { status }),
				);
			const gateway = new OpenFeedbackRecordsGateway(
				new OpenFeedbackClient("oforg_synthetic", fetcher),
			);
			const record = { ...snapshot.speakers[0], name: "Edited" };

			// Act
			const operation = gateway.synchronize(
				"event-1",
				"speakers",
				record,
				storedSnapshot.speakers[0],
			);

			// Assert
			await expect(operation).rejects.toThrow(
				`OpenFeedback request failed (HTTP ${status})`,
			);
			expect(fetcher).toHaveBeenCalledOnce();
		},
	);
});
