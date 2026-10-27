import { describe, expect, it, vi } from "vitest";
import {
	SlackSocialClient,
	type SlackSocialFetch,
} from "./slack-social-client.js";

describe("Slack social client", () => {
	it.each([
		["invalid_auth", "rejected", "authentication-failed"],
		["token_expired", "rejected", "authentication-failed"],
		["missing_scope", "rejected", "permission-denied"],
		["not_in_channel", "rejected", "destination-unavailable"],
		["is_archived", "rejected", "destination-unavailable"],
		["msg_too_long", "rejected", "invalid-request"],
		["internal_error", "uncertain", "ambiguous-response"],
		["fatal_error", "uncertain", "ambiguous-response"],
		["unknown-error-with-private-data", "uncertain", "ambiguous-response"],
	])(
		"classifies %s without leaking provider error text",
		async (error, outcome, diagnosticCode) => {
			// Arrange
			const fetcher = vi
				.fn<SlackSocialFetch>()
				.mockResolvedValue(new Response(JSON.stringify({ ok: false, error })));
			const client = new SlackSocialClient("private-token", fetcher);

			// Act
			const result = await client.post("chat.postMessage", {
				channel: "C123",
				text: "Meetup",
			});

			// Assert
			expect(result).toEqual({ outcome, diagnosticCode });
			expect(fetcher).toHaveBeenCalledOnce();
		},
	);
	it.each([400, 401, 403, 404, 422, 500, 502, 503])(
		"does not retry HTTP %i",
		async (status) => {
			// Arrange
			const fetcher = vi
				.fn<SlackSocialFetch>()
				.mockResolvedValue(new Response("private-provider-data", { status }));
			const client = new SlackSocialClient("private-token", fetcher);

			// Act
			const result = await client.post("chat.postMessage", {});

			// Assert
			expect(result.outcome).toBe(status >= 500 ? "uncertain" : "rejected");
			expect(JSON.stringify(result)).not.toContain("private");
			expect(fetcher).toHaveBeenCalledOnce();
		},
	);
	it.each([429, 200])(
		"preserves a provider rate limit delay for HTTP %i",
		async (status) => {
			// Arrange
			const fetcher = vi.fn<SlackSocialFetch>().mockResolvedValue(
				new Response(JSON.stringify({ ok: false, error: "ratelimited" }), {
					status,
					headers: { "retry-after": "45" },
				}),
			);
			const client = new SlackSocialClient("private-token", fetcher);

			// Act
			const result = await client.post("chat.postMessage", {});

			// Assert
			expect(result).toEqual({
				outcome: "deferred",
				diagnosticCode: "rate-limited",
				retryAfterSeconds: 45,
			});
			expect(fetcher).toHaveBeenCalledOnce();
		},
	);
	it.each([
		"not json",
		"null",
		"[]",
		'{"error":"missing_scope"}',
		'{"ok":"true"}',
	])("treats malformed response %s as uncertain", async (body) => {
		// Arrange
		const fetcher = vi
			.fn<SlackSocialFetch>()
			.mockResolvedValue(new Response(body));
		const client = new SlackSocialClient("private-token", fetcher);

		// Act
		const result = await client.post("chat.postMessage", {});

		// Assert
		expect(result).toEqual({
			outcome: "uncertain",
			diagnosticCode: "ambiguous-response",
		});
	});
});
