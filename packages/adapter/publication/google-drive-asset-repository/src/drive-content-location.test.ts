import { describe, expect, it } from "vitest";
import { contentPlacementFixture } from "../testing/content-placement-fixture.js";

describe("Drive content placement", () => {
	it("moves and renames the selected identity, retains public access and does nothing on a rerun", async () => {
		// Arrange
		const f = contentPlacementFixture();
		// Act
		await f.location.place(f.input);
		await f.location.place(f.input);
		// Assert
		expect(f.file).toMatchObject({
			name: f.input.name,
			parents: [f.folder.id],
			appProperties: {
				contentEventKey: f.key,
				contentHash: f.media.fingerprint,
			},
		});
		expect(f.update).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({
				fileId: f.media.id,
				addParents: f.folder.id,
				removeParents: "tmp-covers",
			}),
			expect.objectContaining({ retry: false }),
		);
		expect(f.share).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({
				fileId: f.media.id,
				requestBody: {
					type: "anyone",
					role: "reader",
					allowFileDiscovery: false,
				},
			}),
			expect.anything(),
		);
		expect(f.share.mock.invocationCallOrder[0]).toBeLessThan(
			Number(f.update.mock.invocationCallOrder[0]),
		);
	});
	it("renames an already placed cover after a date change without moving or sharing it again", async () => {
		// Arrange
		const f = contentPlacementFixture();
		// Act
		await f.location.place(f.input);
		await f.location.place({ ...f.input, name: "2099-12-06 - Cover.png" });
		// Assert
		expect(f.file.name).toBe("2099-12-06 - Cover.png");
		expect(f.share).toHaveBeenCalledTimes(1);
		expect(f.update.mock.calls[1]?.[0]).not.toHaveProperty("addParents");
	});
	it.each(["wrong-event", "trashed", "not-folder"])(
		"rejects a %s destination before changing the selected file",
		async (scenario) => {
			// Arrange
			const f = contentPlacementFixture();
			if (scenario === "wrong-event")
				f.folder.appProperties = { meetup_event_key: "b".repeat(64) };
			if (scenario === "trashed") f.folder.trashed = true;
			if (scenario === "not-folder") f.folder.mimeType = "image/png";
			// Act
			const result = f.location.place(f.input);
			// Assert
			await expect(result).rejects.toThrow("managed folder");
			expect(f.update).not.toHaveBeenCalled();
			expect(f.share).not.toHaveBeenCalled();
		},
	);
	it("leaves the cover in staging when its public access cannot be preserved", async () => {
		// Arrange
		const f = contentPlacementFixture();
		f.share.mockRejectedValue(new Error("Permission denied"));
		// Act
		const result = f.location.place(f.input);
		// Assert
		await expect(result).rejects.toThrow("Permission denied");
		expect(f.update).not.toHaveBeenCalled();
		expect(f.file.parents).toEqual(["tmp-covers"]);
	});
	it("rejects an unconfirmed move instead of reporting success", async () => {
		// Arrange
		const f = contentPlacementFixture();
		f.update.mockResolvedValue({ data: {} });
		// Act
		const result = f.location.place(f.input);
		// Assert
		await expect(result).rejects.toThrow("could not be verified");
	});
	it("recovers a completed move after the provider response was lost", async () => {
		// Arrange
		const f = contentPlacementFixture();
		const update = f.update.getMockImplementation();
		if (!update) throw new Error("Missing update fixture");
		f.update.mockImplementationOnce(async (input) => {
			await update(input);
			throw new Error("Response lost");
		});
		// Act
		const first = await f.location
			.place(f.input)
			.catch((error: Error) => error.message);
		await f.location.place(f.input);
		// Assert
		expect(first).toBe("Response lost");
		expect(f.file.name).toBe(f.input.name);
		expect(f.update).toHaveBeenCalledTimes(1);
		expect(f.share).toHaveBeenCalledTimes(1);
	});
});
