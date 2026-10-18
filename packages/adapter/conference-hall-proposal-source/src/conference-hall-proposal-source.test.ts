import { describe, expect, it, vi } from "vitest";
import { sourceExport } from "../testing/export.fixtures.js";
import { ConferenceHallProposalSource } from "./conference-hall-proposal-source.js";

describe("ConferenceHallProposalSource", () => {
	it("fetches one bounded snapshot per invocation on the fixed origin", async () => {
		// Arrange
		const request = vi
			.fn<typeof fetch>()
			.mockResolvedValue(Response.json(sourceExport));
		const source = new ConferenceHallProposalSource(
			"example-cfp",
			"secret",
			request,
		);
		// Act
		const first = await source.load();
		const second = await source.load();
		// Assert
		expect(second).toBe(first);
		expect(request).toHaveBeenCalledTimes(1);
		expect(request).toHaveBeenCalledWith(
			"https://conference-hall.io/api/v1/event/example-cfp",
			expect.objectContaining({
				redirect: "error",
				signal: expect.any(AbortSignal),
				headers: { "X-API-Key": "secret", Accept: "application/json" },
			}),
		);
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
