import * as core from "@actions/core";
import type { ScheduledEventSettings } from "@meetup-automation/journey";
import type { AiConfiguration } from "./ai-configuration.js";
import type { AiInput } from "./ai-input.js";
import type { PublicationDestinationConfiguration } from "./event-publication-configuration.js";
import type { OcgroupsPublicationSettingsValue } from "./ocgroups-publication-settings.js";
import type { RuntimeInput } from "./runtime-input.js";

export type ConfiguredPublicationAdapter =
	| Readonly<{
			provider: "meetup";
			settings: ScheduledEventSettings;
			credentials: { email: string; password: string; ai: AiConfiguration };
	  }>
	| Readonly<{
			provider: "ocgroups";
			settings: OcgroupsPublicationSettingsValue;
			credentials: { username: string; password: string };
	  }>;

export class PublicationCredentialsInput {
	constructor(
		private readonly input: Pick<RuntimeInput, "isObject">,
		private readonly ai: Pick<AiInput, "validate">,
	) {}
	read(
		destinations: readonly PublicationDestinationConfiguration[],
	): readonly ConfiguredPublicationAdapter[] {
		return this.parse(
			core.getInput("publication-credentials", {
				required: true,
				trimWhitespace: false,
			}),
			destinations,
		);
	}
	parse(
		text: string,
		destinations: readonly PublicationDestinationConfiguration[],
	): readonly ConfiguredPublicationAdapter[] {
		core.setSecret(text);
		if (Buffer.byteLength(text) > 64_000)
			throw new Error("Publication credentials are too large");
		let value: unknown;
		try {
			value = JSON.parse(text);
		} catch {
			throw new Error("Invalid publication credentials JSON");
		}
		this.mask(value);
		if (!this.input.isObject(value))
			throw new Error("Invalid publication credentials");
		const credentials = value;
		if (
			Object.keys(credentials).some(
				(key) =>
					!destinations.some((destination) => destination.provider === key),
			)
		)
			throw new Error(
				"Credentials supplied for an unconfigured publication provider",
			);
		return destinations.map((destination) =>
			this.adapter(destination, credentials[destination.provider]),
		);
	}
	private adapter(
		destination: PublicationDestinationConfiguration,
		value: unknown,
	): ConfiguredPublicationAdapter {
		if (!this.input.isObject(value))
			throw new Error(`Missing credentials for ${destination.provider}`);
		const keys =
			destination.provider === "meetup"
				? ["email", "password", "ai"]
				: ["username", "password"];
		if (Object.keys(value).some((key) => !keys.includes(key)))
			throw new Error(`Unsupported credentials for ${destination.provider}`);
		const password = this.password(value.password);
		if (destination.provider === "meetup")
			return {
				...destination,
				credentials: {
					email: this.text(value.email),
					password,
					ai: this.ai.validate(value.ai),
				},
			};
		return {
			...destination,
			credentials: { username: this.text(value.username), password },
		};
	}
	private text(value: unknown): string {
		if (typeof value !== "string" || !value.trim())
			throw new Error("Missing publication account identifier");
		core.setSecret(value.trim());
		return value.trim();
	}
	private password(value: unknown): string {
		if (typeof value !== "string" || !value.trim())
			throw new Error("Missing publication password");
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
