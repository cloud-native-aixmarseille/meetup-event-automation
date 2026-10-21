import type {
	ProposalSnapshot,
	SpeakerCatalogStore,
} from "@meetup-automation/referential";
import { describe, expect, it, vi } from "vitest";
import { SynchronizeSourceSpeakers } from "./synchronize-source-speakers.js";

const config = {
	"issue-form": ".github/ISSUE_TEMPLATE/community-event.yml",
	"occurrence-status-field": "occurrence",
};
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
			entries: [],
			reservedIds: [],
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
			config,
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
		for (const [input] of form.synchronize.mock.calls) {
			expect(input).toMatchObject({
				issueFormPath: config["issue-form"],
				occurrenceStatusFieldId: config["occurrence-status-field"],
			});
		}
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
		const result = new SynchronizeSourceSpeakers(
			source,
			store,
			form,
			config,
		).execute();

		// Assert
		await expect(result).rejects.toMatchObject({
			stage: "validate-catalog",
			diagnostics: expect.arrayContaining([
				expect.objectContaining({
					code: "referential.speaker.email.invalid",
					field: "speakers[0].email",
				}),
			]),
		});
		expect(store.save).not.toHaveBeenCalled();
		expect(form.synchronize).not.toHaveBeenCalled();
	});
});
