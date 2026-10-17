import { describe, expect, it } from "vitest";
import { AssetMessages } from "./asset-messages.js";
import { AssetRenderPresenterImpl } from "./asset-render-presenter.js";

describe("asset public presentation", () => {
	it.each([
		["en", "October 15, 2026", "Example and Other"],
		["fr", "15 octobre 2026", "Example et Other"],
	])("formats dates and co-speakers for %s", (locale, date, speakers) => {
		// Arrange
		const presenter = new AssetRenderPresenterImpl(new AssetMessages(locale));
		// Act
		const result = presenter.format({
			title: "Public title",
			date: "2026-10-15",
			timeZone: "Pacific/Kiritimati",
			hostName: "Public host",
			agenda: [{ title: "Talk", speakers: ["Example", "Other"] }],
			pictures: {},
		});
		// Assert
		expect(result.text["event.date"]).toBe(date);
		expect(result.text.agenda).toBe(`Talk - ${speakers}`);
	});
});
