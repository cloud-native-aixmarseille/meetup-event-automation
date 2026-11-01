import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { MeetupSessionCodec } from "./meetup-session-codec.js";
import type {
	MeetupSessionStore,
	MeetupStorageState,
} from "./meetup-session-store.js";

/** Only ciphertext reaches disk or the workflow cache. Failed verification discards it. */
export class EncryptedMeetupSessionStore implements MeetupSessionStore {
	constructor(
		private readonly codec: Pick<MeetupSessionCodec, "encode" | "decode">,
		private readonly path: string,
	) {}
	async load(): Promise<MeetupStorageState | undefined> {
		try {
			const state =
				(await stat(this.path)).size > 2_000_000
					? undefined
					: this.codec.decode(await readFile(this.path));
			await this.clear();
			return state;
		} catch {
			return undefined;
		}
	}
	async save(state: MeetupStorageState): Promise<void> {
		const ciphertext = this.codec.encode(state);
		await mkdir(dirname(this.path), { recursive: true, mode: 0o700 });
		await writeFile(`${this.path}.tmp`, ciphertext, { mode: 0o600 });
		await rename(`${this.path}.tmp`, this.path);
	}
	async clear(): Promise<void> {
		await rm(this.path, { force: true });
	}
}
