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
