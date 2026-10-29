import { describe, expect, it } from "vitest";
import { facts } from "../../../../application/journey/testing/promotional-content.fixtures.js";
import { ContentValueSchema } from "./content-value-schema.js";

describe("cover context schema", () => {
	it.each([null, 42, {}, "a".repeat(49_001)])(
		"rejects invalid or oversized description context %#",
		(eventDescription) => {
			// Arrange
		const schema = new ContentValueSchema({
			valid: (value?: string): value is string => typeof value === "string",
		});

			// Act
			const parse = () => schema.facts({ ...facts, eventDescription });

			// Assert
			expect(parse).toThrow("Invalid content text");
		},
	);
});
