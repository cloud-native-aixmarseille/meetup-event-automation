import type { ContentAnchor, ContentBinding } from "./asset-content.js";
import { ContentContractPolicy } from "./content-contract-policy.js";
import { ContentError } from "./content-error.js";

export class ContentBindingPolicy {
	static parseMany(value: unknown): readonly ContentBinding[] {
		if (!Array.isArray(value) || value.length > 500)
			throw new ContentError("recovery");
		const bindings = value.map((item: unknown) =>
			ContentBindingPolicy.parse(item),
		);
		if (new Set(bindings.map((binding) => binding.id)).size !== bindings.length)
			throw new ContentError("recovery");
		return bindings;
	}

	private static parse(value: unknown): ContentBinding {
		if (
			!ContentContractPolicy.record(value) ||
			!ContentContractPolicy.name(value.id) ||
			!ContentContractPolicy.name(value.key) ||
			(value.type !== "text" && value.type !== "image") ||
			!ContentBindingPolicy.hash(value.applied) ||
			(value.desired !== undefined &&
				!ContentBindingPolicy.hash(value.desired)) ||
			!ContentContractPolicy.keys(value, [
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
		const identities = ContentBindingPolicy.identities(value);
		const anchor = ContentBindingPolicy.anchor(value.anchor);
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

	private static identities(
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

	private static anchor(value: unknown): ContentAnchor {
		if (
			!ContentContractPolicy.record(value) ||
			!ContentContractPolicy.keys(value, [
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
		ContentBindingPolicy.validateAnchorValues(value);
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

	private static validateAnchorValues(value: Record<string, unknown>): void {
		for (const [key, entry] of Object.entries(value)) {
			if (key === "start" || key === "end") {
				if (
					typeof entry !== "number" ||
					!Number.isSafeInteger(entry) ||
					entry < 1
				)
					throw new ContentError("recovery");
			} else if (entry !== "" && !ContentContractPolicy.name(entry))
				throw new ContentError("recovery");
		}
	}

	private static hash(value: unknown): value is string {
		return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
	}
}
