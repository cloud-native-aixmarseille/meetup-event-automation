import * as core from "@actions/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AiInput } from "./ai-input.js";
import { RuntimeInput } from "./runtime-input.js";

vi.mock("@actions/core", async (importOriginal) => {
	const original = await importOriginal<typeof core>();
	return {
		...original,
		getInput: vi.fn(original.getInput),
		setSecret: vi.fn(),
	};
});

const configuration = {
	provider: "gemini",
	model: "example-model",
	apiKey: "synthetic-api-key",
};

beforeEach(() => {
	vi.clearAllMocks();
	vi.stubEnv("INPUT_AI-PROVIDER", configuration.provider);
	vi.stubEnv("INPUT_AI-MODEL", configuration.model);
	vi.stubEnv("INPUT_AI-API-KEY", configuration.apiKey);
});
afterEach(() => vi.unstubAllEnvs());

describe("AiInput", () => {
	it("reads an explicit provider, model and masked API key", () => {
		// Arrange
		const expected = configuration;

		// Act
		const result = new AiInput(new RuntimeInput()).read();

		// Assert
		expect(result).toEqual(expected);
		expect(core.setSecret).toHaveBeenCalledWith(configuration.apiKey);
	});

	it.each(["ai-provider", "ai-model", "ai-api-key"])(
		"declares %s as required and controls its normalization",
		(name) => {
			// Arrange
			const options = { required: true, trimWhitespace: false };

			// Act
			new AiInput(new RuntimeInput()).read();

			// Assert
			expect(core.getInput).toHaveBeenCalledWith(name, options);
		},
	);

	it("trims the configured values and masks both forms of the API key", () => {
		// Arrange
		vi.stubEnv("INPUT_AI-PROVIDER", " gemini ");
		vi.stubEnv("INPUT_AI-MODEL", " example-model ");
		vi.stubEnv("INPUT_AI-API-KEY", " synthetic-api-key \n");

		// Act
		const result = new AiInput(new RuntimeInput()).read();

		// Assert
		expect(result).toEqual(configuration);
		expect(core.setSecret).toHaveBeenCalledWith(" synthetic-api-key \n");
		expect(core.setSecret).toHaveBeenCalledWith("synthetic-api-key");
	});

	it.each(["ai-provider", "ai-model", "ai-api-key"])(
		"rejects an omitted %s without supplying a default",
		(name) => {
			// Arrange
			vi.stubEnv(`INPUT_${name.toUpperCase()}`, undefined);

			// Act
			const read = () => new AiInput(new RuntimeInput()).read();

			// Assert
			expect(read).toThrow(`Input required and not supplied: ${name}`);
		},
	);

	it.each([
		["ai-provider", ""],
		["ai-provider", " \n "],
		["ai-model", ""],
		["ai-model", " \n "],
		["ai-api-key", ""],
		["ai-api-key", " \n "],
	])("rejects blank %s values", (name, value) => {
		// Arrange
		vi.stubEnv(`INPUT_${name.toUpperCase()}`, value);

		// Act
		const read = () => new AiInput(new RuntimeInput()).read();

		// Assert
		expect(read).toThrow(`Input required and not supplied: ${name}`);
	});

	it("masks the API key before a provider failure without exposing supplied values", () => {
		// Arrange
		vi.stubEnv("INPUT_AI-PROVIDER", "PRIVATE-unsupported-provider");
		vi.stubEnv("INPUT_AI-API-KEY", "PRIVATE-api-key");

		// Act
		let failure: unknown;
		try {
			new AiInput(new RuntimeInput()).read();
		} catch (error) {
			failure = error;
		}

		// Assert
		expect(failure).toMatchObject({
			message: "Invalid input: ai-provider. Supported provider: gemini",
		});
		expect(String(failure)).not.toContain("PRIVATE");
		expect(core.setSecret).toHaveBeenCalledWith("PRIVATE-api-key");
		expect(vi.mocked(core.setSecret).mock.invocationCallOrder[0]).toBeLessThan(
			vi.mocked(core.getInput).mock.invocationCallOrder[1] ?? 0,
		);
	});

	it("masks the API key before another required input fails", () => {
		// Arrange
		vi.stubEnv("INPUT_AI-MODEL", undefined);

		// Act
		const read = () => new AiInput(new RuntimeInput()).read();

		// Assert
		expect(read).toThrow("Input required and not supplied: ai-model");
		expect(core.setSecret).toHaveBeenCalledWith(configuration.apiKey);
	});

	it.each([null, undefined, [], true, 42, "PRIVATE-configuration"])(
		"rejects malformed programmatic configuration: %j",
		(input) => {
			// Arrange
			const settings = input;

			// Act
			const validate = () => new AiInput(new RuntimeInput()).validate(settings);

			// Assert
			expect(validate).toThrow("Invalid AI configuration");
		},
	);

	it.each([
		["provider", "ai-provider", undefined],
		["provider", "ai-provider", 42],
		["provider", "ai-provider", { value: "PRIVATE" }],
		["model", "ai-model", undefined],
		["model", "ai-model", 42],
		["model", "ai-model", { value: "PRIVATE" }],
		["apiKey", "ai-api-key", undefined],
		["apiKey", "ai-api-key", 42],
		["apiKey", "ai-api-key", { value: "PRIVATE" }],
	] as const)(
		"rejects missing or non-string %s values",
		(property, name, value) => {
			// Arrange
			const input = { ...configuration, [property]: value };

			// Act
			const validate = () => new AiInput(new RuntimeInput()).validate(input);

			// Assert
			expect(validate).toThrow(`Invalid input: ${name}`);
		},
	);

	it.each(["Gemini", "unsupported-provider"])(
		"rejects an unsupported configured provider: %s",
		(provider) => {
			// Arrange
			const input = { ...configuration, provider };

			// Act
			const validate = () => new AiInput(new RuntimeInput()).validate(input);

			// Assert
			expect(validate).toThrow(
				"Invalid input: ai-provider. Supported provider: gemini",
			);
		},
	);

	it("returns only normalized configuration fields without mutating or masking programmatic data", () => {
		// Arrange
		const input = {
			provider: " gemini ",
			model: " example-model ",
			apiKey: " synthetic-api-key ",
			unexpected: "PRIVATE",
		};

		// Act
		const result = new AiInput(new RuntimeInput()).validate(input);

		// Assert
		expect(result).toEqual(configuration);
		expect(result).not.toBe(input);
		expect(result).not.toHaveProperty("unexpected");
		expect(input.apiKey).toBe(" synthetic-api-key ");
		expect(core.setSecret).not.toHaveBeenCalled();
	});
});
