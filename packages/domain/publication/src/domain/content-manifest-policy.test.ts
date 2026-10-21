import { describe, expect, it } from "vitest";
import { contentFixture } from "../../testing/content.fixtures.js";
import { ContentManifestPolicy } from "./content-manifest-policy.js";

describe("manifest image identities", () => {
	it.each([
		["current", { hostId: "speaker-one" }],
		["current", { speakerId: "speaker-one" }],
		["pending", { hostId: "invalid" }],
		["pending", { hostId: "host-one", speakerId: "speaker-one" }],
	])(
		"rejects incompatible %s host-logo identities",
		async (state, identity) => {
			// Arrange
			const f = contentFixture(true, undefined, "host.logo");
			await f.service.execute(f.input);
			const manifest = f.state.manifest;
			if (!manifest) throw new Error("Missing manifest fixture");
			const bindings = manifest.bindings.map((binding) =>
				binding.type === "image" ? { ...binding, ...identity } : binding,
			);
			const input =
				state === "pending"
					? { ...manifest, pending: { revision: "2", bindings } }
					: { ...manifest, bindings };
			let error: unknown;

			// Act
			try {
				ContentManifestPolicy.parse(
					input,
					f.input.fileId,
					f.input.templateId,
					f.input.mimeType,
				);
			} catch (caught) {
				error = caught;
			}

			// Assert
			expect(error).toMatchObject({ code: "recovery" });
		},
	);
});

describe("manifest shape and anchor ownership", () => {
	it.each([
		null,
		[],
		false,
		{
			version: 1,
			fileId: "file",
			templateId: "template",
			mimeType: "slides",
			contract: [],
		},
	])("rejects untrusted shapes with a recovery failure", (input) => {
		// Arrange
		const identity = { file: "file", template: "template", mime: "slides" };

		// Act
		const parse = () =>
			ContentManifestPolicy.parse(
				input,
				identity.file,
				identity.template,
				identity.mime,
			);

		// Assert
		expect(parse).toThrowError(expect.objectContaining({ code: "recovery" }));
	});

	it("accepts the same pending anchors with reordered properties", async () => {
		// Arrange
		const f = contentFixture();
		await f.service.execute(f.input);
		const manifest = f.state.manifest;
		if (!manifest) throw new Error("Missing manifest fixture");
		const bindings = manifest.bindings.map((binding) => ({
			...binding,
			anchor: Object.fromEntries(Object.entries(binding.anchor).reverse()),
		}));
		const input = { ...manifest, pending: { revision: "2", bindings } };

		// Act
		const parsed = ContentManifestPolicy.parse(
			input,
			f.input.fileId,
			f.input.templateId,
			f.input.mimeType,
		);

		// Assert
		expect(parsed.pending?.bindings).toEqual(bindings);
	});
});
