import * as core from "@actions/core";
import type { SocialDestination } from "@meetup-automation/communication";
import type { RuntimeInput } from "./runtime-input.js";

export interface SocialCredentials {
	readonly slack?: Readonly<Record<string, string>>;
	readonly linkedin?: Readonly<{
		accessToken: string;
		googleCredentials: string;
	}>;
}
export class SocialCredentialsInput {
	constructor(private readonly input: Pick<RuntimeInput, "isObject">) {}
	read(destinations: readonly SocialDestination[]): SocialCredentials {
		return this.parse(
			core.getInput("social-credentials", {
				required: true,
				trimWhitespace: false,
			}),
			destinations,
		);
	}
	parse(
		text: string,
		destinations: readonly SocialDestination[],
	): SocialCredentials {
		core.setSecret(text);
		if (Buffer.byteLength(text) > 64_000)
			throw new Error("Social credentials exceed limit");
		let value: unknown;
		try {
			value = JSON.parse(text);
		} catch {
			throw new Error("Invalid social credentials JSON");
		}
		this.mask(value);
		if (!this.input.isObject(value))
			throw new Error("Invalid social credentials");
		const providers = new Set(
			destinations.map((destination) => destination.provider),
		);
		if (
			Object.keys(value).some(
				(key) => !providers.has(key as SocialDestination["provider"]),
			)
		)
			throw new Error(
				"Credentials supplied for an unconfigured social provider",
			);
		return {
			...(providers.has("slack")
				? { slack: this.slack(value.slack, destinations) }
				: {}),
			...(providers.has("linkedin")
				? { linkedin: this.linkedin(value.linkedin) }
				: {}),
		};
	}
	private slack(
		value: unknown,
		destinations: readonly SocialDestination[],
	): Readonly<Record<string, string>> {
		if (!this.input.isObject(value))
			throw new Error("Missing Slack installation credentials");
		const workspaces = new Set(
			destinations
				.filter((destination) => destination.provider === "slack")
				.map((destination) => destination.workspaceId),
		);
		if (Object.keys(value).some((key) => !workspaces.has(key)))
			throw new Error(
				"Credentials supplied for an unconfigured Slack workspace",
			);
		return Object.fromEntries(
			[...workspaces].map((workspace) => [
				workspace,
				this.token(value[workspace]),
			]),
		);
	}
	private linkedin(value: unknown): NonNullable<SocialCredentials["linkedin"]> {
		if (
			!this.input.isObject(value) ||
			Object.keys(value).some(
				(key) => !["accessToken", "googleCredentials"].includes(key),
			)
		)
			throw new Error("Invalid LinkedIn credentials");
		const google = value.googleCredentials;
		if (
			!this.input.isObject(google) ||
			google.type !== "service_account" ||
			typeof google.client_email !== "string" ||
			!google.client_email.trim() ||
			typeof google.private_key !== "string" ||
			!google.private_key.trim()
		)
			throw new Error(
				"LinkedIn media requires Google service-account credentials",
			);
		return {
			accessToken: this.token(value.accessToken),
			googleCredentials: JSON.stringify(google),
		};
	}
	private token(value: unknown): string {
		if (typeof value !== "string" || !value.trim() || value !== value.trim())
			throw new Error("Missing social provider token");
		return value;
	}
	private mask(value: unknown): void {
		if (typeof value === "string") {
			core.setSecret(value);
			if (value.trim()) core.setSecret(value.trim());
		} else if (Array.isArray(value))
			for (const entry of value) this.mask(entry);
		else if (this.input.isObject(value))
			for (const entry of Object.values(value)) this.mask(entry);
	}
}
