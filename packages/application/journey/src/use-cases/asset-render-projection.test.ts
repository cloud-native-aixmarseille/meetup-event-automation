import { describe, expect, it, vi } from "vitest";
import type { AssetRenderPresenter } from "@meetup-automation/publication";
import { catalog, event } from "../../testing/meetup-journey.fixtures.js";
import { AssetRenderProjection } from "./asset-render-projection.js";

describe("asset public projection", () => {
	it("exposes only public fields and assigns pictures by stable agenda identity", async () => {
		// Arrange
		const source = {
			...catalog,
			speakers: catalog.speakers.map((speaker) => ({
				...speaker,
				pictureUrl: "https://images.example.org/portrait.png",
			})),
		};
		const presenter: AssetRenderPresenter = {
			format: vi.fn(() => ({ text: {}, pictures: {} })),
		};
		const projection = new AssetRenderProjection(
			presenter,
			{ load: vi.fn(async () => source) },
			{ portrait: "speaker-0001", absent: "speaker-9999" },
		);
		// Act
		await projection.create(event, []);
		const payload = vi.mocked(presenter.format).mock.calls[0][0];
		// Assert
		expect(payload.pictures).toEqual({
			portrait: {
				speakerId: "speaker-0001",
				url: "https://images.example.org/portrait.png",
				description: "Example Speaker",
			},
		});
		expect(Object.keys(payload).sort()).toEqual([
			"agenda",
			"date",
			"feedbackUrl",
			"hostName",
			"pictures",
			"timeZone",
			"title",
		]);
		for (const speaker of source.speakers)
			expect(JSON.stringify(payload)).not.toContain(speaker.email);
		for (const host of source.hosts)
			expect(JSON.stringify(payload)).not.toContain(String(host.address));
	});

	it("does not transfer a removed speaker's portrait to the next agenda speaker", async () => {
		// Arrange
		const presenter: AssetRenderPresenter = {
			format: vi.fn(() => ({ text: {}, pictures: {} })),
		};
		const projection = new AssetRenderProjection(
			presenter,
			{ load: vi.fn(async () => catalog) },
			{ portrait: "speaker-0001" },
		);
		// Act
		await projection.create({ ...event, agenda: [] }, []);
		// Assert
		expect(vi.mocked(presenter.format).mock.calls[0][0].pictures).toEqual({});
	});
});
