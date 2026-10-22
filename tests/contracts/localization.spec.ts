import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, expectTypeOf, it } from "vitest";
import { GUIDANCE } from "../../packages/adapter/event/github-event-comment-repository/src/diagnostic-guidance.js";
import { EventCommentMessages } from "../../packages/adapter/event/github-event-comment-repository/src/i18n/event-comment-messages.js";
import { GithubEventCommentRepositoryComposition } from "../../packages/adapter/event/github-event-comment-repository/src/index.js";
import type { STAGE_GUIDANCE } from "../../packages/adapter/event/github-event-comment-repository/src/stage-diagnostic-guidance.js";
import type { IssueFormMessages } from "../../packages/adapter/journey/yaml-issue-form-projection/src/i18n/issue-form-messages.js";
import type { CommunicationJourneyDiagnostic } from "../../packages/application/journey/src/index.js";
import { JourneyPolicyComposition } from "../../packages/application/journey/src/index.js";
import type { CommunicationDiagnostic } from "../../packages/domain/communication/src/index.js";
import type { ReferentialDiagnostic } from "../../packages/domain/referential/src/index.js";
import { LocalizationComposition } from "../../packages/presentation/localization/src/index.js";
import { ActionMessages } from "../../packages/runtime/github-actions/src/i18n/action-messages.js";
import type { MessageId } from "../../packages/runtime/github-actions/src/i18n/catalog.js";
import { DIAGNOSTICS_REFERENTIAL_EN } from "../../packages/runtime/github-actions/src/i18n/diagnostics-referential.en.js";
import {
	type ActionManifest,
	automationActionPrefix,
	readYaml,
	root,
	type Workflow,
	workflowExpression,
} from "./support.js";

