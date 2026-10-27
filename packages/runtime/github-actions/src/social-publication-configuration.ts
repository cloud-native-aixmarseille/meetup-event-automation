import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { SocialDestination } from "@meetup-automation/communication";
import type { RuntimeInput } from "./runtime-input.js";

export interface SocialPublicationConfigurationValue {
	readonly destinations: readonly SocialDestination[];
}
export class SocialPublicationConfiguration {
	constructor(private readonly input: Pick<RuntimeInput, "isObject">) {}
	async load(root: string): Promise<SocialPublicationConfigurationValue> {
		const text = await readFile(
			join(root, ".github/meetup-social.json"),
			"utf8",
		);
		if (Buffer.byteLength(text) > 100_000)
			throw new Error("Social publication configuration exceeds limit");
		let value: unknown;
		try {
			value = JSON.parse(text);
		} catch {
			throw new Error("Invalid social publication configuration JSON");
		}
		return this.parse(value);
	}
	parse(value: unknown): SocialPublicationConfigurationValue {
		if (
			!this.input.isObject(value) ||
			value.version !== 1 ||
			Object.keys(value).some(
				(key) => !["version", "destinations"].includes(key),
			) ||
			!Array.isArray(value.destinations) ||
			value.destinations.length > 50
		)
			throw new Error("Invalid social publication configuration");
		const destinations = value.destinations.map((item) =>
			this.destination(item),
		);
		const identities = destinations.map((item) =>
			item.provider === "slack"
				? `slack:${item.workspaceId}:${item.channelId}`
				: item.organizationUrn,
		);
		if (
			new Set(destinations.map((item) => item.key)).size !==
				destinations.length ||
			new Set(identities).size !== destinations.length ||
			destinations.filter((item) => item.provider === "linkedin").length > 1
		)
			throw new Error("Duplicate social publication destination");
		return { destinations };
	}
	private destination(value: unknown): SocialDestination {
		if (!this.input.isObject(value))
			throw new Error("Invalid social destination");
		const key = this.text(value.key, /^[a-z][a-z0-9-]{0,63}$/);
		const label = this.text(value.label, /^[^<>\r\n]{1,100}$/);
		if (value.provider === "slack") {
			this.keys(value, [
				"key",
				"provider",
				"label",
				"workspaceId",
				"channelId",
			]);
			return {
				key,
				label,
				provider: "slack",
				workspaceId: this.text(value.workspaceId, /^T[A-Z0-9]{2,}$/),
				channelId: this.text(value.channelId, /^[CG][A-Z0-9]{2,}$/),
			};
		}
		if (value.provider === "linkedin") {
			this.keys(value, ["key", "provider", "label", "organizationUrn"]);
			return {
				key,
				label,
				provider: "linkedin",
				organizationUrn: this.text(
					value.organizationUrn,
					/^urn:li:organization:[1-9]\d*$/,
				),
			};
		}
		throw new Error("Unsupported social publication provider");
	}
	private keys(
		value: Record<string, unknown>,
		allowed: readonly string[],
	): void {
		if (Object.keys(value).some((key) => !allowed.includes(key)))
			throw new Error("Invalid social destination properties");
	}
	private text(value: unknown, pattern: RegExp): string {
		if (
			typeof value !== "string" ||
			value.length > 100 ||
			value !== value.trim() ||
			!pattern.test(value)
		)
			throw new Error("Invalid social destination identity");
		return value;
	}
}
