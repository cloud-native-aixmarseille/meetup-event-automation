import { describe, expect, it, vi } from "vitest";
import {
	destination,
	imageStatus,
	media,
} from "../testing/linkedin.fixtures.js";
import { LinkedInCommentary } from "./linkedin-commentary.js";
import { LinkedInImageStatus } from "./linkedin-image-status.js";
import {
	LinkedInSocialClient,
	type LinkedInSocialFetch,
} from "./linkedin-social-client.js";
import { LinkedInSocialGateway } from "./linkedin-social-gateway.js";

function gateway(fetcher: LinkedInSocialFetch): LinkedInSocialGateway {
	const client = new LinkedInSocialClient("private-token", fetcher);
	return new LinkedInSocialGateway(
		client,
		new LinkedInImageStatus(client),
		new LinkedInCommentary(),
	);
}

describe("LinkedIn social gateway", () => {
	it("publishes exact reviewed copy with an owned available image and captures its post URN", async () => {
		// Arrange
		const fetcher = vi
			.fn<LinkedInSocialFetch>()
			.mockResolvedValueOnce(imageStatus())
			.mockResolvedValueOnce(
				new Response(null, {
					status: 201,
					headers: { "x-restli-id": "urn:li:share:456" },
				}),
			);
		const beforeWrite = vi.fn().mockResolvedValue(undefined);
		const target = gateway(fetcher);

		// Act
		const result = await target.publish(
			{
				destination: destination(),
				text: "Meetup https://example.test/register",
				media: media(),
			},
			beforeWrite,
		);

		// Assert
		expect(result).toEqual({
			status: "accepted",
			receipt: {
				provider: "linkedin",
				organizationUrn: destination().organizationUrn,
				postUrn: "urn:li:share:456",
				url: "https://www.linkedin.com/feed/update/urn:li:share:456/",
			},
		});
		expect(fetcher.mock.calls[0][0]).toBe(
			"https://api.linkedin.com/rest/images/urn%3Ali%3Aimage%3AAbC123",
		);
		expect(fetcher.mock.calls[1]).toEqual([
			"https://api.linkedin.com/rest/posts",
			expect.objectContaining({
				headers: expect.objectContaining({
					"LinkedIn-Version": "202610",
					"X-Restli-Protocol-Version": "2.0.0",
				}),
				body: JSON.stringify({
					author: destination().organizationUrn,
					commentary: "Meetup https://example.test/register",
					visibility: "PUBLIC",
					distribution: {
						feedDistribution: "MAIN_FEED",
						targetEntities: [],
						thirdPartyDistributionChannels: [],
					},
					content: {
						media: { id: media().assetUrn, altText: media().description },
					},
					lifecycleState: "PUBLISHED",
					isReshareDisabledByAuthor: false,
				}),
			}),
		]);
		expect(beforeWrite.mock.invocationCallOrder[0]).toBeLessThan(
			fetcher.mock.invocationCallOrder[1],
		);
		expect(JSON.stringify(result)).not.toContain("private");
	});
	it.each([undefined, "urn:li:organization:456", "malformed"])(
		"keeps a successful HTTP write uncertain without a valid post identity",
		async (postUrn) => {
			// Arrange
			const fetcher = vi.fn<LinkedInSocialFetch>().mockResolvedValue(
				new Response(null, {
					status: 201,
					headers: postUrn ? { "x-restli-id": postUrn } : {},
				}),
			);
			const target = gateway(fetcher);

			// Act
			const result = await target.publish(
				{ destination: destination(), text: "Meetup" },
				vi.fn(),
			);

			// Assert
			expect(result).toEqual({
				status: "uncertain",
				code: "ambiguous-response",
			});
			expect(fetcher).toHaveBeenCalledOnce();
		},
	);
	it("blocks a post after the approved image owner changes", async () => {
		// Arrange
		const fetcher = vi
			.fn<LinkedInSocialFetch>()
			.mockResolvedValue(imageStatus("AVAILABLE", "urn:li:organization:999"));
		const target = gateway(fetcher);
		const beforeWrite = vi.fn();

		// Act
		const result = await target.publish(
			{ destination: destination(), text: "Meetup", media: media() },
			beforeWrite,
		);

		// Assert
		expect(result).toEqual({
			status: "rejected",
			code: "media-owner-mismatch",
		});
		expect(fetcher).toHaveBeenCalledOnce();
		expect(beforeWrite).not.toHaveBeenCalled();
	});
	it("rechecks authority after inspecting the image and before creating the post", async () => {
		// Arrange
		const fetcher = vi
			.fn<LinkedInSocialFetch>()
			.mockResolvedValue(imageStatus());
		const target = gateway(fetcher);
		const beforeWrite = vi
			.fn()
			.mockRejectedValue(new Error("approval-changed"));

		// Act
		const pending = target.publish(
			{ destination: destination(), text: "Meetup", media: media() },
			beforeWrite,
		);

		// Assert
		await expect(pending).rejects.toThrow("approval-changed");
		expect(fetcher).toHaveBeenCalledOnce();
	});
	it.each(["", "x".repeat(3001), "@[Person](urn:li:person:123)"])(
		"rejects invalid text without rewriting approved copy",
		async (text) => {
			// Arrange
			const fetcher = vi.fn<LinkedInSocialFetch>();
			const target = gateway(fetcher);

			// Act
			const result = await target.publish(
				{ destination: destination(), text },
				vi.fn(),
			);

			// Assert
			expect(result).toEqual({ status: "rejected", code: "invalid-request" });
			expect(fetcher).not.toHaveBeenCalled();
		},
	);
	it("never retries an ambiguous public write", async () => {
		// Arrange
		const fetcher = vi
			.fn<LinkedInSocialFetch>()
			.mockRejectedValue(new Error("private-provider-details"));
		const target = gateway(fetcher);

		// Act
		const result = await target.publish(
			{ destination: destination(), text: "Meetup" },
			vi.fn(),
		);

		// Assert
		expect(result).toEqual({
			status: "uncertain",
			code: "unknown-provider-state",
		});
		expect(fetcher).toHaveBeenCalledOnce();
	});
});
