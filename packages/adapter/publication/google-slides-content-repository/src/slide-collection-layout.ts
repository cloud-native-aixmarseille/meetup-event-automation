import type { slides_v1 } from "@googleapis/slides";
import { ContentError } from "@meetup-automation/publication";

export interface SlideCollectionBounds {
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
}

/** Group dimensions come from children, not the provider's optional group size. */
export class SlideCollectionLayout {
	capture(group: slides_v1.Schema$PageElement) {
		const transform = this.transform(group.transform);
		if (
			transform.shearX ||
			transform.shearY ||
			transform.scaleX <= 0 ||
			transform.scaleY <= 0
		)
			throw new ContentError("location");
		const points = (group.elementGroup?.children ?? []).flatMap((child) =>
			this.points(child),
		);
		if (!points.length) throw new ContentError("location");
		const x = Math.min(...points.map((point) => point.x));
		const y = Math.min(...points.map((point) => point.y));
		const width = Math.max(...points.map((point) => point.x)) - x;
		const height = Math.max(...points.map((point) => point.y)) - y;
		if (width <= 0 || height <= 0) throw new ContentError("location");
		return { transform, bounds: { x, y, width, height } };
	}
	place(
		original: slides_v1.Schema$AffineTransform | undefined,
		bounds: SlideCollectionBounds | undefined,
		index: number,
		count: number,
	): slides_v1.Schema$AffineTransform {
		if (!original || !bounds) throw new ContentError("contract");
		const transform = this.transform(original);
		const columns = Math.ceil(Math.sqrt(count));
		const rows = Math.ceil(count / columns);
		const scale = 1 / Math.max(columns, rows);
		return {
			...transform,
			scaleX: transform.scaleX * scale,
			scaleY: transform.scaleY * scale,
			translateX:
				transform.translateX +
				transform.scaleX *
					(bounds.x * (1 - scale) +
						((index % columns) * bounds.width) / columns),
			translateY:
				transform.translateY +
				transform.scaleY *
					(bounds.y * (1 - scale) +
						(Math.floor(index / columns) * bounds.height) / rows),
		};
	}
	private points(
		element: slides_v1.Schema$PageElement,
	): { x: number; y: number }[] {
		const transform = this.transform(element.transform);
		const width = this.pointsDimension(element.size?.width);
		const height = this.pointsDimension(element.size?.height);
		const points = element.elementGroup
			? (element.elementGroup.children?.flatMap((child) =>
					this.points(child),
				) ?? [])
			: [
					{ x: 0, y: 0 },
					{ x: width, y: 0 },
					{ x: 0, y: height },
					{ x: width, y: height },
				];
		return points.map((point) => ({
			x:
				point.x * transform.scaleX +
				point.y * transform.shearX +
				transform.translateX,
			y:
				point.x * transform.shearY +
				point.y * transform.scaleY +
				transform.translateY,
		}));
	}
	private transform(value?: slides_v1.Schema$AffineTransform | null) {
		const result = {
			scaleX: value?.scaleX ?? 1,
			scaleY: value?.scaleY ?? 1,
			shearX: value?.shearX ?? 0,
			shearY: value?.shearY ?? 0,
			translateX: this.pointsDimension({
				magnitude: value?.translateX ?? 0,
				unit: value?.unit ?? "PT",
			}),
			translateY: this.pointsDimension({
				magnitude: value?.translateY ?? 0,
				unit: value?.unit ?? "PT",
			}),
			unit: "PT",
		};
		if (
			[result.scaleX, result.scaleY, result.shearX, result.shearY].some(
				(value) => !Number.isFinite(value),
			)
		)
			throw new ContentError("location");
		return result;
	}
	private pointsDimension(value?: slides_v1.Schema$Dimension | null): number {
		if (!value) return 0;
		if (
			!Number.isFinite(value.magnitude) ||
			(value.unit !== "PT" && value.unit !== "EMU")
		)
			throw new ContentError("location");
		return (value.magnitude ?? 0) / (value.unit === "EMU" ? 12700 : 1);
	}
}
