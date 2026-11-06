import { CommunicationDomainComposition } from "@meetup-automation/communication";
import { LocalizationComposition } from "@meetup-automation/localization";
import { describe, expect, it } from "vitest";
import { episode, fixture, state } from "../testing/attention.fixtures.js";
import { AttentionDiagnosticChecklist } from "./attention-diagnostic-checklist.js";
import { AttentionPresenter } from "./attention-presenter.js";
import { GithubOrganizerAttentionComposition } from "./dependency-composition.js";
import { AttentionMessages } from "./i18n/attention-messages.js";

describe("GitHub attention presentation", () => {
	it("includes concrete blockers and separate approval links in the shared follow-up", () => {
		// Arrange
		const f = fixture();
		const action =
			"Review the conflicting [slides](https://drive.google.com/file/d/slides/view).";
		f.checklist.set(
			80,
			`<!-- meetup-automation:event-diagnostics:v1 -->\n\n- [ ] **Communication**: Approve sending the PDF to Meetup attendees.\n- [ ] **Event materials**: ${action}`,
		);
		const pending = episode("approval-pending", "meetup-slides:revision");
		pending.condition = { ...pending.condition, commentId: 300 };

		// Act
		const body = f.presenter.details({
			...state(),
			commentId: 200,
			post: undefined,
			episodes: [pending],
		});

		// Assert
		expect(body).toContain(action);
		expect(body).toContain("#issuecomment-300");
		expect(body).not.toContain("meetup-automation:event-diagnostics");
		expect(body.match(/Approve sending the PDF/g)).toHaveLength(1);
	});
	it.each([
		[
			"publication.meetup.authentication-account-unavailable",
			"The logged-in account could not be verified after retries.",
		],
		[
			"publication.meetup.editor",
			"Meetup event editor loading or preparation failed.",
		],
	])("shows the classified failure and its run: %s", (resource, message) => {
		// Arrange
		const { presenter } = fixture();
		const failure = {
			...episode("integration-failure", resource),
			runId: "1234",
		};
		failure.condition = { ...failure.condition, owner: "event" };

		// Act
		const body = presenter.details({
			...state(),
			post: undefined,
			episodes: [failure],
		});

		// Assert
		expect(body).toContain(message);
		expect(body).toContain("/actions/runs/1234");
		expect(body).not.toContain("Issue update failed");
	});
	it("links a retained failure to the run that observed it", () => {
		// Arrange
		const { presenter } = fixture();
		const failure = {
			...episode("integration-failure", "assets"),
			runId: "100",
		};

		// Act
		const body = presenter.details({
			...state(),
			post: undefined,
			runId: "200",
			episodes: [failure],
		});

		// Assert
		expect(body).toContain("/actions/runs/100");
		expect(body).not.toContain("/actions/runs/200");
	});
	it("identifies the field that needs correction", () => {
		// Arrange
		const { presenter } = fixture();

		// Act
		const body = presenter.details({
			...state(),
			post: undefined,
			episodes: [episode("required-data", "agenda-descriptions")],
		});

		// Assert
		expect(body).toContain("Complete or correct: talk descriptions.");
	});
	it("links content review with content-specific guidance", () => {
		// Arrange
		const { presenter } = fixture();
		const pending = episode("approval-pending", "content-review:revision");
		pending.condition = { ...pending.condition, commentId: 200 };
		// Act
		const body = presenter.details({
			...state(),
			post: undefined,
			episodes: [pending],
		});
		// Assert
		expect(body).toContain("Edit the proposed text if needed");
		expect(body).toContain("#issuecomment-200");
		expect(body).not.toContain("email batch");
	});

	it("links each pending social destination and removes decided work despite a delivery failure", () => {
		// Arrange
		const { presenter } = fixture();
		const pending = ["slack-one:d0", "slack-two:d0"].map((target, index) => {
			const value = episode(
				"approval-pending",
				`social-publication:revision-${index}`,
			);
			return {
				...value,
				condition: { ...value.condition, target, commentId: 200 + index },
			};
		});
		const overview = {
			...state(),
			commentId: 100,
			post: undefined,
			episodes: pending,
		};

		// Act
		const before = presenter.issue(overview, "");
		const after = presenter.issue(
			{
				...overview,
				episodes: [
					{ ...pending[0], status: "resolved" },
					pending[1],
					episode("integration-failure", "social"),
				],
			},
			"",
		);

		// Assert
		expect(before).toContain("Publication approval: slack-one:d0.");
		expect(before).toContain("#issuecomment-200");
		expect(before).toContain("Publication approval: slack-two:d0.");
		expect(before).toContain("#issuecomment-201");
		expect(after).not.toContain("#issuecomment-200");
		expect(after).toContain("#issuecomment-201");
		expect(after).toContain("failed");
	});

	it("keeps supplied metadata separate from localized task formatting", () => {
		// Arrange
		const checklist = new AttentionDiagnosticChecklist({
			createAttentionMessages: (...args) =>
				new GithubOrganizerAttentionComposition().attentionMessages(...args),
		});
		const presenter = new AttentionPresenter(
			{
				attentionPolicy: new CommunicationDomainComposition().attentionPolicy(),
				attentionTaskSelection:
					new CommunicationDomainComposition().attentionTaskSelection(),
			},
			"example/meetups",
			42,
			checklist,
			new GithubOrganizerAttentionComposition().attentionMessages("en"),
		);
		const value = {
			...state(),
			post: undefined,
			episodes: [
				episode("integration-failure", "unknown-one"),
				episode("integration-failure", "unknown-two"),
			],
		};

		// Act
		const body = presenter.issue(value, "<!-- opaque metadata -->");

		// Assert
		expect(body).toContain("<!-- opaque metadata -->");
		expect(body.match(/Automation failed: review the issue/g)).toHaveLength(1);
	});
	it.each([
		["approval-pending", "Approve or reject the emails."],
		["delivery-recovery", "Verify delivery before retrying."],
	] as const)("keeps one concrete %s task", (code, action) => {
		// Arrange
		const checklist = new AttentionDiagnosticChecklist({
			createAttentionMessages: (...args) =>
				new GithubOrganizerAttentionComposition().attentionMessages(...args),
		});
		const presenter = new AttentionPresenter(
			{
				attentionPolicy: new CommunicationDomainComposition().attentionPolicy(),
				attentionTaskSelection:
					new CommunicationDomainComposition().attentionTaskSelection(),
			},
			"example/meetups",
			42,
			checklist,
			new GithubOrganizerAttentionComposition().attentionMessages("en"),
		);
		checklist.set(
			100,
			`<!-- meetup-automation:event-diagnostics:v1 -->\n\n- [ ] **Communication**: ${action}`,
		);
		const value = { ...state(), post: undefined, episodes: [episode(code)] };

		// Act
		const body = presenter.issue(value, "");

		// Assert
		expect(body.split(action)).toHaveLength(2);
	});
	it("preserves existing concrete guidance and only adds distinct work", () => {
		// Arrange
		const checklist = new AttentionDiagnosticChecklist({
			createAttentionMessages: (...args) =>
				new GithubOrganizerAttentionComposition().attentionMessages(...args),
		});
		const presenter = new AttentionPresenter(
			{
				attentionPolicy: new CommunicationDomainComposition().attentionPolicy(),
				attentionTaskSelection:
					new CommunicationDomainComposition().attentionTaskSelection(),
			},
			"example/meetups",
			42,
			checklist,
			new AttentionMessages(
				{ localeResolver: new LocalizationComposition().localeResolver() },
				"fr",
			),
		);
		const prefix =
			"<!-- meetup-automation:event-diagnostics:v1 -->\n\n- [ ] **Event Title**: Ajoutez un titre.\n- [ ] **Host confirmation**: Confirmez l'hôte.";
		checklist.set(100, prefix);
		const value = {
			...state(),
			post: undefined,
			episodes: [
				episode("required-data", "event"),
				episode("host-confirmation", "host"),
				episode("manual-publication", "publish-community-event"),
			],
		};

		// Act
		const body = presenter.issue(value, "");

		// Assert
		expect(body.startsWith(prefix)).toBe(true);
		expect(body.match(/Confirmez/g)).toHaveLength(1);
		expect(body).toContain(
			'Publiez sur la plateforme CNCF et renseignez le champ "CNCF Link".',
		);
	});
	it("shows pending notification recovery without claiming the event is clear", () => {
		// Arrange
		const checklist = new AttentionDiagnosticChecklist({
			createAttentionMessages: (...args) =>
				new GithubOrganizerAttentionComposition().attentionMessages(...args),
		});
		const presenter = new AttentionPresenter(
			{
				attentionPolicy: new CommunicationDomainComposition().attentionPolicy(),
				attentionTaskSelection:
					new CommunicationDomainComposition().attentionTaskSelection(),
			},
			"example/meetups",
			42,
			checklist,
			new GithubOrganizerAttentionComposition().attentionMessages("en"),
		);

		// Act
		const body = presenter.details({ ...state(), stopped: true });

		// Assert
		expect(body).toContain(
			"- [ ] Verify the Slack post before retrying: delivery is unconfirmed.",
		);
		expect(body).not.toContain("No pending tasks.");
	});
	it("keeps unknown tasks alongside a concrete action", () => {
		// Arrange
		const checklist = new AttentionDiagnosticChecklist({
			createAttentionMessages: (...args) =>
				new GithubOrganizerAttentionComposition().attentionMessages(...args),
		});
		const presenter = new AttentionPresenter(
			{
				attentionPolicy: new CommunicationDomainComposition().attentionPolicy(),
				attentionTaskSelection:
					new CommunicationDomainComposition().attentionTaskSelection(),
			},
			"example/meetups",
			42,
			checklist,
			new GithubOrganizerAttentionComposition().attentionMessages("en"),
		);
		checklist.set(
			100,
			"<!-- meetup-automation:event-diagnostics:v1 -->\n\n- [ ] **Communication**: Verify delivery before retrying.",
		);
		const recovery = episode("delivery-recovery");
		recovery.status = "unknown";

		// Act
		const body = presenter.details({
			...state(),
			post: undefined,
			episodes: [recovery],
		});

		// Assert
		expect(body).toContain("status unverified");
	});
});
