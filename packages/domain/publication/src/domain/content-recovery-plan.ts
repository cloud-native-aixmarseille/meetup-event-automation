import type {
	ContentManifest,
	ContentRecovery,
	ContentSnapshot,
} from "./asset-content.js";
import { ContentError } from "./content-error.js";
import type { ContentRecoveryFingerprint } from "./content-recovery-fingerprint.js";
import type { ContentRenderPlan } from "./content-render-plan.js";

/** Recovery changes ownership only at the organizer's observed revision. */
export interface ContentRecoveryPlanCollaborators {
	readonly contentRecoveryFingerprint: Pick<
		ContentRecoveryFingerprint,
		"matches" | "create"
	>;
	readonly contentRenderPlan: Pick<ContentRenderPlan, "settle" | "fingerprint">;
}

export class ContentRecoveryPlan {
	constructor(
		private readonly collaborators: ContentRecoveryPlanCollaborators,
	) {}

	active(
		manifest: ContentManifest,
		recovery?: ContentRecovery,
	): ContentRecovery | undefined {
		return recovery &&
			!this.collaborators.contentRecoveryFingerprint.matches(
				recovery,
				manifest.recoveryId,
			)
			? recovery
			: undefined;
	}

	beforeRead(
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

	settle(
		original: ContentManifest,
		snapshot: ContentSnapshot,
		recovery?: ContentRecovery,
	): ContentManifest {
		if (recovery && snapshot.revision !== recovery.revision)
			throw new ContentError("revision");
		let manifest =
			recovery?.operation === "restore"
				? this.restore(original, snapshot, recovery.bindingId)
				: original;
		if (manifest.pending)
			manifest = this.collaborators.contentRenderPlan.settle(
				manifest,
				snapshot,
				false,
			);
		return recovery
			? {
					...manifest,
					recoveryId:
						this.collaborators.contentRecoveryFingerprint.create(recovery),
				}
			: manifest;
	}

	private restore(
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
							applied: this.collaborators.contentRenderPlan.fingerprint(
								snapshot,
								binding.id,
							),
							desired: undefined,
						}
					: binding,
			),
		};
	}
}
