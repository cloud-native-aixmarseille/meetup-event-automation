import type { ContentAnchor, ContentBinding } from "./asset-content.js";
import type { ContentContractPolicy } from "./content-contract-policy.js";
import { ContentError } from "./content-error.js";

export interface ContentBindingPolicyCollaborators {
	readonly contentContractPolicy: Pick<
		ContentContractPolicy,
		"record" | "name" | "keys"
	>;
}

export class ContentBindingPolicy {
	constructor(
		private readonly collaborators: ContentBindingPolicyCollaborators,
	) {}

	parseMany(value: unknown): readonly ContentBinding[] {
		if (!Array.isArray(value) || value.length > 500)
			throw new ContentError("recovery");
		const bindings = value.map((item: unknown) => this.parse(item));
		if (new Set(bindings.map((binding) => binding.id)).size !== bindings.length)
			throw new ContentError("recovery");
		return bindings;
	}

	private parse(value: unknown): ContentBinding {
		if (
			!this.collaborators.contentContractPolicy.record(value) ||
			!this.collaborators.contentContractPolicy.name(value.id) ||
			!this.collaborators.contentContractPolicy.name(value.key) ||
			(value.type !== "text" && value.type !== "image") ||
			!this.hash(value.applied) ||
			(value.desired !== undefined && !this.hash(value.desired)) ||
			!this.collaborators.contentContractPolicy.keys(value, [
				"id",
				"type",
				"key",
				"anchor",
				"applied",
				"desired",
				"speakerId",
				"hostId",
				"fallback",
			])
		)
			throw new ContentError("recovery");
		const identities = this.identities(value);
		const anchor = this.anchor(value.anchor);
		if (
			value.type === "image"
				? !anchor.objectId
				: !anchor.objectId && !anchor.rangeName
		)
			throw new ContentError("recovery");
		return {
			id: value.id,
			key: value.key,
			type: value.type,
			applied: value.applied,
			anchor,
			...(typeof value.desired === "string" ? { desired: value.desired } : {}),
			...identities,
		};
	}

	private identities(
		value: Record<string, unknown>,
	): Pick<ContentBinding, "speakerId" | "hostId" | "fallback"> {
		if (
			(value.speakerId !== undefined && typeof value.speakerId !== "string") ||
			(value.hostId !== undefined && typeof value.hostId !== "string") ||
			(value.fallback !== undefined && typeof value.fallback !== "boolean")
		)
			throw new ContentError("recovery");
		return {
			...(typeof value.speakerId === "string"
				? { speakerId: value.speakerId }
				: {}),
			...(typeof value.hostId === "string" ? { hostId: value.hostId } : {}),
			...(typeof value.fallback === "boolean"
				? { fallback: value.fallback }
				: {}),
		};
	}

	private anchor(value: unknown): ContentAnchor {
		if (
			!this.collaborators.contentContractPolicy.record(value) ||
			!this.collaborators.contentContractPolicy.keys(value, [
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
		this.validateAnchorValues(value);
		return {
			...(typeof value.objectId === "string"
				? { objectId: value.objectId }
				: {}),
			...(typeof value.pageId === "string" ? { pageId: value.pageId } : {}),
			...(typeof value.tabId === "string" ? { tabId: value.tabId } : {}),
			...(typeof value.segmentId === "string"
				? { segmentId: value.segmentId }
				: {}),
			...(typeof value.rangeName === "string"
				? { rangeName: value.rangeName }
				: {}),
			...(typeof value.start === "number" ? { start: value.start } : {}),
			...(typeof value.end === "number" ? { end: value.end } : {}),
		};
	}

	private validateAnchorValues(value: Record<string, unknown>): void {
		for (const [key, entry] of Object.entries(value)) {
			if (key === "start" || key === "end") {
				if (
					typeof entry !== "number" ||
					!Number.isSafeInteger(entry) ||
					entry < 1
				)
					throw new ContentError("recovery");
			} else if (
				entry !== "" &&
				!this.collaborators.contentContractPolicy.name(entry)
			)
				throw new ContentError("recovery");
		}
	}

	private hash(value: unknown): value is string {
		return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
	}
}
