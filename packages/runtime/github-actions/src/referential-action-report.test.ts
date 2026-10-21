import { LocalizationComposition } from "@meetup-automation/localization";
import { describe, expect, it } from "vitest";
import { GithubActionsComposition } from "./dependency-composition.js";
import { ActionMessages } from "./i18n/action-messages.js";
import { ReferentialActionReport } from "./referential-action-report.js";

describe("referential action report facts", () => {
	it.each([true, false])(
		"reports catalog validity and counts when valid is %s",
		(isValid) => {
			// Arrange
			const counts = {
				isValid,
				hostCount: isValid ? 3 : 0,
				speakerCount: isValid ? 7 : 0,
			};
			const diagnostics = [
				{
					code: "referential.speaker.id.invalid",
					severity: "warning" as const,
					message: "Invalid stable identifier.",
				},
			];

			// Act
			const report = new ReferentialActionReport().validation(
				counts,
				diagnostics,
				new GithubActionsComposition().actionMessages("en"),
			);

			// Assert
			expect(report.details).toEqual([
				isValid ? "referentials=valid" : "referentials=invalid",
				isValid ? "hosts=3 speakers=7" : "hosts=0 speakers=0",
			]);
			expect(report.diagnostics).toEqual(diagnostics);
			expect(report.failure).toBeUndefined();
		},
	);

	it.each([
		{ mode: "check", status: "issue_form=stale" },
		{ mode: "fix", status: "issue_form=updated" },
	] as const)("reports affected files in $mode mode", ({ mode, status }) => {
		// Arrange
		const result = {
			changed: true,
			changedFiles: [".github/ISSUE_TEMPLATE/example.yml"],
			diagnostics: [],
		};

		// Act
		const report = new ReferentialActionReport().issueForm(
			mode,
			result,
			new GithubActionsComposition().actionMessages("en"),
		);

		// Assert
		expect(report.details).toEqual([
			status,
			"files=.github/ISSUE_TEMPLATE/example.yml",
		]);
		expect(report.failure).toBeUndefined();
	});

	it.each(["en", "fr"])("keeps technical facts concise in %s", (locale) => {
		// Arrange
		const result = {
			changed: true,
			changedFiles: [".github/ISSUE_TEMPLATE/example.yml"],
			diagnostics: [],
		};

		// Act
		const report = new ReferentialActionReport().issueForm(
			"check",
			result,
			new ActionMessages(
				{ localeResolver: new LocalizationComposition().localeResolver() },
				locale,
			),
		);

		// Assert
		expect(report.details).toEqual([
			"issue_form=stale",
			"files=.github/ISSUE_TEMPLATE/example.yml",
		]);
		expect(report.failure).toBeUndefined();
	});

	it.each(["check", "fix"] as const)(
		"reports an unchanged issue form as current in %s mode",
		(mode) => {
			// Arrange
			const result = { changed: false, changedFiles: [], diagnostics: [] };

			// Act
			const report = new ReferentialActionReport().issueForm(
				mode,
				result,
				new GithubActionsComposition().actionMessages("en"),
			);

			// Assert
			expect(report.details).toEqual(["issue_form=current"]);
			expect(report.failure).toBeUndefined();
		},
	);

	it.each(["check", "fix"] as const)(
		"reports organizer blockers in %s mode without failing or claiming the form is current",
		(mode) => {
			// Arrange
			const result = {
				changed: false,
				changedFiles: [],
				diagnostics: [
					{
						code: "referential.speaker.id.invalid",
						severity: "error" as const,
						field: "speakers[0].speakerId",
						message: "Speaker stable identifiers must be valid.",
					},
				],
			};

			// Act
			const report = new ReferentialActionReport().issueForm(
				mode,
				result,
				new GithubActionsComposition().actionMessages("en"),
			);

			// Assert
			expect(report.details).toEqual([
				"issue_form=blocked reason=invalid-referentials",
			]);
			expect(report.diagnostics).toEqual(result.diagnostics);
			expect(report.failure).toBeUndefined();
		},
	);
});
