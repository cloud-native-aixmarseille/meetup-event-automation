import type {
	ContentBinding,
	ContentContract,
	ContentManifest,
} from "./asset-content.js";
import type { ContentAnchorIdentity } from "./content-anchor-identity.js";
import type { ContentBindingPolicy } from "./content-binding-policy.js";
import type { ContentContractPolicy } from "./content-contract-policy.js";
import { ContentError } from "./content-error.js";
import type { ContentTextKey } from "./content-text-key.js";

export interface ContentManifestPolicyCollaborators {
	readonly contentAnchorIdentity: Pick<
		ContentAnchorIdentity,
		"equal" | "locationKey"
	>;
	readonly contentContractPolicy: Pick<
		ContentContractPolicy,
		"record" | "keys" | "text" | "parse"
	>;
	readonly contentBindingPolicy: Pick<ContentBindingPolicy, "parseMany">;
	readonly contentTextKey: Pick<ContentTextKey, "of">;
}

export class ContentManifestPolicy {
	constructor(
		private readonly collaborators: ContentManifestPolicyCollaborators,
	) {}

	parse(
		value: unknown,
		fileId: string,
		templateId: string,
		mimeType: string,
	): ContentManifest {
		const manifest = this.state(value, fileId, templateId, mimeType);
		this.associations(manifest);
		if (!manifest.pending) return manifest;
		this.associations({
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
					!this.collaborators.contentAnchorIdentity.equal(
						prior.anchor,
						binding.anchor,
					)
				);
			})
		)
			throw new ContentError("recovery");
		return manifest;
	}

	private state(
		value: unknown,
		fileId: string,
		templateId: string,
		mimeType: string,
	): ContentManifest {
		if (
			!this.collaborators.contentContractPolicy.record(value) ||
			value.version !== 1 ||
			value.fileId !== fileId ||
			value.templateId !== templateId ||
			value.mimeType !== mimeType ||
			!this.collaborators.contentContractPolicy.keys(value, [
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
			!this.collaborators.contentContractPolicy.record(value.contract) ||
			typeof value.contract.kind !== "string"
		)
			throw new ContentError("recovery");
		if (
			(value.initialRevision !== undefined &&
				!this.collaborators.contentContractPolicy.text(
					value.initialRevision,
				)) ||
			(value.recoveryId !== undefined &&
				(typeof value.recoveryId !== "string" ||
					!/^[a-f0-9]{64}$/.test(value.recoveryId)))
		)
			throw new ContentError("recovery");
		const pending = this.pending(value.pending);
		return {
			version: 1,
			fileId,
			templateId,
			mimeType,
			contract: this.collaborators.contentContractPolicy.parse(
				value.contract,
				value.contract.kind,
				mimeType,
			),
			bindings: this.collaborators.contentBindingPolicy.parseMany(
				value.bindings,
			),
			...(pending ? { pending } : {}),
			...(typeof value.initialRevision === "string"
				? { initialRevision: value.initialRevision }
				: {}),
			...(typeof value.recoveryId === "string"
				? { recoveryId: value.recoveryId }
				: {}),
		};
	}

	private pending(value: unknown): ContentManifest["pending"] {
		if (value === undefined) return undefined;
		if (
			!this.collaborators.contentContractPolicy.record(value) ||
			!this.collaborators.contentContractPolicy.text(value.revision) ||
			!this.collaborators.contentContractPolicy.keys(value, [
				"revision",
				"bindings",
			])
		)
			throw new ContentError("recovery");
		return {
			revision: value.revision,
			bindings: this.collaborators.contentBindingPolicy.parseMany(
				value.bindings,
			),
		};
	}

	private associations(manifest: ContentManifest): void {
		const anchors = new Set<string>();
		for (const binding of manifest.bindings) {
			const field = manifest.contract.fields.find(
				(field) =>
					field.type === binding.type &&
					(field.type === "text"
						? this.collaborators.contentTextKey.of(field)
						: field.slot) === binding.key,
			);
			const anchor = binding.anchor;
			const key = this.collaborators.contentAnchorIdentity.locationKey(anchor);
			if (
				!field ||
				anchors.has(key) ||
				(binding.fallback !== undefined &&
					typeof binding.fallback !== "boolean")
			)
				throw new ContentError("recovery");
			anchors.add(key);
			this.identity(binding, field);
			this.rendererAnchor(manifest.mimeType, binding);
		}
	}

	private identity(
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

	private rendererAnchor(mimeType: string, binding: ContentBinding): void {
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
