import type {
	ContentManifest,
	ContentRecovery,
	ContentSnapshot,
} from "./asset-content.js";
import { ContentError } from "./content-error.js";
import { ContentRecoveryFingerprint } from "./content-recovery-fingerprint.js";
import { ContentRenderPlan } from "./content-render-plan.js";

/** Recovery changes ownership only at the organizer's observed revision. */
export class ContentRecoveryPlan {
	static active(
		manifest: ContentManifest,
		recovery?: ContentRecovery,
	): ContentRecovery | undefined {
		return recovery &&
			!ContentRecoveryFingerprint.matches(recovery, manifest.recoveryId)
			? recovery
			: undefined;
	}

	static beforeRead(
		manifest: ContentManifest,
		recovery?: ContentRecovery,
	): ContentManifest {
		if (recovery?.operation !== "remove") return manifest;
		return {
			...manifest,
			pending: undefined,
			bindings: manifest.bindings.filter(
				(binding) => binding.id !== recovery.bindingId,
			),
		};
	}

	static settle(
		original: ContentManifest,
		snapshot: ContentSnapshot,
		recovery?: ContentRecovery,
	): ContentManifest {
		if (recovery && snapshot.revision !== recovery.revision)
			throw new ContentError("revision");
		let manifest =
			recovery?.operation === "restore"
				? ContentRecoveryPlan.restore(original, snapshot, recovery.bindingId)
				: original;
		if (manifest.pending)
			manifest = ContentRenderPlan.settle(manifest, snapshot, false);
		return recovery
			? { ...manifest, recoveryId: ContentRecoveryFingerprint.create(recovery) }
			: manifest;
	}

	private static restore(
		manifest: ContentManifest,
		snapshot: ContentSnapshot,
		bindingId?: string,
	): ContentManifest {
		if (!manifest.bindings.some((binding) => binding.id === bindingId))
			throw new ContentError("recovery");
		return {
			...manifest,
			pending: undefined,
			bindings: manifest.bindings.map((binding) =>
				binding.id === bindingId
					? {
							...binding,
							applied: ContentRenderPlan.fingerprint(snapshot, binding.id),
							desired: undefined,
						}
					: binding,
			),
		};
	}
}
