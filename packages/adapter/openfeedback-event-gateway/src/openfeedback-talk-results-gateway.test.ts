import { describe, expect, it, vi } from "vitest";
import { FeedbackResolutionError } from "@meetup-automation/publication";
import {
	agenda,
	speakerPage,
	talkPage,
} from "../testing/feedback-agenda.fixtures.js";
import { OpenFeedbackTalkResultsGateway } from "./openfeedback-talk-results-gateway.js";

const input = {
	key: "example/meetups#12",
	url: "https://openfeedback.io/event-1",
	agenda,
};

describe("OpenFeedback talk results", () => {
	it.each(["", "/2030-09-30", "/0", "/"])(
		"resolves stored talk identities from an event URL ending in %s",
		async (suffix) => {
			// Arrange
			const fetcher = vi
				.fn<typeof fetch>()
				.mockResolvedValueOnce(Response.json(speakerPage))
				.mockResolvedValueOnce(Response.json(talkPage));
			const gateway = new OpenFeedbackTalkResultsGateway(
				"oforg_synthetic",
				fetcher,
			);

			// Act
			const results = await gateway.resolve({
				...input,
				url: input.url + suffix,
			});

			// Assert
			expect(results).toEqual([
				{
					title: "Reliable platforms",
					url: "https://openfeedback.io/event-1/0/manual-talk?displayVotes=true",
					speakerIds: ["speaker-0001"],
				},
			]);
			expect(
				fetcher.mock.calls.map(([url, options]) => [url, options?.method]),
			).toEqual([
				[
					"https://api.openfeedback.io/events/event-1/speakers?limit=100",
					"GET",
				],
				["https://api.openfeedback.io/events/event-1/talks?limit=100", "GET"],
			]);
		},
	);

	it("preserves an imported talk ID after a title change and encodes it as one path segment", async () => {
		// Arrange
		const id = "session:Platforms #1";
		const fetcher = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(Response.json(speakerPage))
			.mockResolvedValueOnce(
				Response.json({
					...talkPage,
					talks: talkPage.talks.map((talk) => ({
						...talk,
						id,
						title: "Previous title",
					})),
				}),
			);
		const gateway = new OpenFeedbackTalkResultsGateway(
			"oforg_synthetic",
			fetcher,
		);

		// Act
		const results = await gateway.resolve(input);

		// Assert
		expect(results[0]?.url).toBe(
			"https://openfeedback.io/event-1/0/session%3APlatforms%20%231?displayVotes=true",
		);
	});

	it.each(["missing", "ambiguous", "different-speakers"])(
		"rejects %s talk identities without writing",
		async (kind) => {
			// Arrange
			const stored = talkPage.talks[0];
			const talks =
				kind === "missing"
					? []
					: kind === "ambiguous"
						? [stored, { ...stored, id: "duplicate" }]
						: [{ ...stored, speakers: ["another-speaker"] }];
			const fetcher = vi
				.fn<typeof fetch>()
				.mockResolvedValueOnce(Response.json(speakerPage))
				.mockResolvedValueOnce(Response.json({ ...talkPage, talks }));
			const gateway = new OpenFeedbackTalkResultsGateway(
				"oforg_synthetic",
				fetcher,
			);

			// Act
			const operation = gateway.resolve(input);

			// Assert
			await expect(operation).rejects.toThrow(FeedbackResolutionError);
			await expect(operation).rejects.toMatchObject({
				kind: kind === "ambiguous" ? "conflict" : "unavailable",
			});
			expect(fetcher).toHaveBeenCalledTimes(2);
			expect(
				fetcher.mock.calls.every(([, options]) => options?.method === "GET"),
			).toBe(true);
		},
	);

	it.each([
		"not a URL",
		"https://example.invalid/event",
		"http://openfeedback.io/event",
		"https://openfeedback.io/event/unexpected",
	])(
		"treats invalid organizer URL %s as unavailable before provider access",
		async (url) => {
			// Arrange
			const fetcher = vi.fn<typeof fetch>();
			const gateway = new OpenFeedbackTalkResultsGateway(
				"oforg_synthetic",
				fetcher,
			);

			// Act
			const operation = gateway.resolve({ ...input, url });

			// Assert
			await expect(operation).rejects.toThrow(FeedbackResolutionError);
			await expect(operation).rejects.toMatchObject({ kind: "unavailable" });
			expect(fetcher).not.toHaveBeenCalled();
		},
	);

	it("preserves transport failures as technical exceptions", async () => {
		// Arrange
		const fetcher = vi
			.fn<typeof fetch>()
			.mockRejectedValue(new Error("private transport details"));
		const gateway = new OpenFeedbackTalkResultsGateway(
			"oforg_synthetic",
			fetcher,
		);

		// Act
		const operation = gateway.resolve(input);

		// Assert
		await expect(operation).rejects.not.toBeInstanceOf(FeedbackResolutionError);
		await expect(operation).rejects.toThrow("OpenFeedback request failed");
	});
});
