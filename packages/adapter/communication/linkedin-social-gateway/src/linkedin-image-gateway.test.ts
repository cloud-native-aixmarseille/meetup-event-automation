import type { SocialPreparedMedia } from "@meetup-automation/communication";
import { describe, expect, it, vi } from "vitest";
import {
	imageInput,
	imageStatus,
	initialized,
	json,
	media,
} from "../testing/linkedin.fixtures.js";
import { LinkedInImageGateway } from "./linkedin-image-gateway.js";
import { LinkedInImageStatus } from "./linkedin-image-status.js";
import { LinkedInImageValidation } from "./linkedin-image-validation.js";
import {
	LinkedInSocialClient,
	type LinkedInSocialFetch,
} from "./linkedin-social-client.js";

function gateway(fetcher: LinkedInSocialFetch): LinkedInImageGateway {
	const client = new LinkedInSocialClient("private-token", fetcher);
	return new LinkedInImageGateway(
		client,
		new LinkedInImageValidation(),
		new LinkedInImageStatus(client),
	);
}

describe("LinkedIn image gateway", () => {
	it("journals the asset and approved fingerprint before uploading immutable bytes", async () => {
		// Arrange
		const original = imageInput();
		const bytes = new Uint8Array(original.bytes);
		const fetcher = vi
			.fn<LinkedInSocialFetch>()
			.mockResolvedValueOnce(initialized())
			.mockResolvedValueOnce(new Response(null, { status: 201 }))
			.mockResolvedValueOnce(imageStatus());
		const target = gateway(fetcher);
		const beforeWrite = vi.fn().mockImplementation(async () => {
			original.bytes.fill(0);
		});
		const record = vi
			.fn<(value: SocialPreparedMedia) => Promise<void>>()
			.mockResolvedValue(undefined);

		// Act
		const result = await target.prepare(original, beforeWrite, record);

		// Assert
		expect(result).toEqual({ status: "ready", media: media() });
		expect(record).toHaveBeenCalledWith(media());
		expect(record.mock.invocationCallOrder[0]).toBeLessThan(
			fetcher.mock.invocationCallOrder[1],
		);
		expect(beforeWrite).toHaveBeenCalledTimes(2);
		expect(fetcher.mock.calls[1][1]).toEqual(
			expect.objectContaining({
				method: "PUT",
				body: bytes,
				redirect: "error",
			}),
		);
		expect(JSON.stringify(result)).not.toContain("private");
		expect(JSON.stringify(record.mock.calls)).not.toContain("private");
	});
	it("does not upload when the durable media checkpoint fails", async () => {
		// Arrange
		const fetcher = vi
			.fn<LinkedInSocialFetch>()
			.mockResolvedValue(initialized());
		const target = gateway(fetcher);
		const record = vi.fn().mockRejectedValue(new Error("journal-unavailable"));

		// Act
		const pending = target.prepare(imageInput(), vi.fn(), record);

		// Assert
		await expect(pending).rejects.toThrow("journal-unavailable");
		expect(fetcher).toHaveBeenCalledOnce();
	});
	it("does not upload after final authority is removed", async () => {
		// Arrange
		const fetcher = vi
			.fn<LinkedInSocialFetch>()
			.mockResolvedValue(initialized());
		const target = gateway(fetcher);
		const beforeWrite = vi
			.fn()
			.mockResolvedValueOnce(undefined)
			.mockRejectedValueOnce(new Error("approval-changed"));
		const record = vi.fn();

		// Act
		const pending = target.prepare(imageInput(), beforeWrite, record);

		// Assert
		await expect(pending).rejects.toThrow("approval-changed");
		expect(record).toHaveBeenCalledWith(media());
		expect(fetcher).toHaveBeenCalledOnce();
	});
	it("retains the media checkpoint after an ambiguous upload without retrying it", async () => {
		// Arrange
		const fetcher = vi
			.fn<LinkedInSocialFetch>()
			.mockResolvedValueOnce(initialized())
			.mockRejectedValueOnce(new Error("private-upload-failure"));
		const target = gateway(fetcher);
		const record = vi.fn();

		// Act
		const result = await target.prepare(imageInput(), vi.fn(), record);

		// Assert
		expect(result).toEqual({
			status: "uncertain",
			code: "unknown-provider-state",
		});
		expect(record).toHaveBeenCalledWith(media());
		expect(fetcher).toHaveBeenCalledTimes(2);
	});
	it("returns processing as deferred with the uploaded media retained", async () => {
		// Arrange
		const fetcher = vi
			.fn<LinkedInSocialFetch>()
			.mockResolvedValueOnce(initialized())
			.mockResolvedValueOnce(new Response(null, { status: 201 }))
			.mockResolvedValueOnce(imageStatus("PROCESSING"));
		const target = gateway(fetcher);
		const record = vi.fn();

		// Act
		const result = await target.prepare(imageInput(), vi.fn(), record);

		// Assert
		expect(result).toEqual({
			status: "deferred",
			code: "media-processing",
			retryAfterSeconds: 60,
		});
		expect(record).toHaveBeenCalledWith(media());
		expect(fetcher).toHaveBeenCalledTimes(3);
	});
	it("rejects changed bytes before reserving or uploading media", async () => {
		// Arrange
		const fetcher = vi.fn<LinkedInSocialFetch>();
		const target = gateway(fetcher);
		const beforeWrite = vi.fn();

		// Act
		const result = await target.prepare(
			{ ...imageInput(), fingerprint: "f".repeat(64) },
			beforeWrite,
			vi.fn(),
		);

		// Assert
		expect(result).toEqual({ status: "rejected", code: "invalid-media" });
		expect(beforeWrite).not.toHaveBeenCalled();
		expect(fetcher).not.toHaveBeenCalled();
	});
	it.each([
		"https://attacker.test/upload",
		"https://www.linkedin.com.attacker.test/dms-uploads/123",
		"http://www.linkedin.com/dms-uploads/123",
		"https://www.linkedin.com/other/123",
	])(
		"does not send credentials or approved bytes to an unsafe upload URL",
		async (uploadUrl) => {
			// Arrange
			const fetcher = vi
				.fn<LinkedInSocialFetch>()
				.mockResolvedValue(
					json({ value: { image: media().assetUrn, uploadUrl } }),
				);
			const target = gateway(fetcher);
			const record = vi.fn();

			// Act
			const result = await target.prepare(imageInput(), vi.fn(), record);

			// Assert
			expect(result).toEqual({
				status: "uncertain",
				code: "ambiguous-response",
			});
			expect(fetcher).toHaveBeenCalledOnce();
			expect(record).not.toHaveBeenCalled();
		},
	);
});
