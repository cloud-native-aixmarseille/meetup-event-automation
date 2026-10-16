import { describe, expect, it, vi } from "vitest";
import type {
	ProposalSnapshot,
	SpeakerCatalogStore,
} from "@meetup-automation/referential";
import { SynchronizeSourceSpeakers } from "./synchronize-source-speakers.js";

const snapshot: ProposalSnapshot = {
	provider: "conference-hall",
	event: "example-cfp",
	proposals: [],
	speakers: [
		{ id: "source-one", displayName: "Alex", email: "alex@example.test" },
	],
};
function dependencies() {
	const source = { load: vi.fn().mockResolvedValue(snapshot) };
	const store: SpeakerCatalogStore = {
		read: vi.fn().mockResolvedValue({
			revision: "revision",
			rows: [],
			columns: [],
			state: { version: 1, reservedIds: [] },
		}),
		candidate: vi.fn().mockResolvedValue({
			hosts: [],
			speakers: [
				{
					speakerId: "speaker-0001",
					displayName: "Alex",
					firstName: "",
					lastName: "",
					company: "",
					email: "alex@example.test",
				},
			],
		}),
		save: vi.fn().mockResolvedValue(true),
	};
	const form = {
		synchronize: vi
			.fn()
			.mockResolvedValue({ changed: false, changedFiles: [], diagnostics: [] }),
	};
	return { source, store, form };
}

describe("SynchronizeSourceSpeakers", () => {
	it("validates the complete candidate and projects the same catalog before and after persistence", async () => {
		// Arrange
		const { source, store, form } = dependencies();
		// Act
		const result = await new SynchronizeSourceSpeakers(
			source,
			store,
			form,
		).execute();
		// Assert
		expect(result).toEqual({ changed: true, speakerCount: 1 });
		expect(source.load).toHaveBeenCalledTimes(1);
		expect(form.synchronize.mock.calls.map(([input]) => input.mode)).toEqual([
			"check",
			"fix",
		]);
		expect(form.synchronize.mock.calls[0][0].catalog).toBe(
			form.synchronize.mock.calls[1][0].catalog,
		);
	});
	it("leaves the catalog and form untouched when required source fields are invalid", async () => {
		// Arrange
		const { source, store, form } = dependencies();
		vi.mocked(store.candidate).mockResolvedValue({
			hosts: [],
			speakers: [
				{
					speakerId: "speaker-0001",
					firstName: "",
					lastName: "",
					company: "",
					email: "",
				},
			],
		});
		// Act
		const result = new SynchronizeSourceSpeakers(source, store, form).execute();
		// Assert
		await expect(result).rejects.toThrow("Proposal source invalid.");
		expect(store.save).not.toHaveBeenCalled();
		expect(form.synchronize).not.toHaveBeenCalled();
	});
});
