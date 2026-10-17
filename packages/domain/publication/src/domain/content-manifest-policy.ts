import type { ContentBinding, ContentManifest } from "./asset-content.js";
import { ContentContractPolicy } from "./content-contract-policy.js";
import { ContentError } from "./content-error.js";
import { ContentTextKey } from "./content-text-key.js";

export class ContentManifestPolicy {
	static parse(
		value: unknown,
		fileId: string,
		templateId: string,
		mimeType: string,
	): ContentManifest {
		const manifest = value as ContentManifest;
		if (
			manifest?.version !== 1 ||
			manifest.fileId !== fileId ||
			manifest.templateId !== templateId ||
			manifest.mimeType !== mimeType ||
			!ContentContractPolicy.keys(manifest, [
				"version",
				"fileId",
				"templateId",
				"mimeType",
				"contract",
				"bindings",
				"pending",
				"initialRevision",
				"recoveryId",
			])
		)
			throw new ContentError("recovery");
		ContentContractPolicy.parse(
			manifest.contract,
			manifest.contract?.kind,
			mimeType,
		);
		if (
			(manifest.initialRevision !== undefined &&
				!ContentContractPolicy.text(manifest.initialRevision)) ||
			(manifest.recoveryId !== undefined &&
				!/^[a-f0-9]{64}$/.test(manifest.recoveryId))
		)
			throw new ContentError("recovery");
		ContentManifestPolicy.bindings(manifest.bindings);
		ContentManifestPolicy.associations(manifest);
		if (manifest.pending) {
			if (
				!ContentContractPolicy.text(manifest.pending.revision) ||
				!ContentContractPolicy.keys(manifest.pending, ["revision", "bindings"])
			)
				throw new ContentError("recovery");
			ContentManifestPolicy.bindings(manifest.pending.bindings);
			if (
				manifest.pending.bindings.length !== manifest.bindings.length ||
				manifest.pending.bindings.some((binding, i) => {
					const prior = manifest.bindings[i];
					return (
						prior.id !== binding.id ||
						prior.key !== binding.key ||
						prior.type !== binding.type ||
						JSON.stringify(prior.anchor) !== JSON.stringify(binding.anchor)
					);
				})
			)
				throw new ContentError("recovery");
		}
		return manifest;
	}

	private static bindings(bindings: readonly ContentBinding[]): void {
		if (
			!Array.isArray(bindings) ||
			bindings.length > 500 ||
			new Set(bindings.map((binding) => binding?.id)).size !== bindings.length
		)
			throw new ContentError("recovery");
		for (const binding of bindings) {
			if (
				!binding ||
				!ContentContractPolicy.name(binding.id) ||
				!ContentContractPolicy.name(binding.key) ||
				!["text", "image"].includes(binding.type) ||
				!/^[a-f0-9]{64}$/.test(binding.applied) ||
				(binding.desired !== undefined &&
					!/^[a-f0-9]{64}$/.test(binding.desired)) ||
				!ContentContractPolicy.keys(binding, [
					"id",
					"type",
					"key",
					"anchor",
					"applied",
					"desired",
					"speakerId",
					"fallback",
				])
			)
				throw new ContentError("recovery");
			ContentManifestPolicy.anchor(binding);
		}
	}

	private static anchor(binding: ContentBinding): void {
		const anchor = binding.anchor;
		if (
			!anchor ||
			!ContentContractPolicy.keys(anchor, [
				"objectId",
				"pageId",
				"tabId",
				"segmentId",
				"rangeName",
				"start",
				"end",
			])
		)
			throw new ContentError("recovery");
		ContentManifestPolicy.anchorValues(anchor);
		if (binding.type === "image" && !anchor.objectId)
			throw new ContentError("recovery");
		if (binding.type === "text" && !anchor.objectId && !anchor.rangeName)
			throw new ContentError("recovery");
	}

	private static anchorValues(anchor: ContentBinding["anchor"]): void {
		for (const [key, value] of Object.entries(anchor)) {
			if (key === "start" || key === "end") {
				if (!Number.isSafeInteger(value) || Number(value) < 1)
					throw new ContentError("recovery");
			} else if (value !== "" && !ContentContractPolicy.name(value))
				throw new ContentError("recovery");
		}
	}

	private static associations(manifest: ContentManifest): void {
		const anchors = new Set<string>();
		for (const binding of manifest.bindings) {
			const field = manifest.contract.fields.find(
				(field) =>
					field.type === binding.type &&
					(field.type === "text" ? ContentTextKey.of(field) : field.slot) ===
						binding.key,
			);
			const anchor = binding.anchor;
			const key = JSON.stringify([
				anchor.pageId,
				anchor.tabId,
				anchor.segmentId,
				anchor.objectId,
				anchor.rangeName,
			]);
			if (
				!field ||
				anchors.has(key) ||
				(binding.fallback !== undefined &&
					typeof binding.fallback !== "boolean") ||
				(binding.speakerId !== undefined &&
					!/^speaker-[a-z0-9-]+$/.test(binding.speakerId))
			)
				throw new ContentError("recovery");
			anchors.add(key);
			ContentManifestPolicy.rendererAnchor(manifest.mimeType, binding);
		}
	}

	private static rendererAnchor(
		mimeType: string,
		binding: ContentBinding,
	): void {
		const anchor = binding.anchor;
		if (mimeType.endsWith("presentation")) {
			if (
				!anchor.objectId ||
				!anchor.pageId ||
				anchor.tabId ||
				anchor.rangeName
			)
				throw new ContentError("recovery");
		} else if (
			!anchor.tabId ||
			anchor.segmentId ||
			(binding.type === "text" && !anchor.rangeName)
		)
			throw new ContentError("recovery");
	}
}
