import { describe, expect, it } from "vitest";
import { SlideCollectionLayout } from "./slide-collection-layout.js";

describe("native group geometry", () => {
	it("uses child bounds with an offset when Google omits group size", () => {
		// Arrange
		const subject = new SlideCollectionLayout();
		const group = {
			transform: { scaleX: 1, scaleY: 1, unit: "EMU" },
			elementGroup: {
				children: [
					{
						size: {
							width: { magnitude: 1270000, unit: "EMU" },
							height: { magnitude: 1270000, unit: "EMU" },
						},
						transform: {
							scaleX: 1,
							scaleY: 1,
							translateX: 2540000,
							translateY: 1270000,
							unit: "EMU",
						},
					},
				],
			},
		};
		// Act
		const captured = subject.capture(group);
		const first = subject.place(captured.transform, captured.bounds, 0, 4);
		const fourth = subject.place(captured.transform, captured.bounds, 3, 4);
		// Assert
		expect(captured.bounds).toEqual({
			x: 200,
			y: 100,
			width: 100,
			height: 100,
		});
		expect(first).toMatchObject({
			scaleX: 0.5,
			scaleY: 0.5,
			translateX: 100,
			translateY: 50,
			unit: "PT",
		});
		expect(fourth).toMatchObject({
			scaleX: 0.5,
			scaleY: 0.5,
			translateX: 150,
			translateY: 100,
			unit: "PT",
		});
	});
});
