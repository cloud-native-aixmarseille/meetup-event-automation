import { PublicationDomainComposition } from "@meetup-automation/publication";
import { describe, expect, it, vi } from "vitest";
import { AssetFileNameComposition } from "./asset-file-name-composition.js";

describe("asset filename locale composition", () => {
	it("rejects an unsupported date pattern before reconciling any assets", async () => {
		// Arrange
		const names = new AssetFileNameComposition().create("fr");
		const repository = {
			listTemplates: vi.fn().mockResolvedValue([
				{
					id: "slides",
					kind: "slides",
					name: "[EVENT_DATE:YYYY-MM-DD] - Slides",
				},
				{
					id: "announcement",
					kind: "announcement",
					name: "[EVENT_DATE:YYY-MM-DD]",
				},
			]),
			findContainer: vi.fn(),
			ensureContainer: vi.fn(),
			listFiles: vi.fn(),
			copyTemplate: vi.fn(),
			updateFile: vi.fn(),
		};
		const reconcile = new PublicationDomainComposition().reconcileEventAssets(
			names,
			repository,
		);

		// Act
		const result = reconcile.execute({
			eventId: "event",
			date: "2027-04-05",
			hostName: "Community",
			mode: "fix",
		});

		// Assert
		await expect(result).rejects.toThrow("Invalid template format");
		expect(repository.ensureContainer).not.toHaveBeenCalled();
		expect(repository.copyTemplate).not.toHaveBeenCalled();
		expect(repository.updateFile).not.toHaveBeenCalled();
	});

	it.each([
		["en", "April 2027"],
		["fr", "avril 2027"],
	])("binds the %s locale to every filename expression", (locale, month) => {
		// Arrange
		const names = new AssetFileNameComposition().create(locale);

		// Act
		const name = names.render(
			"[EVENT_DATE:YYYY-MM-DD] - [EVENT_DATE:MMMM YYYY] - Slides",
			"2027-04-05",
		);

		// Assert
		expect(name).toBe(`2027-04-05 - ${month} - Slides`);
	});
});
