import { describe, expect, it, vi } from "vitest";
import {
	destination,
	imageStatus,
	json,
	media,
} from "../testing/linkedin.fixtures.js";
import { LinkedInImageStatus } from "./linkedin-image-status.js";
import {
	LinkedInSocialClient,
	type LinkedInSocialFetch,
} from "./linkedin-social-client.js";

describe("LinkedIn image status", () => {
	it.each([
		[
			"PROCESSING",
			{ status: "deferred", code: "media-processing", retryAfterSeconds: 60 },
		],
		[
			"PROCESSING_FAILED",
			{ status: "rejected", code: "media-processing-failed" },
		],
		[
			"WAITING_UPLOAD",
			{ status: "uncertain", code: "media-upload-unconfirmed" },
		],
		["UNKNOWN", { status: "uncertain", code: "media-upload-unconfirmed" }],
	] as const)(
		"does not make a post eligible with image status %s",
		async (status, expected) => {
			// Arrange
			const fetcher = vi
				.fn<LinkedInSocialFetch>()
				.mockResolvedValue(imageStatus(status));
			const target = new LinkedInImageStatus(
				new LinkedInSocialClient("private-token", fetcher),
			);

			// Act
			const result = await target.inspect(destination(), media());

			// Assert
			expect(result).toEqual(expected);
			expect(fetcher.mock.calls[0][1].method).toBe("GET");
		},
	);
	it.each([null, [], "private-provider-body"])(
		"defers malformed media reads without exposing their payload",
		async (payload) => {
			// Arrange
			const fetcher = vi
				.fn<LinkedInSocialFetch>()
				.mockResolvedValue(json(payload));
			const target = new LinkedInImageStatus(
				new LinkedInSocialClient("private-token", fetcher),
			);

			// Act
			const result = await target.inspect(destination(), media());

			// Assert
			expect(result).toEqual({ status: "deferred", code: "media-unavailable" });
		},
	);
	it("rejects a response that substitutes the image identity", async () => {
		// Arrange
		const fetcher = vi.fn<LinkedInSocialFetch>().mockResolvedValue(
			json({
				owner: destination().organizationUrn,
				id: "urn:li:image:Other",
				status: "AVAILABLE",
			}),
		);
		const target = new LinkedInImageStatus(
			new LinkedInSocialClient("private-token", fetcher),
		);

		// Act
		const result = await target.inspect(destination(), media());

		// Assert
		expect(result).toEqual({
			status: "rejected",
			code: "media-owner-mismatch",
		});
	});
	it("defers a network failure during a media read", async () => {
		// Arrange
		const fetcher = vi
			.fn<LinkedInSocialFetch>()
			.mockRejectedValue(new Error("private-transport-error"));
		const target = new LinkedInImageStatus(
			new LinkedInSocialClient("private-token", fetcher),
		);

		// Act
		const result = await target.inspect(destination(), media());

		// Assert
		expect(result).toEqual({ status: "deferred", code: "media-unavailable" });
	});
});
