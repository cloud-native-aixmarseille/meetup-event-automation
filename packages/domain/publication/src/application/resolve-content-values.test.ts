import { describe, expect, it } from "vitest";
import { contentFixture, contract } from "../../testing/content.fixtures.js";
import { ResolveContentValues } from "./resolve-content-values.js";

describe("slotted content values", () => {
	it("resolves explicit slots literally and falls back after a participant is removed", async () => {
		// Arrange
		const resolver = new ResolveContentValues(contentFixture().images);
		const fields = [
			{ type: "text", token: "talk.title", slot: "opening", required: true },
			{
				type: "text",
				token: "speaker.name",
				slot: "portrait",
				required: false,
				fallback: "To be announced",
			},
		] as const;

		// Act
		const values = await resolver.execute(
			{ ...contract, fields },
			{
				text: { "talk.title:opening": "Literal {{event.title}}" },
				pictures: {},
			},
		);

		// Assert
		expect(values).toMatchObject([
			{ key: "talk.title:opening", text: "Literal {{event.title}}" },
			{ key: "speaker.name:portrait", text: "To be announced" },
		]);
	});

	it("blocks required missing slots instead of substituting another talk", async () => {
		// Arrange
		const resolver = new ResolveContentValues(contentFixture().images);
		const fields = [
			{ type: "text", token: "talk.title", slot: "opening", required: true },
		] as const;

		// Act
		const result = resolver.execute(
			{ ...contract, fields },
			{ text: { "talk.title:closing": "Different talk" }, pictures: {} },
		);

		// Assert
		await expect(result).rejects.toMatchObject({ code: "missing" });
	});
});
