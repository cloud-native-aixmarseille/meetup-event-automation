import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GithubActionsComposition } from "./dependency-composition.js";
import { RegistrationAction } from "./registration-action.js";

const mocks = vi.hoisted(() => ({
	setSecret: vi.fn(),
	create: vi.fn(),
	execute: vi.fn(),
	getOctokit: vi.fn(),
}));
vi.mock("@actions/core", async (original) => ({
	...(await original<typeof import("@actions/core")>()),
	setSecret: mocks.setSecret,
}));
vi.mock("@actions/github", () => ({
	context: { repo: { owner: "example", repo: "meetups" } },
	getOctokit: mocks.getOctokit,
}));

const inputs = {
	"issue-number": "12",
	"github-token": "synthetic-token",
	"google-credentials": "synthetic-credentials",
	"registrations-sheet-url":
		"https://docs.google.com/spreadsheets/d/source/edit#gid=9",
	"email-column": "Adresse e-mail",
	"first-data-row": "3",
	"last-data-row": "8",
};
beforeEach(() => {
	vi.clearAllMocks();
	for (const [name, value] of Object.entries(inputs))
		vi.stubEnv(`INPUT_${name.toUpperCase()}`, value);
	mocks.create.mockReturnValue({ execute: mocks.execute });
	mocks.execute.mockResolvedValue({
		status: "blocked",
		responseCount: 6,
		participantCount: 5,
		duplicateCount: 1,
		invalidCount: 0,
		diagnostics: [
			{
				code: "publication.registration.provider-unavailable",
				severity: "warning",
				message: "OCGroups provider operations are unavailable",
			},
		],
	});
});
afterEach(() => vi.unstubAllEnvs());

function subject() {
	return new RegistrationAction({
		runtime: new GithubActionsComposition().runtimeInput(),
		create: mocks.create,
	});
}

describe("registration action boundary", () => {
	it.each(Object.keys(inputs))(
		"requires %s before reading responses",
		async (name) => {
			// Arrange
			vi.stubEnv(`INPUT_${name.toUpperCase()}`, "");
			// Act
			const operation = subject().run(
				new GithubActionsComposition().actionMessages("en"),
			);
			// Assert
			await expect(operation).rejects.toThrow();
			expect(mocks.execute).not.toHaveBeenCalled();
		},
	);

	it("binds the exact event and rows and masks credentials", async () => {
		// Arrange
		const action = subject();
		// Act
		const report = await action.run(
			new GithubActionsComposition().actionMessages("en"),
		);
		// Assert
		expect(mocks.create).toHaveBeenCalledWith(
			expect.objectContaining({
				url: inputs["registrations-sheet-url"],
				firstDataRow: 3,
				lastDataRow: 8,
				credentials: "synthetic-credentials",
				locale: "en",
			}),
		);
		expect(mocks.execute).toHaveBeenCalledWith(
			{ repository: "example/meetups", issueNumber: 12 },
			{ emailColumn: "Adresse e-mail" },
		);
		expect(mocks.setSecret).toHaveBeenCalledWith("synthetic-credentials");
		expect(report.details.join(" ")).toContain("source_participants=5");
		expect(report.details.join(" ")).toContain(
			"registration_reconciliation=blocked",
		);
		expect(report.details.join(" ")).toContain("Reconciliation blocked");
		expect(report.details.join(" ")).toContain(
			"neither remote outcome has been verified",
		);
		expect(JSON.stringify(report)).not.toContain("synthetic-credentials");
		expect(JSON.stringify(report)).not.toContain("spreadsheets/d/source");
	});

	it.each(["blocked", "invalid", "skipped"])(
		"reports %s in French without claiming registration",
		async (status) => {
			// Arrange
			mocks.execute.mockResolvedValue({
				status,
				responseCount: 0,
				participantCount: 0,
				duplicateCount: 0,
				invalidCount: 0,
				diagnostics: [],
			});
			// Act
			const report = await subject().run(
				new GithubActionsComposition().actionMessages("fr"),
			);
			// Assert
			expect(report.details[1]).toMatch(/(bloquée|attente|inchangée)/);
			expect(report.details[1]).not.toContain("Reconciliation blocked");
		},
	);
});
