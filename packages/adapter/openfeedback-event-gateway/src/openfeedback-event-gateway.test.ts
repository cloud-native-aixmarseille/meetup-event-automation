import { afterEach, describe, expect, it, vi } from "vitest";
import { OpenFeedbackEventGateway } from "./openfeedback-event-gateway.js";
import { agenda } from "../testing/feedback-agenda.fixtures.js";

const apiKey = "oforg_synthetic-key";
const input = {
	key: "demo/community#42",
	name: "Cloud meetup in October",
	scheduleUrl: "https://github.com/demo/community/issues/42",
};
const eventId =
	"meetup-fba675e31b0177edf4b9b1070012a46bdc5ac1582929a3bc0c45b9e9dfd719e6";

afterEach(() => vi.restoreAllMocks());

describe("OpenFeedback event creation", () => {
	it("populates a newly created event before returning its public URL", async () => {
		// Arrange
		const fetcher = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(Response.json({ id: eventId }, { status: 201 }))
			.mockResolvedValueOnce(
				Response.json({ id: eventId, speakers: [], nextCursor: null }),
			)
			.mockResolvedValueOnce(
				Response.json({ id: eventId, talks: [], nextCursor: null }),
			)
			.mockImplementation(async (_, options) =>
				Response.json(
					{ id: JSON.parse(options?.body as string).id },
					{ status: 201 },
				),
			);
		const gateway = OpenFeedbackEventGateway.create(apiKey, fetcher);

		// Act
		const result = await gateway.ensureEvent({ ...input, agenda });
		const speaker = JSON.parse(fetcher.mock.calls[3][1]?.body as string);
		const talk = JSON.parse(fetcher.mock.calls[4][1]?.body as string);

		// Assert
		expect(result).toBe(`https://openfeedback.io/${eventId}`);
		expect(
			fetcher.mock.calls.map(([url, options]) => [url, options?.method]),
		).toEqual([
			["https://api.openfeedback.io/events/", "POST"],
			[
				`https://api.openfeedback.io/events/${eventId}/speakers?limit=100`,
				"GET",
			],
			[`https://api.openfeedback.io/events/${eventId}/talks?limit=100`, "GET"],
			[`https://api.openfeedback.io/events/${eventId}/speakers`, "POST"],
			[`https://api.openfeedback.io/events/${eventId}/talks`, "POST"],
		]);
		expect(talk.title).toBe("Reliable platforms");
		expect(talk.speakers).toEqual([speaker.id]);
	});

	it("does not return a new feedback URL when agenda publication fails", async () => {
		// Arrange
		const fetcher = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(Response.json({ id: eventId }, { status: 201 }))
			.mockResolvedValueOnce(new Response("private response", { status: 404 }));
		const gateway = OpenFeedbackEventGateway.create(apiKey, fetcher);

		// Act
		const operation = gateway.ensureEvent({ ...input, agenda });

		// Assert
		await expect(operation).rejects.toThrow(
			"OpenFeedback request failed (HTTP 404)",
		);
		expect(fetcher).toHaveBeenCalledTimes(2);
	});
	it.each([
		"https://openfeedback.io/existing-event",
		"https://openfeedback.io/existing-event/2030-09-30",
		"https://openfeedback.io/existing-event/0",
	])("updates the existing event in place from %s", async (url) => {
		// Arrange
		const fetcher = vi
			.fn<typeof fetch>()
			.mockResolvedValue(Response.json({ id: "existing-event" }));
		const gateway = OpenFeedbackEventGateway.create(apiKey, fetcher);
		const revised = { ...input, name: "Revised meetup title", url };

		// Act
		const result = await gateway.ensureEvent(revised);
		const body = JSON.parse(fetcher.mock.calls[0][1]?.body as string);

		// Assert
		expect(result).toBe(url);
		expect(fetcher).toHaveBeenCalledExactlyOnceWith(
			"https://api.openfeedback.io/events/existing-event",
			expect.objectContaining({ method: "PATCH", redirect: "error" }),
		);
		expect(body).toEqual({
			name: revised.name,
			scheduleLink: revised.scheduleUrl,
		});
	});

	it.each([401, 403, 404, 409])(
		"never replaces an existing event when its update fails (HTTP %s)",
		async (status) => {
			// Arrange
			const fetcher = vi
				.fn<typeof fetch>()
				.mockResolvedValue(
					new Response(`private-response ${apiKey}`, { status }),
				);
			const gateway = OpenFeedbackEventGateway.create(apiKey, fetcher);

			// Act
			const operation = gateway.ensureEvent({
				...input,
				url: "https://openfeedback.io/existing-event",
			});

			// Assert
			await expect(operation).rejects.toThrow(
				`OpenFeedback request failed (HTTP ${status})`,
			);
			expect(fetcher).toHaveBeenCalledOnce();
		},
	);

	it.each([
		"https://example.test/poll",
		"https://openfeedback.io/poll?private=secret",
	])(
		"rejects an invalid existing event URL before requests: %s",
		async (url) => {
			// Arrange
			const fetcher = vi.fn<typeof fetch>();
			const gateway = OpenFeedbackEventGateway.create(apiKey, fetcher);

			// Act
			const operation = gateway.ensureEvent({ ...input, url });

			// Assert
			await expect(operation).rejects.toThrow(
				"Feedback link must be an OpenFeedback event URL",
			);
			expect(fetcher).not.toHaveBeenCalled();
		},
	);

	it.each(["", "   ", "ofproj_synthetic-key", "oforg_", "oforg_ "])(
		"rejects a missing or non-organization API key (%j)",
		(key) => {
			// Arrange
			const fetcher = vi.fn<typeof fetch>();

			// Act
			const createGateway = () => OpenFeedbackEventGateway.create(key, fetcher);

			// Assert
			expect(createGateway).toThrow(
				"An OpenFeedback organization API key is required",
			);
			expect(fetcher).not.toHaveBeenCalled();
		},
	);

	it.each([
		{ key: "" },
		{ key: "   " },
		{ name: "" },
		{ name: "   " },
		{ name: "x".repeat(101) },
	])("rejects invalid event identity or name (%j)", async (changes) => {
		// Arrange
		const fetcher = vi.fn<typeof fetch>();
		const gateway = OpenFeedbackEventGateway.create(apiKey, fetcher);

		// Act
		const operation = gateway.ensureEvent({ ...input, ...changes });

		// Assert
		await expect(operation).rejects.toThrow(
			"Invalid OpenFeedback event identity or name",
		);
		expect(fetcher).not.toHaveBeenCalled();
	});

	it.each([
		"",
		"not a URL",
		"http://github.com/demo/community/issues/42",
		"https://user:password@github.com/demo/community/issues/42",
	])("rejects an invalid schedule URL (%j)", async (scheduleUrl) => {
		// Arrange
		const fetcher = vi.fn<typeof fetch>();
		const gateway = OpenFeedbackEventGateway.create(apiKey, fetcher);

		// Act
		const operation = gateway.ensureEvent({ ...input, scheduleUrl });

		// Assert
		await expect(operation).rejects.toThrow(
			"Invalid OpenFeedback event schedule URL",
		);
		expect(fetcher).not.toHaveBeenCalled();
	});

	it("creates a deterministic event while inheriting organization settings", async () => {
		// Arrange
		const fetcher = vi
			.fn<typeof fetch>()
			.mockResolvedValue(Response.json({ id: eventId }, { status: 201 }));
		const gateway = OpenFeedbackEventGateway.create(apiKey, fetcher);

		// Act
		const result = await gateway.ensureEvent(input);
		const body = JSON.parse(fetcher.mock.calls[0][1]?.body as string);

		// Assert
		expect(result).toBe(`https://openfeedback.io/${eventId}`);
		expect(fetcher).toHaveBeenCalledExactlyOnceWith(
			"https://api.openfeedback.io/events/",
			expect.objectContaining({
				method: "POST",
				redirect: "error",
				signal: expect.any(AbortSignal),
				headers: {
					"x-api-key": apiKey,
					"Content-Type": "application/json",
				},
			}),
		);
		expect(body).toEqual({
			id: eventId,
			name: input.name,
			scheduleLink: input.scheduleUrl,
			setupType: "openfeedbackv1",
		});
	});

	it("reuses the event identity after metadata changes and updates only its name and schedule", async () => {
		// Arrange
		const fetcher = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(Response.json({ id: eventId }, { status: 201 }))
			.mockResolvedValueOnce(new Response("already exists", { status: 409 }))
			.mockResolvedValueOnce(Response.json({ id: eventId }));
		const gateway = OpenFeedbackEventGateway.create(apiKey, fetcher);
		const revised = { ...input, name: "Revised meetup title" };

		// Act
		const first = await gateway.ensureEvent(input);
		const second = await gateway.ensureEvent(revised);
		const creation = JSON.parse(fetcher.mock.calls[1][1]?.body as string);
		const update = JSON.parse(fetcher.mock.calls[2][1]?.body as string);

		// Assert
		expect(second).toBe(first);
		expect(creation.id).toBe(eventId);
		expect(fetcher).toHaveBeenCalledTimes(3);
		expect(fetcher.mock.calls[2]).toEqual([
			`https://api.openfeedback.io/events/${eventId}`,
			expect.objectContaining({
				method: "PATCH",
				redirect: "error",
				headers: {
					"x-api-key": apiKey,
					"Content-Type": "application/json",
				},
			}),
		]);
		expect(update).toEqual({
			name: revised.name,
			scheduleLink: revised.scheduleUrl,
		});
	});

	it("recovers the same event after the creation response is lost", async () => {
		// Arrange
		const fetcher = vi
			.fn<typeof fetch>()
			.mockRejectedValueOnce(new Error("Connection lost after creation"))
			.mockResolvedValueOnce(new Response("exists", { status: 409 }))
			.mockResolvedValueOnce(Response.json({ id: eventId }));
		const gateway = OpenFeedbackEventGateway.create(apiKey, fetcher);

		// Act
		const firstError = await gateway
			.ensureEvent(input)
			.catch((error: unknown) => error);
		const recovered = await gateway.ensureEvent(input);
		const originalBody = JSON.parse(fetcher.mock.calls[0][1]?.body as string);
		const retriedBody = JSON.parse(fetcher.mock.calls[1][1]?.body as string);

		// Assert
		expect(firstError).toMatchObject({
			message: "OpenFeedback request failed",
		});
		expect(recovered).toBe(`https://openfeedback.io/${eventId}`);
		expect(retriedBody.id).toBe(originalBody.id);
		expect(fetcher.mock.calls[2][0]).toBe(
			`https://api.openfeedback.io/events/${eventId}`,
		);
		expect(fetcher.mock.calls[2][1]?.method).toBe("PATCH");
	});

	it("gives different event keys different identities", async () => {
		// Arrange
		const otherId =
			"meetup-5b2ba1a4031dd03cda721bac81182a8f4033364a55d5f5d1bbcd6b2007991750";
		const fetcher = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(Response.json({ id: eventId }, { status: 201 }))
			.mockResolvedValueOnce(Response.json({ id: otherId }, { status: 201 }));
		const gateway = OpenFeedbackEventGateway.create(apiKey, fetcher);

		// Act
		const first = await gateway.ensureEvent(input);
		const second = await gateway.ensureEvent({
			...input,
			key: "demo/community#43",
		});

		// Assert
		expect(first).toBe(`https://openfeedback.io/${eventId}`);
		expect(second).toBe(`https://openfeedback.io/${otherId}`);
	});

	it.each([401, 403, 404])(
		"does not recover a conflicting event without authorized access (HTTP %s)",
		async (status) => {
			// Arrange
			const fetcher = vi
				.fn<typeof fetch>()
				.mockResolvedValueOnce(new Response("exists", { status: 409 }))
				.mockResolvedValueOnce(
					new Response(`private-response ${apiKey}`, { status }),
				);
			const gateway = OpenFeedbackEventGateway.create(apiKey, fetcher);

			// Act
			const operation = gateway.ensureEvent(input);

			// Assert
			await expect(operation).rejects.toThrow(
				`OpenFeedback request failed (HTTP ${status})`,
			);
			expect(fetcher).toHaveBeenCalledTimes(2);
		},
	);

	it.each([400, 401, 403, 429, 500])(
		"redacts failed creation responses without retrying (HTTP %s)",
		async (status) => {
			// Arrange
			const fetcher = vi
				.fn<typeof fetch>()
				.mockResolvedValue(
					new Response(`private-response ${apiKey}`, { status }),
				);
			const gateway = OpenFeedbackEventGateway.create(apiKey, fetcher);

			// Act
			const operation = gateway.ensureEvent(input);

			// Assert
			await expect(operation).rejects.toThrow(
				`OpenFeedback request failed (HTTP ${status})`,
			);
			expect(fetcher).toHaveBeenCalledOnce();
		},
	);

	it.each([null, [], "private-response", {}, { id: "other-event" }])(
		"rejects an unexpected event response (%j)",
		async (body) => {
			// Arrange
			const fetcher = vi
				.fn<typeof fetch>()
				.mockResolvedValue(Response.json(body));
			const gateway = OpenFeedbackEventGateway.create(apiKey, fetcher);

			// Act
			const operation = gateway.ensureEvent(input);

			// Assert
			await expect(operation).rejects.toThrow(
				"OpenFeedback returned an unexpected resource",
			);
		},
	);

	it("rejects recovery responses for a different event", async () => {
		// Arrange
		const fetcher = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(new Response("exists", { status: 409 }))
			.mockResolvedValueOnce(Response.json({ id: "other-event" }));
		const gateway = OpenFeedbackEventGateway.create(apiKey, fetcher);

		// Act
		const operation = gateway.ensureEvent(input);

		// Assert
		await expect(operation).rejects.toThrow(
			"OpenFeedback returned an unexpected resource",
		);
	});

	it("redacts malformed JSON responses", async () => {
		// Arrange
		const fetcher = vi
			.fn<typeof fetch>()
			.mockResolvedValue(new Response(`private-response ${apiKey}`));
		const gateway = OpenFeedbackEventGateway.create(apiKey, fetcher);

		// Act
		const operation = gateway.ensureEvent(input);

		// Assert
		await expect(operation).rejects.toThrow(
			"Invalid OpenFeedback JSON response",
		);
	});

	it("redacts network errors", async () => {
		// Arrange
		const fetcher = vi
			.fn<typeof fetch>()
			.mockRejectedValue(new Error(`private-response ${apiKey}`));
		const gateway = OpenFeedbackEventGateway.create(apiKey, fetcher);

		// Act
		const operation = gateway.ensureEvent(input);

		// Assert
		await expect(operation).rejects.toThrow(/^OpenFeedback request failed$/);
	});

	it("bounds requests to thirty seconds and redacts timeout errors", async () => {
		// Arrange
		const signal = AbortSignal.abort(new Error(`private-response ${apiKey}`));
		const timeout = vi.spyOn(AbortSignal, "timeout").mockReturnValue(signal);
		const fetcher = vi
			.fn<typeof fetch>()
			.mockImplementation(async (_, init) => {
				init?.signal?.throwIfAborted();
				return Response.json({ id: eventId });
			});
		const gateway = OpenFeedbackEventGateway.create(apiKey, fetcher);

		// Act
		const operation = gateway.ensureEvent(input);

		// Assert
		await expect(operation).rejects.toThrow(/^OpenFeedback request failed$/);
		expect(timeout).toHaveBeenCalledExactlyOnceWith(30_000);
		expect(fetcher.mock.calls[0][1]?.signal).toBe(signal);
	});
});
