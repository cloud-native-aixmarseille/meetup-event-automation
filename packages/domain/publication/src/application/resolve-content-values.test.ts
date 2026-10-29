import { describe, expect, it, vi } from "vitest";
import { contentFixture, contract } from "../../testing/content.fixtures.js";
import { PublicationDomainComposition } from "../dependency-composition.js";
import { ResolveContentValues } from "./resolve-content-values.js";

describe("slotted content values", () => {
	it.each(["missing", "invalid", "bad-identity"])(
		"uses a logo-specific fallback for an optional %s host logo",
		async (reason) => {
			// Arrange
			const f = contentFixture(true, undefined, "host.logo");
			const source = {
				hostId: reason === "bad-identity" ? "speaker-one" : "host-one",
				url: "https://images.example.org/logo.png",
				description: "Public host",
			};
			const resolver = new ResolveContentValues(
				{
					templates: { value: (value) => value.value },
					contentTextKey: new PublicationDomainComposition().contentTextKey(),
					contentContractPolicy:
						new PublicationDomainComposition().contentContractPolicy(),
					contentFingerprint:
						new PublicationDomainComposition().contentFingerprint(),
				},
				f.images,
			);
			if (reason === "invalid")
				vi.mocked(f.images.validate).mockImplementation(async (image) => {
					if (image.url === source.url) throw new Error("invalid media");
					return { source: image, fingerprint: "fallback" };
				});

			// Act
			const values = await resolver.execute(f.input.contract, {
				...f.input.model,
				hostLogo: reason === "missing" ? undefined : source,
				pictures: {
					"host-logo": {
						speakerId: "speaker-one",
						url: "https://images.example.org/portrait.png",
						description: "Speaker",
					},
				},
			});

			// Assert
			expect(values.find((value) => value.type === "image")).toMatchObject({
				key: "host-logo",
				fallback: true,
				image: { url: "https://images.example.org/generic.png" },
			});
		},
	);

	it("blocks a required missing host logo before any write", async () => {
		// Arrange
		const f = contentFixture(true, undefined, "host.logo");
		const resolver = new ResolveContentValues(
			{
				templates: { value: (value) => value.value },
				contentTextKey: new PublicationDomainComposition().contentTextKey(),
				contentContractPolicy:
					new PublicationDomainComposition().contentContractPolicy(),
				contentFingerprint:
					new PublicationDomainComposition().contentFingerprint(),
			},
			f.images,
		);
		const contract = {
			...f.input.contract,
			fields: f.input.contract.fields.map((field) => ({
				...field,
				required: true,
			})),
		};

		// Act
		const result = resolver.execute(contract, f.input.model);

		// Assert
		await expect(result).rejects.toMatchObject({ code: "image" });
	});

	it("resolves explicit slots literally and falls back after a participant is removed", async () => {
		// Arrange
		const resolver = new ResolveContentValues(
			{
				templates: { value: (value) => value.value },
				contentTextKey: new PublicationDomainComposition().contentTextKey(),
				contentContractPolicy:
					new PublicationDomainComposition().contentContractPolicy(),
				contentFingerprint:
					new PublicationDomainComposition().contentFingerprint(),
			},
			contentFixture().images,
		);
		const fields = [
			{ type: "text", token: "talk.title", slot: "opening", required: true },
			{
				type: "text",
				token: "speaker.name",
				slot: "portrait",
				required: false,
				fallback: "To be announced",
			},
		] as const;

		// Act
		const values = await resolver.execute(
			{ ...contract, fields },
			{
				text: { "talk.title:opening": "Literal {{event.title}}" },
				pictures: {},
			},
		);

		// Assert
		expect(values).toMatchObject([
			{ key: "talk.title:opening", text: "Literal {{event.title}}" },
			{ key: "speaker.name:portrait", text: "To be announced" },
		]);
	});

	it("blocks required missing slots instead of substituting another talk", async () => {
		// Arrange
		const resolver = new ResolveContentValues(
			{
				templates: { value: (value) => value.value },
				contentTextKey: new PublicationDomainComposition().contentTextKey(),
				contentContractPolicy:
					new PublicationDomainComposition().contentContractPolicy(),
				contentFingerprint:
					new PublicationDomainComposition().contentFingerprint(),
			},
			contentFixture().images,
		);
		const fields = [
			{ type: "text", token: "talk.title", slot: "opening", required: true },
		] as const;

		// Act
		const result = resolver.execute(
			{ ...contract, fields },
			{ text: { "talk.title:closing": "Different talk" }, pictures: {} },
		);

		// Assert
		await expect(result).rejects.toMatchObject({ code: "missing" });
	});
});

it("renders the same agenda portrait at independent discovered image locations", async () => {
	// Arrange
	const f = contentFixture();
	const domain = new PublicationDomainComposition();
	const resolver = new ResolveContentValues(
		{
			templates: { value: (value) => value.value },
			contentTextKey: domain.contentTextKey(),
			contentContractPolicy: domain.contentContractPolicy(),
			contentFingerprint: domain.contentFingerprint(),
		},
		f.images,
	);
	const picture = {
		speakerId: "speaker-0001",
		url: "https://images.example.test/portrait.png",
		description: "First speaker",
	};
	const fields = ["image-a", "image-b"].map((slot) => ({
		type: "image" as const,
		token: "speaker.picture" as const,
		slot,
		sourceSlot: "1",
		objectId: slot,
		pageId: "page",
		required: true,
		fit: "CENTER_CROP" as const,
	}));
	// Act
	const values = await resolver.execute(
		{ ...contract, fields },
		{ text: {}, pictures: { "1": picture } },
	);
	// Assert
	expect(values).toEqual(
		["image-a", "image-b"].map((key) =>
			expect.objectContaining({
				key,
				image: picture,
				speakerId: picture.speakerId,
				fallback: false,
			}),
		),
	);
});
