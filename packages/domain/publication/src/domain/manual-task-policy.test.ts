import { describe, expect, it } from "vitest";
import { ManualPublicationPolicy } from "./manual-task-policy.js";
import type { PublicationEvent } from "./model.js";

function event(overrides: Partial<PublicationEvent> = {}): PublicationEvent {
	return {
		eventId: "cloud-native-aixmarseille/meetups#42",
		title: "Cloud Native Evening",
		description: "An evening about cloud-native technology",
		date: "2026-09-30",
		timeZone: "Europe/Paris",
		occurrenceStatus: "scheduled",
		references: {},
		slidesPublished: false,
		attendanceImported: false,
		...overrides,
	};
}

describe("manual publication tasks", () => {
	it("keeps publication tasks explicit while adapters do not exist", () => {
		// Arrange
		// No additional setup is needed.

		// Act
		const tasks = ManualPublicationPolicy.planManualPublicationTasks(event());

		// Assert
		expect(tasks).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					kind: "publish-meetup-event",
					status: "pending",
				}),
				expect.objectContaining({
					kind: "create-asset-folder",
					status: "pending",
				}),
				expect.objectContaining({
					kind: "publish-slides",
					status: "not-applicable",
				}),
			]),
		);
	});

	it("requires post-event work only after occurrence is explicitly held", () => {
		// Arrange
		// No additional setup is needed.

		// Act
		const tasks = ManualPublicationPolicy.planManualPublicationTasks(
			event({
				occurrenceStatus: "held",
				references: {
					meetup:
						"https://www.meetup.com/cloud-native-aix-marseille/events/123",
					community:
						"https://ocgroups.dev/cncf/group/cloud-native-aix-marseille/event/event",
					assets: "https://drive.google.com/drive/folders/folder",
				},
				slidesPublished: false,
				attendanceImported: true,
			}),
		);

		// Assert
		expect(tasks).toContainEqual(
			expect.objectContaining({ kind: "publish-slides", status: "pending" }),
		);
		expect(tasks).toContainEqual(
			expect.objectContaining({
				kind: "import-attendance",
				status: "completed",
			}),
		);
	});

	it("marks all tasks inapplicable when cancelled", () => {
		// Arrange
		// No additional setup is needed.

		// Act
		const tasks = ManualPublicationPolicy.planManualPublicationTasks(
			event({ occurrenceStatus: "cancelled" }),
		);
		const actual = tasks.every((task) => task.status === "not-applicable");

		// Assert
		expect(tasks).toHaveLength(5);
		expect(actual).toBe(true);
	});
});
