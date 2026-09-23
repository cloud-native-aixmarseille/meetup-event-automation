import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import { MessageLocalizer } from "./message-localizer.js";

const catalogs = {
	en: {
		"example.count": "{count, number} items.",
		"example.plural": "{count, plural, one {# item} other {# items}}",
		"example.literal": "Value: {value}",
		"example.plain": "Plain text.",
	},
	fr: {
		"example.count": "{count, number} éléments.",
		"example.plural":
			"{count, plural, =0 {Aucun élément} one {# élément} other {# éléments}}",
		"example.literal": "Valeur : {value}",
		"example.plain": "Texte simple.",
	},
} as const;
type Id = keyof typeof catalogs.en;
interface ExampleParameters {
	"example.count": { count: number };
	"example.plural": { count: number };
	"example.literal": { value: string };
}

afterEach(() => vi.restoreAllMocks());

describe("MessageLocalizer", () => {
	it.each([
		["", "en"],
		["en-GB", "en"],
		["fr", "fr"],
		[" fr-CA ", "fr"],
		["FR_fr", "fr"],
		["de-DE", "en"],
		["not a locale", "en"],
	])("resolves %s to %s", (requested, expected) => {
		// Arrange
		const messages = new MessageLocalizer(catalogs, requested);
		// Act
		const locale = messages.locale;
		// Assert
		expect(locale).toBe(expected);
	});
	it.each([
		[0, "Aucun élément"],
		[1, "1 élément"],
		[2, "2 éléments"],
	])("uses ICU plural rules for %i", (count, expected) => {
		// Arrange
		const messages = new MessageLocalizer<Id, ExampleParameters>(
			catalogs,
			"fr",
		);
		// Act
		const text = messages.t("example.plural", { count: Number(count) });
		// Assert
		expect(text).toBe(expected);
	});
	it("isolates locale and catalogs even when owners reuse the same key", () => {
		// Arrange
		const french = new MessageLocalizer<Id, ExampleParameters>(catalogs, "fr");
		const english = new MessageLocalizer<Id, ExampleParameters>(catalogs);
		const other = new MessageLocalizer<Id, ExampleParameters>(
			{
				...catalogs,
				fr: { ...catalogs.fr, "example.count": "Autre : {count, number}" },
			},
			"fr",
		);
		// Act
		const before = french.t("example.count", { count: 1234 });
		const otherText = other.t("example.count", { count: 1234 });
		const englishText = english.t("example.count", { count: 1234 });
		const after = french.t("example.count", { count: 1234 });
		// Assert
		expect(before).toBe("1\u202f234 éléments.");
		expect(otherText).toBe("Autre : 1\u202f234");
		expect(englishText).toBe("1,234 items.");
		expect(after).toBe(before);
	});
	it.each([undefined, "", "{count, plural, broken}"])(
		"falls back to English formatting for missing, empty or invalid translations: %s",
		(translation) => {
			// Arrange
			const translated =
				translation === undefined ? {} : { "example.count": translation };
			const messages = new MessageLocalizer<Id, ExampleParameters>(
				{ ...catalogs, fr: translated },
				"fr",
			);
			const errors = vi.spyOn(console, "error").mockImplementation(() => {});
			const warnings = vi.spyOn(console, "warn").mockImplementation(() => {});
			// Act
			const text = messages.t("example.count", { count: 1234 });
			// Assert
			expect(text).toBe("1,234 items.");
			expect(errors).not.toHaveBeenCalled();
			expect(warnings).not.toHaveBeenCalled();
		},
	);
	it("does not expose private interpolation values when both templates fail", () => {
		// Arrange
		const messages = new MessageLocalizer<Id, ExampleParameters>(
			{
				...catalogs,
				en: { ...catalogs.en, "example.literal": "{value} {missing}" },
				fr: { ...catalogs.fr, "example.literal": "{value} {missing}" },
			},
			"fr",
		);
		const errors = vi.spyOn(console, "error").mockImplementation(() => {});
		const warnings = vi.spyOn(console, "warn").mockImplementation(() => {});
		// Act
		const text = messages.t("example.literal", {
			value: "private@example.invalid",
		});
		// Assert
		expect(text).not.toContain("private@example.invalid");
		expect(errors).not.toHaveBeenCalled();
		expect(warnings).not.toHaveBeenCalled();
	});
	it("treats catalog HTML and interpolated ICU syntax as literal text for the caller to escape", () => {
		// Arrange
		const messages = new MessageLocalizer<Id, ExampleParameters>(
			{
				...catalogs,
				fr: { ...catalogs.fr, "example.literal": "<b>{value}</b>" },
			},
			"fr",
		);
		const value = "<script>{count, plural, one {x}}</script>";
		// Act
		const text = messages.t("example.literal", { value });
		// Assert
		expect(text).toBe(`<b>${value}</b>`);
	});
	it("exposes only the owner's keys and requires their declared parameters", () => {
		// Arrange
		const messages = new MessageLocalizer<Id, ExampleParameters>(catalogs);
		// Act
		const count = messages.t<"example.count">;
		const plain = messages.t<"example.plain">;
		// Assert
		expectTypeOf(count).parameters.toEqualTypeOf<
			[key: "example.count", parameters: { count: number }]
		>();
		expectTypeOf(plain).parameters.toEqualTypeOf<[key: "example.plain"]>();
		expectTypeOf<Parameters<typeof messages.t>[0]>().toEqualTypeOf<Id>();
	});
});
