import { describe, expect, expectTypeOf, it } from "vitest";
import { ActionMessages } from "./action-messages.js";

describe("ActionMessages", () => {
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
		const messages = new ActionMessages(requested);
		// Act
		const locale = messages.locale;
		// Assert
		expect(locale).toBe(expected);
	});
	it.each([
		[0, "active_events=0"],
		[1, "active_events=1"],
		[2, "active_events=2"],
	])("formats the technical event count %i", (count, expected) => {
		// Arrange
		const messages = new ActionMessages("fr");
		// Act
		const text = messages.t("report.events.count", { count: Number(count) });
		// Assert
		expect(text).toBe(expected);
	});
	it("formats numbers without leaking locale between instances", () => {
		// Arrange
		const french = new ActionMessages("fr");
		const english = new ActionMessages();
		// Act
		const before = french.t("report.referential.counts", {
			hosts: 1234,
			speakers: 2,
		});
		const other = english.t("report.events.count", { count: 1234 });
		const after = french.t("report.referential.counts", {
			hosts: 1234,
			speakers: 2,
		});
		// Assert
		expect(before).toContain("1\u202f234");
		expect(other).toBe("active_events=1,234");
		expect(after).toBe(before);
	});
	it("inserts values literally without treating them as ICU or HTML", () => {
		// Arrange
		const messages = new ActionMessages("fr");
		const reason = "<script>{other, plural, one {x}}</script>";
		// Act
		const text = messages.t("report.failed", { reason });
		// Assert
		expect(text).toBe(`failure=${reason}`);
	});
	it("translates known diagnostics and preserves already-redacted unknown diagnostics", () => {
		// Arrange
		const french = new ActionMessages("fr");
		const english = new ActionMessages();
		// Act
		const translated = french.diagnostic(
			"referential.speaker.id.duplicate",
			"English detail.",
		);
		const fallback = french.diagnostic("future.check", "Safe fallback.");
		const canonical = english.diagnostic(
			"referential.speaker.email.invalid",
			"Specific safe detail.",
		);
		// Assert
		expect(translated).toBe(
			"Les identifiants stables des intervenants doivent être uniques.",
		);
		expect(fallback).toBe("Safe fallback.");
		expect(canonical).toBe("Specific safe detail.");
	});
	it("requires the correct interpolation parameters at compile time", () => {
		// Arrange
		const messages = new ActionMessages();
		// Act
		const count = messages.t<"report.events.count">;
		const plain = messages.t<"report.referential.valid">;
		// Assert
		expectTypeOf(count).parameters.toEqualTypeOf<
			[key: "report.events.count", parameters: { count: number }]
		>();
		expectTypeOf(plain).parameters.toEqualTypeOf<
			[key: "report.referential.valid"]
		>();
	});
	it("localizes classified failures and falls back safely for unknown exceptions", () => {
		// Arrange
		const french = new ActionMessages("fr");
		const english = new ActionMessages();
		// Act
		const known = french.error("EventNotFoundError", "Safe English detail.");
		const unknown = french.error("UnknownError", "Safe English fallback.");
		const canonical = english.error(
			"EventNotFoundError",
			"Safe English detail.",
		);
		// Assert
		expect(known).toContain("L'événement est introuvable.");
		expect(unknown).toBe("Erreur technique inattendue.");
		expect(canonical).toBe("Safe English detail.");
	});
	it.each([
		"speaker-sync.authentication",
		"speaker-sync.mapping-required",
		"issue-form.out-of-date",
		"referential.speaker.email.invalid",
	])("translates speaker synchronization PR guidance for %s", (code) => {
		// Arrange
		const french = new ActionMessages("fr");

		// Act
		const translated = french.diagnostic(code, "MISSING");

		// Assert
		expect(translated).not.toBe("MISSING");
	});
});
