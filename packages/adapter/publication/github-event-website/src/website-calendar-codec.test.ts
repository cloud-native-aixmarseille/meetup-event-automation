import { describe, expect, it } from "vitest";
import {
	calendar,
	plannedRow,
	publishedRow,
	websiteEvent,
} from "../testing/website.fixtures.js";
import { GithubEventWebsiteComposition } from "./dependency-composition.js";
import { WebsiteCalendarCodec } from "./website-calendar-codec.js";
import { WebsiteEventRow } from "./website-event-row.js";

const codec = new WebsiteCalendarCodec(
	new WebsiteEventRow(new GithubEventWebsiteComposition().messages("fr")),
);
describe("website calendar", () => {
	it.each(["\n", "\r\n"])(
		"updates a planned date while preserving unrelated bytes and %j newlines",
		(newline) => {
			// Arrange
			const input = calendar.replaceAll("\n", newline);
			// Act
			const output = codec.upsert(input, websiteEvent);
			// Assert
			expect(output).toBe(input.replace(plannedRow, publishedRow));
		},
	);
	it("does not change an already synchronized calendar", () => {
		// Arrange
		const input = calendar.replace(plannedRow, publishedRow);
		// Act
		const output = codec.upsert(input, websiteEvent);
		// Assert
		expect(output).toBe(input);
	});
	it("updates the same Meetup URL when its date moves to another month", () => {
		// Arrange
		const input = calendar.replace(plannedRow, publishedRow);
		const event = { ...websiteEvent, date: "2028-07-13" };
		// Act
		const output = codec.upsert(input, event);
		// Assert
		expect(output.match(/events\/123/g)).toHaveLength(1);
		expect(output).not.toContain(publishedRow);
		expect(output).toContain("| Juillet | [2028-07-13]");
		expect(output).not.toContain("Future Host");
	});
	it("adds another event without replacing an already published meetup in that month", () => {
		// Arrange
		const input = calendar.replace(
			plannedRow,
			publishedRow.replace("events/123/", "events/456/"),
		);
		// Act
		const output = codec.upsert(input, websiteEvent);
		// Assert
		expect(output).toContain("events/456/");
		expect(output).toContain(publishedRow);
		expect(output.indexOf(publishedRow)).toBeLessThan(
			output.indexOf("| Juillet |"),
		);
	});
	it("creates a new year above the previous year", () => {
		// Arrange
		const event = { ...websiteEvent, date: "2029-01-11" };
		// Act
		const output = codec.upsert(calendar, event);
		// Assert
		expect(output).toContain(
			"## 2029\n\n| Mois | Date cible | Lieu |\n| --- | --- | --- |\n| Janvier | [2029-01-11]",
		);
		expect(output.slice(output.indexOf("## 2028"))).toBe(
			calendar.slice(calendar.indexOf("## 2028")),
		);
	});
	it("preserves non-calendar links rather than guessing which event they represent", () => {
		// Arrange
		const input = calendar.replace(
			"2028-06-08",
			"[Information](https://example.test/info)",
		);
		// Act
		const output = codec.upsert(input, websiteEvent);
		// Assert
		expect(output).toContain("[Information](https://example.test/info)");
		expect(output).toContain(publishedRow);
	});
	it.each([
		calendar.replace(plannedRow, `${plannedRow}\n${plannedRow}`),
		calendar.replace(plannedRow, `${publishedRow}\n${publishedRow}`),
		`${calendar}\n## 2028\n`,
	])("rejects ambiguous rows or duplicate years", (input) => {
		// Arrange
		const run = () => codec.upsert(input, websiteEvent);
		// Act
		let error: unknown;
		try {
			run();
		} catch (caught) {
			error = caught;
		}
		// Assert
		expect(error).toMatchObject({ kind: "conflict" });
	});
	it.each([
		"unrecognized content",
		calendar.replace("| --- | --- | --- |", "| --- | --- |"),
		calendar.replace("| Mois | Date cible | Lieu |", "| Mois | Date |"),
	])("refuses unsupported calendars", (input) => {
		// Arrange
		const run = () => codec.upsert(input, websiteEvent);
		// Act
		let error: unknown;
		try {
			run();
		} catch (caught) {
			error = caught;
		}
		// Assert
		expect(error).toMatchObject({ kind: "format" });
	});
});
