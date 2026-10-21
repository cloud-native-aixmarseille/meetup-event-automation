import type {
	ContentBinding,
	ContentContract,
	ContentManifest,
} from "./asset-content.js";
import { ContentAnchorIdentity } from "./content-anchor-identity.js";
import { ContentBindingPolicy } from "./content-binding-policy.js";
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
		const manifest = ContentManifestPolicy.state(
			value,
			fileId,
			templateId,
			mimeType,
		);
		ContentManifestPolicy.associations(manifest);
		if (!manifest.pending) return manifest;
		ContentManifestPolicy.associations({
			...manifest,
			bindings: manifest.pending.bindings,
		});
		if (
			manifest.pending.bindings.length !== manifest.bindings.length ||
			manifest.pending.bindings.some((binding, index) => {
				const prior = manifest.bindings[index];
				return (
					prior.id !== binding.id ||
					prior.key !== binding.key ||
					prior.type !== binding.type ||
					!ContentAnchorIdentity.equal(prior.anchor, binding.anchor)
				);
			})
		)
			throw new ContentError("recovery");
		return manifest;
	}

	private static state(
		value: unknown,
		fileId: string,
		templateId: string,
		mimeType: string,
	): ContentManifest {
		if (
			!ContentContractPolicy.record(value) ||
			value.version !== 1 ||
			value.fileId !== fileId ||
			value.templateId !== templateId ||
			value.mimeType !== mimeType ||
			!ContentContractPolicy.keys(value, [
				"version",
				"fileId",
				"templateId",
				"mimeType",
				"contract",
				"bindings",
				"pending",
				"initialRevision",
				"recoveryId",
			]) ||
			!ContentContractPolicy.record(value.contract) ||
			typeof value.contract.kind !== "string"
		)
			throw new ContentError("recovery");
		if (
			(value.initialRevision !== undefined &&
				!ContentContractPolicy.text(value.initialRevision)) ||
			(value.recoveryId !== undefined &&
				(typeof value.recoveryId !== "string" ||
					!/^[a-f0-9]{64}$/.test(value.recoveryId)))
		)
			throw new ContentError("recovery");
		const pending = ContentManifestPolicy.pending(value.pending);
		return {
			version: 1,
			fileId,
			templateId,
			mimeType,
			contract: ContentContractPolicy.parse(
				value.contract,
				value.contract.kind,
				mimeType,
			),
			bindings: ContentBindingPolicy.parseMany(value.bindings),
			...(pending ? { pending } : {}),
			...(typeof value.initialRevision === "string"
				? { initialRevision: value.initialRevision }
				: {}),
			...(typeof value.recoveryId === "string"
				? { recoveryId: value.recoveryId }
				: {}),
		};
	}

	private static pending(value: unknown): ContentManifest["pending"] {
		if (value === undefined) return undefined;
		if (
			!ContentContractPolicy.record(value) ||
			!ContentContractPolicy.text(value.revision) ||
			!ContentContractPolicy.keys(value, ["revision", "bindings"])
		)
			throw new ContentError("recovery");
		return {
			revision: value.revision,
			bindings: ContentBindingPolicy.parseMany(value.bindings),
		};
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
			const key = ContentAnchorIdentity.locationKey(anchor);
			if (
				!field ||
				anchors.has(key) ||
				(binding.fallback !== undefined &&
					typeof binding.fallback !== "boolean")
			)
				throw new ContentError("recovery");
			anchors.add(key);
			ContentManifestPolicy.identity(binding, field);
			ContentManifestPolicy.rendererAnchor(manifest.mimeType, binding);
		}
	}

	private static identity(
		binding: ContentBinding,
		field: ContentContract["fields"][number],
	): void {
		if (
			binding.speakerId !== undefined &&
			(!/^speaker-[a-z0-9-]+$/.test(binding.speakerId) ||
				field.type !== "image" ||
				field.token !== "speaker.picture")
		)
			throw new ContentError("recovery");
		if (
			binding.hostId !== undefined &&
			(!/^host-[a-z0-9-]+$/.test(binding.hostId) ||
				field.type !== "image" ||
				field.token !== "host.logo")
		)
			throw new ContentError("recovery");
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
