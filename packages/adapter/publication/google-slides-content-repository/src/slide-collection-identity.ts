import type { slides_v1 } from "@googleapis/slides";
import {
	ContentError,
	type ContentFingerprint,
	type CollectionField,
} from "@meetup-automation/publication";
import type { SlideCollectionTemplate } from "./slide-collection-model.js";

/** Stable generated IDs and bounded decoding of the adapter-owned template. */
export class SlideCollectionIdentity {
	constructor(private readonly fingerprints: Pick<ContentFingerprint, "of">) {}
	prefix(slot: string): string {
		return `mc_${this.fingerprints.of(slot).slice(0, 12)}_`;
	}
	id(slot: string, index: number, original: string): string {
		return index === 0
			? original
			: `${this.prefix(slot)}${index}_${this.fingerprints.of(original).slice(0, 16)}`;
	}
	decode(source: string): SlideCollectionTemplate {
		try {
			const value: unknown = JSON.parse(source);
			if (!this.template(value)) throw new ContentError("contract");
			return value;
		} catch {
			throw new ContentError("contract");
		}
	}
	private template(value: unknown): value is SlideCollectionTemplate {
		if (
			!this.record(value) ||
			!["slide", "grid"].includes(String(value.mode)) ||
			!this.objectId(value.rootId) ||
			!this.objectId(value.pageId) ||
			!Array.isArray(value.members) ||
			!value.members.length ||
			value.members.length > 100 ||
			!value.members.every((member) => this.member(member)) ||
			Object.keys(value).some(
				(key) =>
					![
						"mode",
						"rootId",
						"pageId",
						"members",
						"transform",
						"bounds",
					].includes(key),
			)
		)
			return false;
		if (value.mode === "slide")
			return (
				value.rootId === value.pageId &&
				value.bounds === undefined &&
				value.transform === undefined
			);
		return this.geometry(value.transform, value.bounds);
	}
	private member(value: unknown): boolean {
		return (
			this.record(value) &&
			this.objectId(value.objectId) &&
			typeof value.key === "string" &&
			/^[\w.:-]{1,100}$/.test(value.key) &&
			(value.type === "text" || value.type === "image") &&
			Object.keys(value).every((key) =>
				["objectId", "key", "type"].includes(key),
			)
		);
	}
	private geometry(transform: unknown, bounds: unknown): boolean {
		return (
			this.record(transform) &&
			transform.unit === "PT" &&
			[
				"scaleX",
				"scaleY",
				"shearX",
				"shearY",
				"translateX",
				"translateY",
			].every(
				(key) =>
					typeof transform[key] === "number" && Number.isFinite(transform[key]),
			) &&
			transform.shearX === 0 &&
			transform.shearY === 0 &&
			Number(transform.scaleX) > 0 &&
			Number(transform.scaleY) > 0 &&
			this.record(bounds) &&
			["x", "y", "width", "height"].every(
				(key) =>
					typeof bounds[key] === "number" && Number.isFinite(bounds[key]),
			) &&
			Number(bounds.width) > 0 &&
			Number(bounds.height) > 0
		);
	}
	roots(
		data: slides_v1.Schema$Presentation,
		field: Pick<CollectionField, "slot" | "template">,
	): (slides_v1.Schema$Page | slides_v1.Schema$PageElement)[] {
		const template = this.decode(field.template);
		const page = data.slides?.find((page) => page.objectId === template.pageId);
		if (!page) throw new ContentError("conflict");
		const candidates =
			template.mode === "slide"
				? (data.slides ?? [])
				: (page.pageElements ?? []);
		const roots = candidates.filter(
			(item) =>
				item.objectId === template.rootId ||
				item.objectId?.startsWith(this.prefix(field.slot)),
		);
		const prototype = roots.find((item) => item.objectId === template.rootId);
		if (
			!prototype ||
			template.members.some(
				(member) => !this.contains(prototype, member.objectId),
			)
		)
			throw new ContentError("conflict");
		return roots;
	}
	private contains(value: unknown, objectId: string): boolean {
		if (!value || typeof value !== "object") return false;
		if ("objectId" in value && value.objectId === objectId) return true;
		return Object.values(value).some((item) => this.contains(item, objectId));
	}
	private objectId(value: unknown): value is string {
		return typeof value === "string" && /^[\w][\w:-]{0,99}$/.test(value);
	}
	private record(value: unknown): value is Record<string, unknown> {
		return value !== null && typeof value === "object" && !Array.isArray(value);
	}
}
