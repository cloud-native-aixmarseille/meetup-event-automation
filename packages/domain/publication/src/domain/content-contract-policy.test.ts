import { describe, expect, it } from "vitest";
import { contract, mimeType } from "../../testing/content.fixtures.js";
import { PublicationDomainComposition } from "../dependency-composition.js";
import { ContentContractPolicy } from "./content-contract-policy.js";

describe("template contracts", () => {
	it.each([
		[
			"application/vnd.google-apps.presentation",
			"CENTER_INSIDE",
			{ pageId: "page" },
		],
		["application/vnd.google-apps.document", "CENTER_CROP", { tabId: "tab" }],
	])("accepts a host logo in %s", (mime, fit, anchor) => {
		// Arrange
		const input = {
			...contract,
			fields: [
				{
					type: "image",
					token: "host.logo",
					slot: "host-logo",
					objectId: "logo",
					...anchor,
					required: true,
					fit,
				},
			],
		};

		// Act
		const actual = new ContentContractPolicy({
			contentTextKey: new PublicationDomainComposition().contentTextKey(),
		}).parse(input, "slides", mime);

		// Assert
		expect(actual).toEqual(input);
	});

	it("accepts distinct stable slots and the extended public fields", () => {
		// Arrange
		const input = {
			...contract,
			fields: [
				{ type: "text", token: "talk.title", slot: "opening", required: true },
				{ type: "text", token: "talk.title", slot: "closing", required: true },
				{
					type: "text",
					token: "speaker.name",
					slot: "portrait-a",
					required: true,
				},
				{ type: "text", token: "host.address", required: true },
				{
					type: "text",
					token: "next_event.date.numeric",
					required: false,
					fallback: "TBA",
				},
			],
		};

		// Act
		const actual = new ContentContractPolicy({
			contentTextKey: new PublicationDomainComposition().contentTextKey(),
		}).parse(input, "slides", mimeType);

		// Assert
		expect(actual).toEqual(input);
	});

	it.each([
		{ token: "talk.title" },
		{ token: "talk.title", slot: "" },
		{ token: "talk.title", slot: "x".repeat(100) },
		{ token: "talk.title", slot: "agenda[0]" },
		{ token: "event.title", slot: "opening" },
		{ token: "speaker.email", slot: "portrait" },
	])("rejects missing, unsafe, and unsupported slots", (field) => {
		// Arrange
		const input = {
			...contract,
			fields: [{ type: "text", required: true, ...field }],
		};
		let error: unknown;

		// Act
		try {
			new ContentContractPolicy({
				contentTextKey: new PublicationDomainComposition().contentTextKey(),
			}).parse(input, "slides", mimeType);
		} catch (caught) {
			error = caught;
		}

		// Assert
		expect(error).toMatchObject({ code: "contract" });
	});

	it("rejects duplicate text slots", () => {
		// Arrange
		const field = {
			type: "text",
			token: "talk.title",
			slot: "opening",
			required: true,
		};
		let error: unknown;

		// Act
		try {
			new ContentContractPolicy({
				contentTextKey: new PublicationDomainComposition().contentTextKey(),
			}).parse({ ...contract, fields: [field, field] }, "slides", mimeType);
		} catch (caught) {
			error = caught;
		}

		// Assert
		expect(error).toMatchObject({ code: "contract" });
	});

	it.each([
		{ ...contract, version: 2 },
		{
			...contract,
			fields: [{ type: "text", token: "host.email", required: true }],
		},
		{
			...contract,
			fields: [
				{ type: "text", token: "host.name", required: false, fallback: "" },
			],
		},
		{ ...contract, fields: [...contract.fields, ...contract.fields] },
		{ ...contract, script: "arbitrary expression" },
	])("rejects invalid contracts before rendering", (input) => {
		// Arrange
		let error: unknown;

		// Act
		try {
			new ContentContractPolicy({
				contentTextKey: new PublicationDomainComposition().contentTextKey(),
			}).parse(input, "slides", mimeType);
		} catch (caught) {
			error = caught;
		}

		// Assert
		expect(error).toMatchObject({ code: "contract" });
	});

	it.each(["speaker.picture", "host.logo"])(
		"rejects unsupported Docs image fitting for %s",
		(token) => {
			// Arrange
			const input = {
				...contract,
				fields: [
					{
						type: "image",
						token,
						slot: "portrait",
						objectId: "image",
						tabId: "tab",
						required: true,
						fit: "CENTER_INSIDE",
					},
				],
			};
			let error: unknown;

			// Act
			try {
				new ContentContractPolicy({
					contentTextKey: new PublicationDomainComposition().contentTextKey(),
				}).parse(input, "slides", "application/vnd.google-apps.document");
			} catch (caught) {
				error = caught;
			}

			// Assert
			expect(error).toMatchObject({ code: "contract" });
		},
	);
});

describe("content contract input boundary", () => {
	it.each([
		null,
		[],
		false,
		{ ...contract, fields: [null] },
		{
			...contract,
			fields: [
				{ type: "text", token: "event.title", required: true, fallback: false },
			],
		},
	])("rejects malformed shapes before exposing typed fields", (input) => {
		// Arrange
		const kind = "slides";

		// Act
		const parse = () =>
			new ContentContractPolicy({
				contentTextKey: new PublicationDomainComposition().contentTextKey(),
			}).parse(input, kind, mimeType);

		// Assert
		expect(parse).toThrowError(expect.objectContaining({ code: "contract" }));
	});
});

describe("formatted public text contracts", () => {
	it("allows independent formats of the same public calendar date", () => {
		// Arrange
		const policy = new ContentContractPolicy({
			contentTextKey: new PublicationDomainComposition().contentTextKey(),
		});
		const contract = {
			version: 1,
			revision: "one",
			kind: "slides",
			fields: [
				{
					type: "text",
					token: "event.date",
					format: "D MMMM YYYY",
					required: true,
				},
				{
					type: "text",
					token: "event.date",
					format: "YYYY-MM-DD",
					required: true,
				},
			],
		};
		// Act
		const parsed = policy.parse(
			contract,
			"slides",
			"application/vnd.google-apps.presentation",
		);
		// Assert
		expect(parsed).toEqual(contract);
	});
	it.each([
		{ token: "event.title", format: "YYYY" },
		{ token: "talk.title", slot: "opening", format: "YYYY" },
		{ token: "event.date", format: "" },
		{ token: "event.date", format: 42 },
		{ token: "event.date", slot: "opening", format: "YYYY" },
	])("rejects invalid format contract %j", (field) => {
		// Arrange
		const policy = new ContentContractPolicy({
			contentTextKey: new PublicationDomainComposition().contentTextKey(),
		});
		const contract = {
			version: 1,
			revision: "one",
			kind: "slides",
			fields: [{ type: "text", required: true, ...field }],
		};
		// Act
		const parse = () =>
			policy.parse(
				contract,
				"slides",
				"application/vnd.google-apps.presentation",
			);
		// Assert
		expect(parse).toThrow("content contract");
	});
});
