import { MeetupGroupUrl } from "@meetup-automation/publication";
import { describe, expect, it, vi } from "vitest";
import { cover, coverImage, coverJournal } from "../testing/cover-fixture.js";
import { MeetupCover } from "./meetup-cover.js";
import { MeetupCoverImage } from "./meetup-cover-image.js";

const group = MeetupGroupUrl.parse("https://www.meetup.com/example/");
if (!group) throw new Error("Invalid fixture group");

describe("Meetup cover synchronization", () => {
	it("records one verified upload and reuses its photo on subsequent sessions", async () => {
		// Arrange
		const journal = coverJournal();
		const images = { load: vi.fn().mockResolvedValue(coverImage) };
		const photo = {
			persisted: vi.fn().mockResolvedValue("101"),
			upload: vi.fn().mockResolvedValue("101"),
		};
		const first = new MeetupCover(
			images,
			new MeetupCoverImage(),
			journal,
			photo,
		);
		const second = new MeetupCover(
			images,
			new MeetupCoverImage(),
			journal,
			photo,
		);
		// Act
		await first.apply(cover, group, vi.fn());
		await second.apply(cover, group, vi.fn());
		const matches = await second.matches(cover, group);
		// Assert
		expect(matches).toBe(true);
		expect(photo.upload).toHaveBeenCalledOnce();
		expect(journal.reserveCover.mock.invocationCallOrder[0]).toBeLessThan(
			photo.upload.mock.invocationCallOrder[0],
		);
		expect(await journal.readCover()).toEqual({
			groupUrl: group.value,
			fingerprint: cover.fingerprint,
			photoId: "101",
		});
	});

	it.each([undefined, "999"])(
		"blocks an interrupted or mismatched photo without another upload: %s",
		async (photoId) => {
			// Arrange
			const journal = coverJournal({
				groupUrl: group.value,
				fingerprint: cover.fingerprint,
				photoId,
			});
			const images = { load: vi.fn() };
			const photo = {
				persisted: vi.fn().mockResolvedValue("101"),
				upload: vi.fn(),
			};
			const subject = new MeetupCover(
				images,
				new MeetupCoverImage(),
				journal,
				photo,
			);
			// Act
			const result = subject.apply(cover, group, vi.fn());
			// Assert
			await expect(result).rejects.toMatchObject({ kind: "uncertain" });
			expect(photo.upload).not.toHaveBeenCalled();
			expect(images.load).not.toHaveBeenCalled();
		},
	);

	it("rejects bytes changed after review before reserving or uploading", async () => {
		// Arrange
		const journal = coverJournal();
		const photo = { persisted: vi.fn(), upload: vi.fn() };
		const subject = new MeetupCover(
			{ load: async () => coverImage },
			new MeetupCoverImage(),
			journal,
			photo,
		);
		// Act
		const result = subject.apply(
			{ ...cover, fingerprint: "f".repeat(64) },
			group,
			vi.fn(),
		);
		// Assert
		await expect(result).rejects.toMatchObject({ kind: "content-review" });
		expect(journal.reserveCover).not.toHaveBeenCalled();
		expect(photo.upload).not.toHaveBeenCalled();
	});

	it("retains uncertainty after the provider fails during upload", async () => {
		// Arrange
		const journal = coverJournal();
		const photo = {
			persisted: vi.fn(),
			upload: vi.fn().mockRejectedValue(new Error("private provider details")),
		};
		const subject = new MeetupCover(
			{ load: async () => coverImage },
			new MeetupCoverImage(),
			journal,
			photo,
		);
		// Act
		const result = subject.apply(cover, group, vi.fn());
		// Assert
		await expect(result).rejects.toMatchObject({ kind: "uncertain" });
		expect(await journal.readCover()).toEqual({
			groupUrl: group.value,
			fingerprint: cover.fingerprint,
		});
		expect(journal.recordCover).not.toHaveBeenCalled();
	});
});
