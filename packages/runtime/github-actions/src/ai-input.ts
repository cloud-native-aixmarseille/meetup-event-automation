import * as core from "@actions/core";
import type { AiConfiguration } from "./ai-configuration.js";
import type { RuntimeInput } from "./runtime-input.js";

export class AiInput {
	constructor(private readonly runtimeInput: Pick<RuntimeInput, "isObject">) {}
	read(): AiConfiguration {
		const apiKey = core.getInput("ai-api-key", {
			required: true,
			trimWhitespace: false,
		});
		core.setSecret(apiKey);
		const normalizedApiKey = apiKey.trim();
		if (normalizedApiKey && normalizedApiKey !== apiKey)
			core.setSecret(normalizedApiKey);
		return this.validate({
			provider: core.getInput("ai-provider", {
				required: true,
				trimWhitespace: false,
			}),
			model: core.getInput("ai-model", {
				required: true,
				trimWhitespace: false,
			}),
			apiKey,
		});
	}

	validate(input: unknown): AiConfiguration {
		if (!this.runtimeInput.isObject(input))
			throw new Error("Invalid AI configuration");
		const provider = this.requiredString(input.provider, "ai-provider");
		if (provider !== "gemini")
			throw new Error("Invalid input: ai-provider. Supported provider: gemini");
		return {
			provider,
			model: this.requiredString(input.model, "ai-model"),
			apiKey: this.requiredString(input.apiKey, "ai-api-key"),
		};
	}

	private requiredString(value: unknown, name: string): string {
		if (typeof value !== "string") throw new Error(`Invalid input: ${name}`);
		const normalized = value.trim();
		if (!normalized)
			throw new Error(`Input required and not supplied: ${name}`);
		return normalized;
	}
}
