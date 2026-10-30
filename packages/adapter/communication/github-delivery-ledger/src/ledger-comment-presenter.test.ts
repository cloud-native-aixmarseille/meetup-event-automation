import { LocalizationComposition } from "@meetup-automation/localization";
import { describe, expect, it } from "vitest";
import { inspectLedgerComment } from "../testing/ledger-comment.js";
import { GithubDeliveryLedgerComposition } from "./dependency-composition.js";
import {
	DELIVERY_LEDGER_MARKER,
	type StoredEntry,
	type StoredLedger,
} from "./github-delivery-ledger-contracts.js";
import { LedgerMessages } from "./i18n/ledger-messages.js";
import { LedgerCommentPresenter } from "./ledger-comment-presenter.js";

const entry: StoredEntry = {
	idempotencyKey: "opaque-key",
	intentId: "opaque-intent",
	repositoryId: "opaque-repository",
	eventId: "opaque-event",
	kind: "readiness-reminder",
	recipientId: "opaque-recipient",
	policyVersion: "1",
	status: "accepted",
	updatedAt: "2026-09-04T10:00:00.000Z",
};

describe("LedgerCommentPresenter", () => {
	it.each([
		["en", "Delivery status", "Organizer Slack reminder: Accepted (1)"],
		["fr", "Suivi des envois", "Rappel Slack aux organisateurs : Accepté (1)"],
	])(
		"shows a readable delivery summary and hides machine state in %s",
		(locale, title, row) => {
			// Arrange
			const presenter = new LedgerCommentPresenter(
				{
					ledgerCommentCodec:
						new GithubDeliveryLedgerComposition().ledgerCommentCodec(),
				},
				new LedgerMessages(
					{ localeResolver: new LocalizationComposition().localeResolver() },
					locale,
				),
			);
			const ledger: StoredLedger = { schemaVersion: 2, entries: [entry] };

			// Act
			const body = presenter.render(ledger);
			const { visible, persisted } = inspectLedgerComment(body);

			// Assert
			expect(body.startsWith(DELIVERY_LEDGER_MARKER)).toBe(true);
			expect(visible).toContain(title);
			expect(visible).toContain(row);
			expect(visible).not.toContain("schemaVersion");
			expect(visible).not.toContain("opaque-");
			expect(visible).not.toContain("```");
			expect(persisted).toEqual(ledger);
		},
	);

	it.each(["pending", "uncertain", "rejected"] as const)(
		"explains how to handle %s deliveries",
		(status) => {
			// Arrange
			const presenter = new LedgerCommentPresenter(
				{
					ledgerCommentCodec:
						new GithubDeliveryLedgerComposition().ledgerCommentCodec(),
				},
				new GithubDeliveryLedgerComposition().ledgerMessages("en"),
			);

			// Act
			const body = presenter.render({
				schemaVersion: 2,
				entries: [{ ...entry, status }],
			});

			// Assert
			expect(body).toContain(
				"Check delivery with the provider before retrying",
			);
			expect(body).not.toContain("Accepted");
		},
	);

	it("groups email recipients without claiming successful email delivery", () => {
		// Arrange
		const presenter = new LedgerCommentPresenter(
			{
				ledgerCommentCodec:
					new GithubDeliveryLedgerComposition().ledgerCommentCodec(),
			},
			new GithubDeliveryLedgerComposition().ledgerMessages("en"),
		);
		const entries: StoredEntry[] = [
			{ ...entry, kind: "speaker-introduction" },
			{ ...entry, kind: "speaker-introduction", idempotencyKey: "second-key" },
		];

		// Act
		const body = presenter.render({ schemaVersion: 2, entries });

		// Assert
		expect(body).toContain("Speaker introduction: Accepted (2)");
		expect(body).toContain("inbox delivery is unverified");
	});

	it.each([
		["comment terminators and fences", "-->\n```json\n<!channel>\n<!--"],
		["nested comment delimiters", "<<!--nested-->!-->"],
		["alternate comment terminators", "--!>\n<!channel>\n<!--"],
		["adjacent comment boundaries", "<!--first--><!--second-->"],
	])("keeps %s in stored values from exposing metadata", (_name, malicious) => {
		// Arrange
		const presenter = new LedgerCommentPresenter(
			{
				ledgerCommentCodec:
					new GithubDeliveryLedgerComposition().ledgerCommentCodec(),
			},
			new GithubDeliveryLedgerComposition().ledgerMessages("en"),
		);
		const ledger: StoredLedger = {
			schemaVersion: 2,
			entries: [{ ...entry, diagnosticCode: malicious }],
		};

		// Act
		const body = presenter.render(ledger);
		const { visible, persisted } = inspectLedgerComment(body);

		// Assert
		expect(visible).not.toContain("<!channel>");
		expect(visible).not.toContain("```");
		expect(persisted).toEqual(ledger);
	});
});
