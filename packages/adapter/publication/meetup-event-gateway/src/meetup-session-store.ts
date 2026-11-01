import type { BrowserContext } from "playwright-core";

export type MeetupStorageState = Awaited<
	ReturnType<BrowserContext["storageState"]>
>;
export interface MeetupSessionStore {
	load(): Promise<MeetupStorageState | undefined>;
	save(state: MeetupStorageState): Promise<void>;
	clear(): Promise<void>;
}
