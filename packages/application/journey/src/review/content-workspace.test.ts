import type { MeetupEvent } from "@meetup-automation/event";
import { ContentMediaChangedError } from "@meetup-automation/publication";
import { describe, expect, it, vi } from "vitest";
import { identity } from "../../testing/meetup-journey.fixtures.js";
import { publicationFixture } from "../../testing/meetup-publication.fixtures.js";
import {
	contentFixture,
	media,
} from "../../testing/promotional-content.fixtures.js";
import type { ContentTarget } from "../proposals/promotional-content.js";
import { DiagnosticPolicy } from "../result/diagnostic-policy.js";
import { ContentFactsProjection } from "./content-facts-projection.js";
import { ContentWorkspace } from "./content-workspace.js";

function fixture(overrides: Partial<MeetupEvent> = {}) {
	const f = publicationFixture(overrides);
	const announcement = vi.fn(async () => media);
	const workspace = new ContentWorkspace({
		diagnostics: new DiagnosticPolicy(),
		repository: f.deps.repository,
		manageEvent: f.manageEvent,
		plans: contentFixture().plans,
		projection: new ContentFactsProjection(),
		publication: f.dependencies.settings,
		settings: {
			months: { "2026-09": "Septembre" },
			mentions: ["Example Organizer"],
			reminderTime: "09:00",
			guidance: "",
		},
		announcement,
	});
	return { ...f, announcement, workspace };
}

