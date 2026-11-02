import type { drive_v3 } from "@googleapis/drive";
import { describe, expect, it, vi } from "vitest";
import { DriveContentSharing } from "./drive-content-sharing.js";

describe("content image sharing", () => {
	it.each(["public", "private", "unconfirmed"])(
		"verifies %s reader access without sharing folders",
		async (state) => {
			// Arrange
			const publicResult = {
				data: { permissions: [{ type: "anyone", role: "reader" }] },
			};
			const privateResult = { data: { permissions: [] } };
			const list = vi
				.fn()
				.mockResolvedValue(
					state === "unconfirmed" ? privateResult : publicResult,
				);
			if (state === "private") list.mockResolvedValueOnce(privateResult);
			const create = vi.fn().mockResolvedValue({ data: { id: "reader" } });
			const sharing = new DriveContentSharing({
				permissions: { list, create },
			} as unknown as drive_v3.Drive);
			// Act
			const result = sharing.ensure("approved-image");
			// Assert
			if (state === "unconfirmed")
				await expect(result).rejects.toThrow("could not be verified");
			else await expect(result).resolves.toBeUndefined();
			expect(create).toHaveBeenCalledTimes(state === "public" ? 0 : 1);
			if (state !== "public")
				expect(create).toHaveBeenCalledWith(
					expect.objectContaining({
						fileId: "approved-image",
						requestBody: {
							type: "anyone",
							role: "reader",
							allowFileDiscovery: false,
						},
					}),
					expect.objectContaining({ retry: false }),
				);
		},
	);
});
