import { describe, expect, it } from "vitest";
import { request } from "../testing/approval.fixtures.js";
import { ApprovalPresenter } from "./approval-presenter.js";
import { ApprovalRecord } from "./approval-record.js";
import { ApprovalMessages } from "./i18n/approval-messages.js";

const detailed = {
	...request,
	recipientCount: 1,
	details: {
		emails: [
			{
				kind: "speaker-thanks" as const,
				recipientName: "Alex Example",
				links: [
					{
						kind: "feedback" as const,
						title: "Reliable platforms",
						url: "https://openfeedback.io/example/0/talk?displayVotes=true",
					},
				],
				omittedLinks: 0,
			},
		],
		omittedEmails: 0,
	},
};

describe("approval request details", () => {
	it.each(["en", "fr"])(
		"renders collapsed readable email details in %s",
		(locale) => {
			// Arrange
			const presenter = new ApprovalPresenter(new ApprovalMessages(locale));
			const record = ApprovalRecord.create(detailed);

			// Act
			const body = presenter.issue(record, { status: "pending" });

			// Assert
			expect(body).toContain("<details>\n<summary>");
			expect(body).not.toContain("<details open");
			expect(body).toContain("Alex Example");
			expect(body).toContain(
				locale === "fr"
					? "Remerciement pour l&#39;intervenant"
					: "Thank-you email for the speaker",
			);
			expect(body).toContain("Reliable platforms</a>");
			expect(body).toContain(
				'href="https://openfeedback.io/example/0/talk?displayVotes=true"',
			);
			expect(body).toContain(
				locale === "fr" ? "Voir le détail des e-mails" : "Review email details",
			);
		},
	);

	it("rejects approval when a person edits the displayed feedback destination", () => {
		// Arrange
		const presenter = new ApprovalPresenter(new ApprovalMessages());
		const record = ApprovalRecord.create(detailed);
		const original = presenter.issue(record, { status: "approved" });
		const changed = original.replace(
			'href="https://openfeedback.io/example/0/talk?displayVotes=true"',
			'href="https://example.invalid/different"',
		);

		// Act
		const accepted = presenter.decision(record, original);
		const rejected = presenter.decision(record, changed);

		// Assert
		expect(accepted.status).toBe("approved");
		expect(rejected.status).toBe("pending");
	});

	it("escapes public text and keeps it inside the metadata comment and collapsed section", () => {
		// Arrange
		const record = ApprovalRecord.create({
			...detailed,
			details: {
				...detailed.details,
				emails: [
					{
						...detailed.details.emails[0],
						recipientName: "--><img src=x> @person **name**",
					},
				],
			},
		});
		const presenter = new ApprovalPresenter(new ApprovalMessages());

		// Act
		const body = presenter.issue(record, { status: "pending" });
		const restored = ApprovalRecord.read(body);

		// Assert
		expect(body).not.toContain("<img");
		expect(body.match(/-->/g)).toHaveLength(1);
		expect(body).toContain("&lt;img src=x&gt; &#64;person");
		expect(restored.details).toEqual(record.details);
	});

	it("retains the reviewed details after the decision is recorded", () => {
		// Arrange
		const record = {
			...ApprovalRecord.create(detailed),
			decision: {
				status: "approved" as const,
				actor: "organizer",
				decidedAt: request.requestedAt,
			},
		};
		const presenter = new ApprovalPresenter(new ApprovalMessages());

		// Act
		const body = presenter.issue(record, record.decision);

		// Assert
		expect(body).toContain("✅ **Approved**");
		expect(body).toContain("<details>");
		expect(body).toContain("Reliable platforms</a>");
		expect(body).not.toContain("- [ ]");
	});
});
