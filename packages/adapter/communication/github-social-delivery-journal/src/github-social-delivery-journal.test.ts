import { describe, expect, it, vi } from "vitest";
import {
	socialAttempt,
	socialJournalFixture,
	socialRecord,
} from "../testing/social-journal.fixtures.js";
import { GithubSocialDeliveryJournal } from "./github-social-delivery-journal.js";

describe("durable social delivery journal", () => {
	it("preserves an unsuccessful upload identity while reserving fresh media after verified recovery", async () => {
		// Arrange
		const f = socialJournalFixture();
		const reserved = {
			...socialRecord([socialAttempt()]),
			destination: {
				key: "community-page",
				label: "Community Page",
				provider: "linkedin" as const,
				organizationUrn: "urn:li:organization:123",
			},
		};
		const media = {
			assetUrn: "urn:li:image:initialized-asset",
			fingerprint: "a".repeat(64),
			description: "Reviewed artwork",
		};
		const prepared = {
			...reserved,
			attempts: [socialAttempt({ status: "prepared", media })],
		};
		const failed = {
			...prepared,
			attempts: [
				socialAttempt({ status: "rejected", media, code: "upload-rejected" }),
			],
		};
		const recovered = {
			...failed,
			attempts: [
				{
					...failed.attempts[0],
					recovery: {
						actor: "organizer",
						decidedAt: "2026-10-20T13:00:00Z",
						outcome: "not-published" as const,
						reference:
							"https://github.com/example/events/issues/42#issuecomment-100",
					},
				},
			],
		};
		const fresh = {
			...recovered,
			attempts: [
				...recovered.attempts,
				socialAttempt({
					id: "attempt-two",
					reservedAt: "2026-10-20T14:00:00Z",
				}),
			],
		};

		// Act
		await f.journal.save(undefined, reserved);
		await f.journal.save(reserved, prepared);
		await f.journal.save(prepared, failed);
		await f.journal.save(failed, recovered);
		await f.journal.save(recovered, fresh);
		const saved = await f.journal.load(reserved.intentId);

		// Assert
		expect(saved?.attempts[0]).toEqual(recovered.attempts[0]);
		expect(saved?.attempts[1].media).toBeUndefined();
		expect(saved?.attempts[1].status).toBe("reserved");
	});
	it("retains an organizer's existing manual completion without inventing a provider receipt", async () => {
		// Arrange
		const f = socialJournalFixture();
		const empty = socialRecord();
		const manual = {
			...empty,
			manual: {
				recordedAt: "2026-10-20T12:00:00Z",
				reference: "https://github.com/example/events/issues/42",
			},
		};

		// Act
		await f.journal.save(undefined, empty);
		await f.journal.save(empty, manual);
		const saved = await f.journal.load(empty.intentId);

		// Assert
		expect(saved).toEqual(manual);
		expect(saved?.attempts).toEqual([]);
	});
	it("anchors, reserves, and records provider success without allowing replay", async () => {
		// Arrange
		const f = socialJournalFixture();
		const empty = socialRecord();
		const reserved = socialRecord([socialAttempt()]);
		const accepted = socialRecord([
			socialAttempt({
				status: "accepted",
				receipt: {
					provider: "slack",
					workspaceId: "T123",
					channelId: "C123",
					ts: "1234.5678",
				},
			}),
		]);

		// Act
		await f.journal.save(undefined, empty);
		await f.journal.save(empty, reserved);
		await f.journal.save(reserved, accepted);
		const saved = await f.journal.load(empty.intentId);

		// Assert
		expect(f.journal).toBeInstanceOf(GithubSocialDeliveryJournal);
		expect(saved).toEqual(accepted);
		expect(f.client.create).toHaveBeenCalledTimes(1);
		expect(f.comments).toHaveLength(1);
	});
	it("keeps deliveries to different configured channels independent", async () => {
		// Arrange
		const f = socialJournalFixture();
		const first = socialRecord([socialAttempt()]);
		const second = {
			...socialRecord(),
			intentId: "event-announcement-channel-two",
			destination: {
				...first.destination,
				key: "channel-two",
				channelId: "C456",
			},
		};

		// Act
		await f.journal.save(undefined, first);
		await f.journal.save(undefined, second);
		const firstSaved = await f.journal.load(first.intentId);
		const secondSaved = await f.journal.load(second.intentId);

		// Assert
		expect(firstSaved).toEqual(first);
		expect(secondSaved).toEqual(second);
		expect(f.client.create).toHaveBeenCalledTimes(2);
	});
	it("rejects a stale snapshot when another run has reserved delivery", async () => {
		// Arrange
		const f = socialJournalFixture();
		await f.journal.save(undefined, socialRecord([socialAttempt()]));

		// Act
		const save = f.journal.save(undefined, socialRecord());

		// Assert
		await expect(save).rejects.toThrow("changed before persistence");
		expect(f.client.create).toHaveBeenCalledTimes(1);
	});
	it("blocks an expected record that has been deleted", async () => {
		// Arrange
		const f = socialJournalFixture();
		const record = socialRecord([socialAttempt()]);
		await f.journal.save(undefined, record);
		f.comments.splice(0);

		// Act
		const save = f.journal.save(record, record);

		// Assert
		await expect(save).rejects.toThrow("changed before persistence");
		expect(f.client.create).toHaveBeenCalledTimes(1);
	});
	it("detects an uncertain create before the caller can publish", async () => {
		// Arrange
		const f = socialJournalFixture();
		vi.mocked(f.client.create).mockResolvedValue(1);

		// Act
		const save = f.journal.save(undefined, socialRecord([socialAttempt()]));

		// Assert
		await expect(save).rejects.toThrow("readback is uncertain");
	});
	it("retains a reservation when recording provider acceptance fails", async () => {
		// Arrange
		const f = socialJournalFixture();
		const record = socialRecord([socialAttempt()]);
		await f.journal.save(undefined, record);
		vi.mocked(f.client.replace).mockRejectedValue(
			new Error("GitHub unavailable"),
		);
		const accepted = socialRecord([
			socialAttempt({
				status: "accepted",
				receipt: {
					provider: "slack",
					workspaceId: "T123",
					channelId: "C123",
					ts: "1234.5678",
				},
			}),
		]);

		// Act
		const save = f.journal.save(record, accepted);

		// Assert
		await expect(save).rejects.toThrow("GitHub unavailable");
		expect(f.codec.read(f.comments[0].body ?? "")).toEqual(record);
	});
	it("rejects duplicated bot-owned intent identities", async () => {
		// Arrange
		const f = socialJournalFixture();
		const record = socialRecord();
		await f.client.create(f.codec.write(record));
		await f.client.create(f.codec.write(record));

		// Act
		const load = f.journal.load(record.intentId);

		// Assert
		await expect(load).rejects.toThrow(
			"Duplicate social delivery journal identity",
		);
	});
	it("preserves unrelated email and organizer notification records", async () => {
		// Arrange
		const f = socialJournalFixture();
		const email = "<!-- meetup-automation-delivery-ledger:v1 -->\nemail state";
		await f.client.create(email);

		// Act
		await f.journal.save(undefined, socialRecord());

		// Assert
		expect(f.comments[0].body).toBe(email);
		expect(f.comments).toHaveLength(2);
	});
});
