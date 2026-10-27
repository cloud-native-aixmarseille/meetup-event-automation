import { describe, expect, it, vi } from "vitest";
import {
	LinkedInSocialClient,
	type LinkedInSocialFetch,
} from "./linkedin-social-client.js";

describe("LinkedIn social client", () => {
	it.each([
		[400, "rejected", "invalid-request"],
		[401, "rejected", "authentication-failed"],
		[403, "rejected", "permission-denied"],
		[404, "rejected", "destination-unavailable"],
		[409, "uncertain", "ambiguous-response"],
		[422, "rejected", "invalid-request"],
		[500, "uncertain", "ambiguous-response"],
		[502, "uncertain", "ambiguous-response"],
		[503, "uncertain", "ambiguous-response"],
	] as const)(
		"classifies HTTP %i without exposing its body or retrying",
		async (status, outcome, code) => {
			// Arrange
			const fetcher = vi
				.fn<LinkedInSocialFetch>()
				.mockResolvedValue(
					new Response("private-provider-details", { status }),
				);
			const client = new LinkedInSocialClient("private-token", fetcher);

			// Act
			const result = await client.request("posts", "POST", {});

			// Assert
			expect(result).toEqual({ status: outcome, code });
			expect(fetcher).toHaveBeenCalledOnce();
		},
	);
	it("returns rate-limit delay without sleeping or retrying", async () => {
		// Arrange
		const fetcher = vi
			.fn<LinkedInSocialFetch>()
			.mockResolvedValue(
				new Response(null, { status: 429, headers: { "retry-after": "90" } }),
			);
		const client = new LinkedInSocialClient("private-token", fetcher);

		// Act
		const result = await client.request("posts", "POST", {});

		// Assert
		expect(result).toEqual({
			status: "deferred",
			code: "rate-limited",
			retryAfterSeconds: 90,
		});
		expect(fetcher).toHaveBeenCalledOnce();
	});
	it.each([
		"-1",
		"Infinity",
		"1.5",
		"private-value",
		"999999999999999999999999",
	])("ignores invalid retry hints", async (retryAfter) => {
		// Arrange
		const fetcher = vi.fn<LinkedInSocialFetch>().mockResolvedValue(
			new Response(null, {
				status: 429,
				headers: { "retry-after": retryAfter },
			}),
		);
		const client = new LinkedInSocialClient("private-token", fetcher);

		// Act
		const result = await client.request("posts", "POST", {});

		// Assert
		expect(result).toEqual({ status: "deferred", code: "rate-limited" });
	});
	it("blocks signed-upload redirects and bearer-token forwarding to another host", async () => {
		// Arrange
		const fetcher = vi.fn<LinkedInSocialFetch>().mockResolvedValue(
			new Response(null, {
				status: 302,
				headers: { location: "https://attacker.test/upload" },
			}),
		);
		const client = new LinkedInSocialClient("private-token", fetcher);

		// Act
		const result = await client.upload(
			"https://www.linkedin.com/dms-uploads/123?ut=signature",
			new Uint8Array([1]),
			"image/png",
		);

		// Assert
		expect(result).toEqual({ status: "uncertain", code: "ambiguous-response" });
		expect(fetcher).toHaveBeenCalledOnce();
		expect(fetcher.mock.calls[0][1].redirect).toBe("error");
	});
	it("rejects an unsafe upload destination before sending the bearer token", async () => {
		// Arrange
		const fetcher = vi.fn<LinkedInSocialFetch>();
		const client = new LinkedInSocialClient("private-token", fetcher);

		// Act
		const result = await client.upload(
			"https://attacker.test/upload",
			new Uint8Array([1]),
			"image/png",
		);

		// Assert
		expect(result).toEqual({ status: "rejected", code: "invalid-upload-url" });
		expect(fetcher).not.toHaveBeenCalled();
	});
});
