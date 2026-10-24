import { LocaleResolver } from "@meetup-automation/localization";
import { describe, expect, it, vi } from "vitest";
import { ActionOutput } from "./action-output.js";
import { ActionReport } from "./action-report.js";
import { ActionRunner } from "./action-runner.js";
import { AiInput } from "./ai-input.js";
import { GithubActionsComposition } from "./dependency-composition.js";
import { EventPublicationConfiguration } from "./event-publication-configuration.js";
import { RuntimeInput } from "./runtime-input.js";
import {
	RUNTIME_FACTORIES,
	type RuntimeFactories,
} from "./runtime-presentation-composition.js";

vi.mock("@actions/core", () => ({
	getInput: vi.fn().mockReturnValue("fr"),
	setFailed: vi.fn(),
}));

describe("shared runtime dependency composition", () => {
	it("shares reusable services within a composition", () => {
		// Arrange
		const composition = new GithubActionsComposition();

		// Act
		const input = composition.runtimeInput();
		const repeatedInput = composition.runtimeInput();
		const runner = composition.actionRunner();
		const repeatedRunner = composition.actionRunner();

		// Assert
		expect(repeatedInput).toBe(input);
		expect(repeatedRunner).toBe(runner);
	});

	it("isolates services between compositions", () => {
		// Arrange
		const first = new GithubActionsComposition();
		const second = new GithubActionsComposition();

		// Act
		const firstInput = first.runtimeInput();
		const secondInput = second.runtimeInput();
		const firstRunner = first.actionRunner();
		const secondRunner = second.actionRunner();

		// Assert
		expect(secondInput).not.toBe(firstInput);
		expect(secondRunner).not.toBe(firstRunner);
	});

	it("resolves a shared input service only when a consumer needs it", () => {
		// Arrange
		const container = GithubActionsComposition.createContainer();
		const activate = vi.fn((input: RuntimeInput) => input);
		container.onActivation(RuntimeInput, (_context, input) => activate(input));

		// Act
		container.get(ActionRunner);
		const activationsBeforeInput = activate.mock.calls.length;
		container.get(AiInput);
		container.get(EventPublicationConfiguration);

		// Assert
		expect(activationsBeforeInput).toBe(0);
		expect(activate).toHaveBeenCalledOnce();
	});

	it("injects an input replacement into every dependent service", () => {
		// Arrange
		const container = GithubActionsComposition.createContainer();
		const input = new RuntimeInput();
		const isObject = vi.spyOn(input, "isObject").mockReturnValue(false);
		container.rebind(RuntimeInput).toConstantValue(input);
		const aiConfiguration = {
			provider: "gemini",
			model: "test-model",
			apiKey: "test-key",
		};
		const publicationConfiguration = {
			version: 1,
			startTime: "18:00",
			endTime: "20:00",
			venues: {},
		};

		// Act
		const validateAi = () => container.get(AiInput).validate(aiConfiguration);
		const parsePublication = () =>
			container
				.get(EventPublicationConfiguration)
				.parse(publicationConfiguration);

		// Assert
		expect(validateAi).toThrow("Invalid AI configuration");
		expect(parsePublication).toThrow("Invalid event schedule configuration");
		expect(isObject).toHaveBeenCalledWith(aiConfiguration);
		expect(isObject).toHaveBeenCalledWith(publicationConfiguration);
	});

	it("creates independent localized messages and dates for each factory call", () => {
		// Arrange
		const composition = new GithubActionsComposition();

		// Act
		const english = composition.actionMessages("en");
		const french = composition.actionMessages("fr");
		const repeatedEnglish = composition.actionMessages("en");
		const englishMonth = composition
			.assetDateFormatter("en")
			.format("2026-01-15", "UTC", "month");
		const frenchMonth = composition
			.assetDateFormatter("fr")
			.format("2026-01-15", "UTC", "month");

		// Assert
		expect(english.locale).toBe("en");
		expect(french.locale).toBe("fr");
		expect(repeatedEnglish).not.toBe(english);
		expect(repeatedEnglish.locale).toBe("en");
		expect(englishMonth).toBe("January");
		expect(frenchMonth).toBe("janvier");
	});

	it("injects the locale resolver into both message factories", () => {
		// Arrange
		const container = GithubActionsComposition.createContainer();
		const resolveLocale = vi.fn().mockReturnValue("fr");
		container.rebind(LocaleResolver).toConstantValue({ resolveLocale });

		// Act
		const actionMessages = container.get<RuntimeFactories["actionMessages"]>(
			RUNTIME_FACTORIES.actionMessages,
		)("en");
		const assetMessages = container.get<RuntimeFactories["assetMessages"]>(
			RUNTIME_FACTORIES.assetMessages,
		)("en");

		// Assert
		expect(actionMessages.locale).toBe("fr");
		expect(assetMessages.locale).toBe("fr");
		expect(resolveLocale).toHaveBeenCalledTimes(2);
	});

	it("routes runner reports and diagnostics through replaced output services", async () => {
		// Arrange
		const container = GithubActionsComposition.createContainer();
		const report = new ActionReport();
		const write = vi.spyOn(report, "write").mockResolvedValue(undefined);
		const output = new ActionOutput();
		const setDiagnosticsOutput = vi
			.spyOn(output, "setDiagnosticsOutput")
			.mockReturnValue(undefined);
		container.rebind(ActionReport).toConstantValue(report);
		container.rebind(ActionOutput).toConstantValue(output);
		const data = { details: ["test result"], diagnostics: [] };
		const operation = vi.fn().mockResolvedValue(data);

		// Act
		await container
			.get(ActionRunner)
			.run("action.event.reconcile", operation, true);

		// Assert
		expect(operation).toHaveBeenCalledWith(
			expect.objectContaining({ locale: "fr" }),
		);
		expect(write).toHaveBeenCalledWith(
			expect.any(String),
			data,
			expect.objectContaining({ locale: "fr" }),
		);
		expect(setDiagnosticsOutput).toHaveBeenCalledWith(data.diagnostics);
	});
});