describe("localization contract", () => {
	it("requires an explicit locale in every published action", async () => {
		// Arrange
		const paths = (
			await readdir(join(root, "actions"), { recursive: true })
		).filter((path) => path.endsWith("/action.yml"));

		// Act
		const actions = await Promise.all(
			paths.map((path) => readYaml<ActionManifest>(join("actions", path))),
		);

		// Assert
		expect(actions.length).toBeGreaterThan(0);
		for (const action of actions) {
			expect(action.inputs?.locale).toMatchObject({
				required: true,
			});
			expect(action.inputs?.locale).not.toHaveProperty("default");
		}
	});
	it("forwards locale through every reusable workflow action and keeps reporting in actions", async () => {
		// Arrange
		const paths = (await readdir(join(root, ".github/workflows"))).filter(
			(path) => path.endsWith(".yml"),
		);

		// Act
		const workflows = await Promise.all(
			paths.map((path) => readYaml<Workflow>(join(".github/workflows", path))),
		);
		const publicWorkflows = workflows.filter((workflow) =>
			Object.values(workflow.jobs ?? {}).some((job) =>
				job.steps?.some((step) =>
					step.uses?.startsWith(automationActionPrefix),
				),
			),
		);

		// Assert
		expect(publicWorkflows.length).toBeGreaterThan(0);
		for (const workflow of publicWorkflows) {
			expect(workflow.on?.workflow_call?.inputs?.locale).toMatchObject({
				required: true,
				type: "string",
			});
			expect(workflow.on?.workflow_call?.inputs?.locale).not.toHaveProperty(
				"default",
			);
			for (const job of Object.values(workflow.jobs ?? {}))
				for (const step of job.steps ?? []) {
					if (step.uses?.startsWith(automationActionPrefix))
						expect(step.with?.locale).toBe(workflowExpression("inputs.locale"));
					expect(step.run ?? "").not.toContain("GITHUB_STEP_SUMMARY");
				}
		}
	});
	it("localizes registered organizer guidance in its owning presenter", () => {
		// Arrange
		const english = new EventCommentMessages(
			{ localeResolver: new LocalizationComposition().localeResolver() },
			"en",
		);
		const french = new EventCommentMessages(
			{ localeResolver: new LocalizationComposition().localeResolver() },
			"fr",
		);
		const privateMessage = "private@example.test";

		// Act
		const guidance = [...GUIDANCE].map(([code, [, key]]) => ({
			key,
			english: new GithubEventCommentRepositoryComposition()
				.diagnosticPresenter()
				.presentDiagnostic(
					{
						code,
						severity: "error",
						category: "invalid",
						message: privateMessage,
					},
					english,
				),
			french: new GithubEventCommentRepositoryComposition()
				.diagnosticPresenter()
				.presentDiagnostic(
					{
						code,
						severity: "error",
						category: "invalid",
						message: privateMessage,
					},
					french,
				),
		}));

		// Assert
		expect(guidance.length).toBeGreaterThan(0);
		for (const item of guidance) {
			expect(item.english.message).toBe(english.t(item.key));
			expect(item.french.message).toBe(french.t(item.key));
			expect(item.french.message).not.toBe(item.english.message);
			expect(item.french.message).not.toContain(privateMessage);
		}
	});
	it("handles every communication code as guidance or filtered information", () => {
		// Arrange
		const informational = [
			"communication.duplicate-intent",
			"communication.delivery-already-recorded",
			"communication.dispatch-disabled-by-config",
			"communication.event-skipped",
		] as const;
		type PublicCodes =
			| `communication.${CommunicationDiagnostic["code"]}`
			| CommunicationJourneyDiagnostic["code"];
		type CoveredCodes =
			| (typeof STAGE_GUIDANCE)[number][0]
			| (typeof informational)[number];

		// Act
		const classifications = informational.map((code) =>
			new JourneyPolicyComposition()
				.diagnosticPolicy()
				.classify({ code, severity: "warning" }),
		);

		// Assert
		expect(classifications).toEqual(informational.map(() => "informational"));
		expectTypeOf<Exclude<PublicCodes, CoveredCodes>>().toEqualTypeOf<never>();
	});
	it.each([
		["new.diagnostic", "comment.unknown"],
		["referential.speaker.custom-field.invalid", "comment.referential"],
	] as const)(
		"uses safe localized guidance for extensible diagnostic %s",
		(code, key) => {
			// Arrange
			const messages = new EventCommentMessages(
				{ localeResolver: new LocalizationComposition().localeResolver() },
				"fr",
			);
			const diagnostic = {
				code,
				severity: "error" as const,
				category: "invalid" as const,
				message: "private@example.test",
				field: "private@example.test",
			};

			// Act
			const presented = new GithubEventCommentRepositoryComposition()
				.diagnosticPresenter()
				.presentDiagnostic(diagnostic, messages);

			// Assert
			expect(presented.message).toBe(messages.t(key));
			expect(JSON.stringify(presented)).not.toContain("private@example.test");
		},
	);
	it("localizes referential diagnostics used in speaker review pull requests", () => {
		// Arrange
		const messages = new ActionMessages(
			{ localeResolver: new LocalizationComposition().localeResolver() },
			"fr",
		);
		const codes = Object.keys(DIAGNOSTICS_REFERENTIAL_EN).map((key) =>
			key.replace(/^diagnostic\./, ""),
		);

		// Act
		const missing = codes.filter(
			(code) => messages.diagnostic(code, "MISSING") === "MISSING",
		);

		// Assert
		expect(missing).toEqual([]);
		expectTypeOf<`diagnostic.${ReferentialDiagnostic["code"]}`>().toExtend<MessageId>();
	});
	it("keeps feature catalogs and application dependencies out of shared formatting infrastructure", async () => {
		// Arrange
		const directory = join(root, "packages/presentation/localization/src");
		const files = (await readdir(directory, { recursive: true })).filter(
			(path) => path.endsWith(".ts") && !path.endsWith(".test.ts"),
		);

		// Act
		const sources = await Promise.all(
			files.map(async (path) => ({
				path,
				source: await readFile(join(directory, path), "utf8"),
			})),
		);
		const catalogs = files.filter((path) => /\.(?:en|fr)\.ts$/.test(path));
		const coupled = sources.filter(({ source }) =>
			/["'](?:action|report|diagnostic|error|comment|form|communication)\.[\w.-]+["']\s*:|@meetup-automation\//.test(
				source,
			),
		);

		// Assert
		expect(files.length).toBeGreaterThan(0);
		expect(catalogs).toEqual([]);
		expect(coupled.map(({ path }) => path)).toEqual([]);
	});

	it("restricts each presenter to its own message keys", () => {
		// Arrange
		type ReportKeys = Parameters<ActionMessages["t"]>[0];
		type CommentKeys = Parameters<EventCommentMessages["t"]>[0];
		type FormKeys = Parameters<IssueFormMessages["t"]>[0];

		// Act
		type ForeignReportKeys = Exclude<
			ReportKeys,
			| `action.${string}`
			| `report.${string}`
			| `diagnostic.${string}`
			| `error.${string}`
			| `workflow.${string}`
		>;
		type ForeignCommentKeys = Exclude<CommentKeys, `comment.${string}`>;
		type ForeignFormKeys = Exclude<FormKeys, `form.${string}`>;

		// Assert
		expectTypeOf<ForeignReportKeys>().toEqualTypeOf<never>();
		expectTypeOf<ForeignCommentKeys>().toEqualTypeOf<never>();
		expectTypeOf<ForeignFormKeys>().toEqualTypeOf<never>();
	});
});