describe("content workspace", () => {
	it("plans public content from a checked source document without modifying it", async () => {
		// Arrange
		const f = fixture();

		// Act
		const result = await f.workspace.read(identity, "title", "fr");

		// Assert
		expect(f.manageEvent.execute).toHaveBeenCalledExactlyOnceWith({
			identity,
			mode: "check",
			sourceDocument: f.current,
		});
		expect(result).toMatchObject({
			document: f.current,
			event: f.currentEvent,
			destination: f.currentEvent.eventTitle,
			plan: {
				target: "title",
				language: "fr",
				facts: {
					date: f.currentEvent.date,
					month: "Septembre",
					host: { name: "Example Host", city: "Example City" },
					talks: [{ title: "Reliable platforms" }],
				},
			},
		});
		expect(f.deps.repository.applyPatch).not.toHaveBeenCalled();
		expect(f.announcement).not.toHaveBeenCalled();
	});

	it("rejects an unavailable source before verification", async () => {
		// Arrange
		const f = fixture();
		vi.mocked(f.deps.repository.find).mockResolvedValue(null);

		// Act
		const result = f.workspace.read(identity, "title", "en");

		// Assert
		await expect(result).rejects.toThrow("Content source issue is unavailable");
		expect(f.manageEvent.execute).not.toHaveBeenCalled();
	});

	it("ignores an issue skipped by event verification", async () => {
		// Arrange
		const f = fixture();
		const checked = await f.manageEvent.execute({ identity, mode: "check" });
		f.manageEvent.execute.mockResolvedValue({ ...checked, skipped: true });

		// Act
		const result = await f.workspace.read(
			identity,
			"linkedin:announcement",
			"en",
		);

		// Assert
		expect(result).toBeUndefined();
		expect(f.announcement).not.toHaveBeenCalled();
	});

	it.each<Partial<MeetupEvent>>([
		{ issueState: "closed" },
		{ occurrenceStatus: "cancelled" },
		{ occurrenceStatus: "postponed" },
		{ occurrenceStatus: "held" },
		{ proposalStatus: "stale" },
	])("ignores inactive events %j", async (overrides) => {
		// Arrange
		const f = fixture(overrides);

		// Act
		const result = await f.workspace.read(
			identity,
			"linkedin:announcement",
			"en",
		);

		// Assert
		expect(result).toBeUndefined();
		expect(f.announcement).not.toHaveBeenCalled();
	});

	it("propagates failed source verification before reading media", async () => {
		// Arrange
		const f = fixture();
		const checked = await f.manageEvent.execute({ identity, mode: "check" });
		f.manageEvent.execute.mockResolvedValue({
			...checked,
			diagnostics: [
				{
					code: "referential.source.unavailable",
					severity: "error",
					message: "Unavailable",
				},
			],
		});

		// Act
		const result = f.workspace.read(identity, "linkedin:announcement", "en");

		// Assert
		await expect(result).rejects.toThrow("Content source verification failed");
		expect(f.announcement).not.toHaveBeenCalled();
	});

	it.each([
		"event.agenda.speaker.invalid",
		"event.proposals.not-found",
		"referential.speaker.id.invalid",
		"referential.reference.speaker.unknown",
	])("omits unresolved talks when %s is reported", async (code) => {
		// Arrange
		const f = fixture();
		const checked = await f.manageEvent.execute({ identity, mode: "check" });
		f.manageEvent.execute.mockResolvedValue({
			...checked,
			diagnostics: [{ code, severity: "error", message: "Unresolved agenda" }],
		});

		// Act
		const result = await f.workspace.read(identity, "description", "fr");

		// Assert
		expect(result?.plan.facts.talks).toEqual([]);
		expect(result?.event.agenda).toEqual(f.currentEvent.agenda);
		expect(f.currentEvent.agenda).toHaveLength(1);
	});

	it("retains talks when agenda diagnostics are informational", async () => {
		// Arrange
		const f = fixture();
		const checked = await f.manageEvent.execute({ identity, mode: "check" });
		f.manageEvent.execute.mockResolvedValue({
			...checked,
			diagnostics: [
				{
					code: "event.agenda.normalized",
					severity: "info",
					message: "Normalized",
				},
			],
		});

		// Act
		const result = await f.workspace.read(identity, "description", "en");

		// Assert
		expect(result?.plan.facts.talks).toHaveLength(1);
	});

	it.each(["slack-aix:announcement", "linkedin:d7"] as const)(
		"blocks %s when the registration link is invalid",
		async (target) => {
			// Arrange
			const f = fixture();
			const checked = await f.manageEvent.execute({ identity, mode: "check" });
			f.manageEvent.execute.mockResolvedValue({
				...checked,
				diagnostics: [
					{
						code: "event.link.meetup.invalid",
						severity: "error",
						message: "Invalid link",
					},
				],
			});

			// Act
			const result = await f.workspace.read(identity, target, "en");

			// Assert
			expect(result).toBeUndefined();
			expect(f.announcement).not.toHaveBeenCalled();
		},
	);

	it.each(["", "not-a-date", "2026-13-30"])(
		"blocks reminders with invalid date %j",
		async (date) => {
			// Arrange
			const f = fixture({ date });

			// Act
			const result = await f.workspace.read(identity, "linkedin:d0", "en");

			// Assert
			expect(result).toBeUndefined();
			expect(f.announcement).not.toHaveBeenCalled();
		},
	);

	it.each<ContentTarget>([
		"linkedin:announcement",
		"linkedin:d7",
		"linkedin:d0",
	])("attaches the verified announcement to %s", async (target) => {
		// Arrange
		const f = fixture();

		// Act
		const result = await f.workspace.read(identity, target, "en");

		// Assert
		expect(result?.plan.facts.announcement).toEqual(media);
		expect(result?.destination).toBeNull();
		expect(f.announcement).toHaveBeenCalledExactlyOnceWith(f.currentEvent);
	});

	it("omits a changed announcement so it cannot enter a new draft", async () => {
		// Arrange
		const f = fixture();
		f.announcement.mockRejectedValue(new ContentMediaChangedError());

		// Act
		const result = await f.workspace.read(
			identity,
			"linkedin:announcement",
			"en",
		);

		// Assert
		expect(result?.plan.facts.announcement).toBeNull();
	});

	it("propagates unexpected announcement failures", async () => {
		// Arrange
		const f = fixture();
		const error = new Error("Media provider unavailable");
		f.announcement.mockRejectedValue(error);

		// Act
		const result = f.workspace.read(identity, "linkedin:announcement", "en");

		// Assert
		await expect(result).rejects.toBe(error);
	});
});
