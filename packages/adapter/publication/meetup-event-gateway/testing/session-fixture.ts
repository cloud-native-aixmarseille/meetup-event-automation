import { vi } from "vitest";
import type { MeetupStorageState } from "../src/meetup-session-store.js";

export function sessionStore() {
	let state: MeetupStorageState | undefined;
	return {
		load: vi.fn(async () => {
			const current = state;
			state = undefined;
			return current;
		}),
		save: vi.fn(async (value: MeetupStorageState) => {
			state = value;
		}),
		clear: vi.fn(async () => {
			state = undefined;
		}),
	};
}
