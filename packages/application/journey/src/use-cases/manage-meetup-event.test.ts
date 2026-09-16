import { describe, expect, it, vi } from "vitest";
import {
	catalog,
	config,
	createEventDependencies,
	identity,
} from "../../testing/meetup-journey.fixtures.js";
import { ManageMeetupEvent } from "./manage-meetup-event.js";

describe("ManageMeetupEvent manual publication tasks", () => {
	it("honors injected rules instead of replacing them with defaults", async () => {
		// Arrange
		const evaluate = vi.fn().mockReturnValue({
			patch: { operations: [] },
			diagnostics: [
				{
					code: "event.custom-policy",
					severity: "error",
					category: "invalid",
					message: "Custom event policy failed",
				},
			],
		});
		const useCase = new ManageMeetupEvent({
			config,
			referentialRepository: { load: async () => catalog },
			eventDependencies: {
				...createEventDependencies(),
				rules: [{ id: "custom-policy", dependencies: [], evaluate }],
			},
		});

		// Act
		const result = await useCase.execute({ identity, mode: "check" });

		// Assert
		expect(evaluate).toHaveBeenCalledOnce();
		expect(result).toMatchObject({
			skipped: false,
			isReady: false,
			diagnostics: expect.arrayContaining([
				expect.objectContaining({ code: "event.custom-policy" }),
			]),
		});
	});

	it("returns composed task status and diagnoses only pending manual work", async () => {
		// Arrange
		const eventDependencies = createEventDependencies();
		const useCase = new ManageMeetupEvent({
			config,
			referentialRepository: {
				load: vi.fn().mockResolvedValue(catalog),
			},
			eventDependencies: eventDependencies,
		});

		// Act
		const result = await useCase.execute({
			identity,
			mode: "check",
		});

		// Assert
		expect(result.skipped).toBe(false);
		if (result.skipped) {
			throw new Error("Expected the meetup event to be managed");
		}
		expect(result.manualPublicationTasks).toEqual([
			expect.objectContaining({
				kind: "publish-meetup-event",
				status: "completed",
			}),
			expect.objectContaining({
				kind: "publish-community-event",
				status: "completed",
			}),
			expect.objectContaining({
				kind: "create-asset-folder",
				status: "completed",
			}),
			expect.objectContaining({
				kind: "publish-slides",
				status: "completed",
			}),
			expect.objectContaining({
				kind: "import-attendance",
				status: "pending",
			}),
		]);
		expect(result.diagnostics).toContainEqual(
			expect.objectContaining({
				code: "publication.manual-task.import-attendance.pending",
				severity: "info",
			}),
		);
		expect(result.diagnostics.map(({ code }) => code)).not.toContain(
			"publication.manual-task.publish-slides.pending",
		);
	});
});
