import { describe, expect, it, vi } from "vitest";
import { proposal, sourceExport, speaker } from "../testing/export.fixtures.js";
import { ConferenceHallProposalSource } from "./conference-hall-proposal-source.js";

describe("ConferenceHallProposalSource", () => {
	it("uses the injected clock to interpret a provider retry date", async () => {
		// Arrange
		const request = vi.fn<typeof fetch>().mockResolvedValue(
			new Response("", {
				status: 429,
				headers: { "retry-after": "Thu, 01 Jan 2099 00:02:00 GMT" },
			}),
		);
		const source = new ConferenceHallProposalSource(
			"example-cfp",
			"secret",
			request,
			() => Date.parse("2099-01-01T00:00:00Z"),
		);

		// Act
		const operation = source.load();

		// Assert
		await expect(operation).rejects.toMatchObject({ retryAfterSeconds: 120 });
	});
	it("shares active and archived requests in one bounded snapshot on the fixed origin", async () => {
		// Arrange
		const request = vi
			.fn<typeof fetch>()
			.mockImplementation(async () => Response.json(sourceExport));
		const source = new ConferenceHallProposalSource(
			"example-cfp",
			"secret",
			request,
		);

		// Act
		const [first, second] = await Promise.all([source.load(), source.load()]);

		// Assert
		expect(second).toBe(first);
		expect(request).toHaveBeenCalledTimes(2);
		for (const suffix of ["", "?status=archived"]) {
			expect(request).toHaveBeenCalledWith(
				`https://conference-hall.io/api/v1/event/example-cfp${suffix}`,
				expect.objectContaining({
					redirect: "error",
					signal: expect.any(AbortSignal),
					headers: { "X-API-Key": "secret", Accept: "application/json" },
				}),
			);
		}
		expect(first.speakers).toHaveLength(1);
	});
	it("includes archived speaker profiles while keeping proposal selection active", async () => {
		// Arrange
		const archivedSpeaker = {
			...speaker,
			id: "archived-speaker",
			name: "Archived Speaker",
			email: "archived@example.test",
		};
		const archived = {
			proposals: [
				{
					...proposal,
					id: "archived-proposal",
					speakers: [speaker, archivedSpeaker],
				},
			],
		};
		const request = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(Response.json(sourceExport))
			.mockResolvedValueOnce(Response.json(archived));

		// Act
		const result = await new ConferenceHallProposalSource(
			"example-cfp",
			"secret",
			request,
		).load();

		// Assert
		expect(result.speakers).toHaveLength(2);
		expect(result.speakers).toContainEqual(
			expect.objectContaining({
				id: archivedSpeaker.id,
				displayName: archivedSpeaker.name,
				email: archivedSpeaker.email,
			}),
		);
		expect(result.proposals.map((entry) => entry.id)).toEqual([proposal.id]);
	});
	it("rejects inconsistent profiles between active and archived proposals", async () => {
		// Arrange
		const archived = {
			proposals: [
				{
					...proposal,
					speakers: [{ ...speaker, email: "changed@example.test" }],
				},
			],
		};
		const request = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(Response.json(sourceExport))
			.mockResolvedValueOnce(Response.json(archived));

		// Act
		const result = new ConferenceHallProposalSource(
			"example-cfp",
			"secret",
			request,
		).load();

		// Assert
		await expect(result).rejects.toMatchObject({ code: "conflict" });
	});
	it("does not return partial profiles when the archived export is rate limited", async () => {
		// Arrange
		const request = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(Response.json(sourceExport))
			.mockResolvedValueOnce(
				new Response("PRIVATE", {
					status: 429,
					headers: { "retry-after": "90" },
				}),
			);

		// Act
		const result = new ConferenceHallProposalSource(
			"example-cfp",
			"secret",
			request,
		).load();

		// Assert
		await expect(result).rejects.toMatchObject({
			code: "rate-limited",
			retryAfterSeconds: 90,
		});
		expect(request).toHaveBeenCalledTimes(2);
	});
	it("rejects malformed archived data without returning the active profiles", async () => {
		// Arrange
		const request = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(Response.json(sourceExport))
			.mockResolvedValueOnce(
				Response.json({ proposals: [{ ...proposal, speakers: [] }] }),
			);

		// Act
		const result = new ConferenceHallProposalSource(
			"example-cfp",
			"secret",
			request,
		).load();

		// Assert
		await expect(result).rejects.toMatchObject({
			code: "invalid",
			context: { reason: "schema", field: "proposals[0].speakers" },
		});
	});
	it("defers rate-limited work without retrying or exposing the response", async () => {
		// Arrange
		const request = vi.fn<typeof fetch>().mockResolvedValue(
			new Response("PRIVATE", {
				status: 429,
				headers: { "retry-after": "120" },
			}),
		);
		const source = new ConferenceHallProposalSource(
			"example-cfp",
			"secret",
			request,
		);

		// Act
		const result = source.load();

		// Assert
		await expect(result).rejects.toMatchObject({
			code: "rate-limited",
			retryAfterSeconds: 120,
			message: "Proposal source rate-limited.",
		});
		expect(request).toHaveBeenCalledTimes(1);
	});
	it.each([401, 403, 404, 500])(
		"redacts %s source failures",
		async (status) => {
			// Arrange
			const request = vi
				.fn<typeof fetch>()
				.mockResolvedValue(new Response("PRIVATE", { status }));

			// Act
			const result = new ConferenceHallProposalSource(
				"example-cfp",
				"secret",
				request,
			).load();

			// Assert
			await expect(result).rejects.toMatchObject({
				code: "unavailable",
				context: { reason: "http", status },
			});
		},
	);
	it("classifies malformed JSON without exposing the response", async () => {
		// Arrange
		const request = vi
			.fn<typeof fetch>()
			.mockResolvedValue(new Response("PRIVATE"));

		// Act
		const result = new ConferenceHallProposalSource(
			"example-cfp",
			"secret",
			request,
		).load();

		// Assert
		await expect(result).rejects.toMatchObject({
			code: "invalid",
			context: { reason: "json" },
			message: "Proposal source invalid.",
		});
	});
	it.each(["TimeoutError", "AbortError"])(
		"classifies %s without exposing request details",
		async (name) => {
			// Arrange
			const request = vi
				.fn<typeof fetch>()
				.mockRejectedValue(new DOMException("PRIVATE", name));

			// Act
			const result = new ConferenceHallProposalSource(
				"example-cfp",
				"secret",
				request,
			).load();

			// Assert
			await expect(result).rejects.toMatchObject({
				code: "unavailable",
				context: { reason: "timeout" },
				message: "Proposal source unavailable.",
			});
		},
	);
	it("rejects an oversized response before parsing", async () => {
		// Arrange
		const request = vi
			.fn<typeof fetch>()
			.mockResolvedValue(
				new Response("{}", { headers: { "content-length": "6000000" } }),
			);

		// Act
		const result = new ConferenceHallProposalSource(
			"example-cfp",
			"secret",
			request,
		).load();

		// Assert
		await expect(result).rejects.toMatchObject({ code: "invalid" });
	});
	it("rejects a credential-target override", async () => {
		// Arrange
		const request = vi.fn<typeof fetch>();

		// Act
		const result = new ConferenceHallProposalSource(
			"https://evil.test",
			"secret",
			request,
		).load();

		// Assert
		await expect(result).rejects.toMatchObject({ code: "unavailable" });
		expect(request).not.toHaveBeenCalled();
	});
});
