import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { EncryptedMeetupSessionStore } from "./encrypted-meetup-session-store.js";
import { MeetupSessionCodec } from "./meetup-session-codec.js";

const directories: string[] = [];
afterEach(async () => {
	for (const directory of directories.splice(0))
		await rm(directory, { recursive: true, force: true });
});
async function fixture() {
	const directory = await mkdtemp(
		join(tmpdir(), "meetup-encrypted-session-test-"),
	);
	directories.push(directory);
	const path = join(directory, "session.enc");
	const codec = new MeetupSessionCodec(
		"synthetic-key",
		"synthetic-scope",
		"https://example.test",
		Date.now,
	);
	return { path, store: new EncryptedMeetupSessionStore(codec, path) };
}

describe("Encrypted Meetup session store", () => {
	it("persists ciphertext across instances and consumes it until identity verification", async () => {
		// Arrange
		const { path, store } = await fixture();
		const state = {
			cookies: [],
			origins: [
				{
					origin: "https://example.test",
					localStorage: [{ name: "token", value: "private-token" }],
				},
			],
		};

		// Act
		await store.save(state);
		const contents = await readFile(path);
		const permissions = (await stat(path)).mode & 0o777;
		const restored = await store.load();
		const consumed = await store.load();

		// Assert
		expect(contents.includes(Buffer.from("private-token"))).toBe(false);
		expect(permissions).toBe(0o600);
		expect(restored).toEqual(state);
		expect(consumed).toBeUndefined();
	});

	it("discards a corrupt cache instead of blocking fresh login", async () => {
		// Arrange
		const { path, store } = await fixture();
		await writeFile(path, "broken ciphertext");

		// Act
		const result = await store.load();
		const exists = await stat(path).then(
			() => true,
			() => false,
		);

		// Assert
		expect(result).toBeUndefined();
		expect(exists).toBe(false);
	});
});
