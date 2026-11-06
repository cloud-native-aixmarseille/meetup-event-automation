import { PublicationDomainComposition } from "@meetup-automation/publication";
import { describe, expect, it, vi } from "vitest";
import { DriveManifestDateFormats } from "./drive-manifest-date-formats.js";

function fixture(token = "event.date.numeric") {
	const domain = new PublicationDomainComposition();
	const collections = { rekey: vi.fn(() => "converted layout") };
	const codec = new DriveManifestDateFormats(
		domain.contentTextKey(),
		collections,
	);
	const binding = {
		id: "date-shape",
		type: "text",
		key: token,
		anchor: { objectId: "date-shape", pageId: "cover" },
		applied: domain.contentFingerprint().of("15/10/2026"),
		desired: domain.contentFingerprint().of("12/11/2026"),
	};
	const saved = {
		version: 1,
		fileId: "copy",
		templateId: "template",
		mimeType: "application/vnd.google-apps.presentation",
		initialRevision: "copy-revision",
		contract: {
			version: 1,
			revision: "definition",
			kind: "slides",
			fields: [
				{ type: "text", token, required: false, fallback: "To be announced" },
			],
		},
		bindings: [binding],
		pending: { revision: "write-revision", bindings: [binding] },
	};
	return { domain, codec, collections, saved };
}

describe("stored date references", () => {
	it.each([
		["event.date.numeric", "event.date", "DD/MM/YYYY"],
		["next_event.date.numeric", "next_event.date", "DD/MM/YYYY"],
		["event.date.month", "event.date", "month"],
		["event.date.weekday", "event.date", "weekday"],
	] as const)(
		"preserves write evidence when restoring %s",
		(stored, token, format) => {
			// Arrange
			const f = fixture(stored);
			const before = structuredClone(f.saved);
			const key = f.domain.contentTextKey().of({ token, format });
			// Act
			const decoded = f.codec.decode(f.saved);
			const parsed = f.domain
				.contentManifestPolicy()
				.parse(decoded, "copy", "template", f.saved.mimeType);
			const repeated = f.codec.decode(parsed);
			// Assert
			expect(parsed).toEqual({
				...f.saved,
				contract: {
					...f.saved.contract,
					fields: [{ ...f.saved.contract.fields[0], token, format }],
				},
				bindings: [{ ...f.saved.bindings[0], key }],
				pending: {
					...f.saved.pending,
					bindings: [{ ...f.saved.pending.bindings[0], key }],
				},
			});
			expect(repeated).toEqual(parsed);
			expect(f.saved).toEqual(before);
		},
	);

	it("retains both anchors when saved fields share the same date format", () => {
		// Arrange
		const f = fixture();
		const field = {
			type: "text",
			token: "event.date",
			format: "DD/MM/YYYY",
			required: false,
			fallback: "To be announced",
		};
		const key = f.domain
			.contentTextKey()
			.of({ token: "event.date", format: "DD/MM/YYYY" });
		const second = {
			...f.saved.bindings[0],
			key,
			id: "second-date",
			anchor: { pageId: "news", objectId: "second-date" },
		};
		const saved = {
			...f.saved,
			contract: {
				...f.saved.contract,
				fields: [...f.saved.contract.fields, field],
			},
			bindings: [...f.saved.bindings, second],
			pending: undefined,
		};
		// Act
		const parsed = f.domain
			.contentManifestPolicy()
			.parse(f.codec.decode(saved), "copy", "template", f.saved.mimeType);
		// Assert
		expect(parsed.contract.fields).toEqual([field]);
		expect(parsed.bindings).toEqual([{ ...f.saved.bindings[0], key }, second]);
	});

	it.each(["changed", "missing"])(
		"preserves the %s content conflict",
		(condition) => {
			// Arrange
			const f = fixture();
			const manifest = f.domain
				.contentManifestPolicy()
				.parse(f.codec.decode(f.saved), "copy", "template", f.saved.mimeType);
			const binding = manifest.bindings[0];
			const snapshot = {
				revision: "observed-revision",
				locations:
					condition === "missing"
						? []
						: [
								{
									...binding,
									fingerprint: f.domain
										.contentFingerprint()
										.of("Organizer's edited date"),
								},
							],
			};
			// Act
			const plan = () =>
				f.domain.contentRenderPlan().changes(manifest, snapshot, []);
			// Assert
			expect(plan).toThrowError(expect.objectContaining({ code: "conflict" }));
		},
	);

	it("settles a completed interrupted date write with the same anchors", () => {
		// Arrange
		const f = fixture();
		f.saved.pending.bindings = [
			{ ...f.saved.bindings[0], applied: f.saved.bindings[0].desired },
		];
		const manifest = f.domain
			.contentManifestPolicy()
			.parse(f.codec.decode(f.saved), "copy", "template", f.saved.mimeType);
		const snapshot = {
			revision: "observed-revision",
			locations: [
				{ ...manifest.bindings[0], fingerprint: f.saved.bindings[0].desired },
			],
		};
		// Act
		const settled = f.domain
			.contentRenderPlan()
			.settle(manifest, snapshot, false);
		// Assert
		expect(settled.pending).toBeUndefined();
		expect(settled.bindings[0]).toEqual({
			...manifest.bindings[0],
			applied: f.saved.bindings[0].desired,
		});
	});

	it("delegates collection layout keys without changing collection write evidence", () => {
		// Arrange
		const f = fixture();
		const field = {
			type: "collection",
			token: "talks",
			slot: "talk-cards",
			fields: f.saved.contract.fields,
			template: "opaque layout",
		};
		const binding = {
			...f.saved.bindings[0],
			type: "collection",
			key: "talk-cards",
		};
		const saved = {
			...f.saved,
			contract: { ...f.saved.contract, fields: [field] },
			bindings: [binding],
			pending: { revision: "r2", bindings: [binding] },
		};
		// Act
		const decoded = f.codec.decode(saved);
		// Assert
		expect(decoded).toMatchObject({
			bindings: [binding],
			pending: saved.pending,
			contract: {
				fields: [
					{
						...field,
						template: "converted layout",
						fields: [
							{
								type: "text",
								token: "event.date",
								format: "DD/MM/YYYY",
								required: false,
								fallback: "To be announced",
							},
						],
					},
				],
			},
		});
		expect(f.collections.rekey).toHaveBeenCalledWith(
			"opaque layout",
			new Map([
				[
					"event.date.numeric",
					f.domain
						.contentTextKey()
						.of({ token: "event.date", format: "DD/MM/YYYY" }),
				],
			]),
		);
	});

	it.each([{ format: "YYYY" }, { slot: "1" }, { unexpected: true }])(
		"rejects contradictory saved fields %j",
		(extra) => {
			// Arrange
			const f = fixture();
			Object.assign(f.saved.contract.fields[0], extra);
			// Act
			const parse = () =>
				f.domain
					.contentManifestPolicy()
					.parse(f.codec.decode(f.saved), "copy", "template", f.saved.mimeType);
			// Assert
			expect(parse).toThrow();
		},
	);
});
