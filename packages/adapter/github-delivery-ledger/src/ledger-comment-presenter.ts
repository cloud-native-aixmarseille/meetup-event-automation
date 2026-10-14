import {
	DELIVERY_LEDGER_MARKER,
	type StoredLedger,
} from "./github-delivery-ledger-contracts.js";
import { LedgerMessages } from "./i18n/ledger-messages.js";

export class LedgerCommentPresenter {
	constructor(private readonly messages = new LedgerMessages()) {}

	render(ledger: StoredLedger): string {
		const groups = new Map<
			string,
			{ kind: string; status: string; count: number }
		>();
		for (const entry of ledger.entries) {
			const kind = this.messages.t("ledger.kind", {
				kind: entry.kind.replaceAll("-", "_"),
			});
			const status = this.messages.t("ledger.status", { status: entry.status });
			const key = JSON.stringify([kind, status]);
			const group = groups.get(key) ?? { kind, status, count: 0 };
			group.count += 1;
			groups.set(key, group);
		}
		const lines = [DELIVERY_LEDGER_MARKER, this.messages.t("ledger.title")];
		lines.push(
			groups.size === 0
				? this.messages.t("ledger.empty")
				: [...groups.values()]
						.map((group) => this.messages.t("ledger.row", group))
						.join("\n"),
		);
		if (
			ledger.entries.some(
				(entry) =>
					entry.kind !== "readiness-reminder" && entry.status === "accepted",
			)
		) {
			lines.push(this.messages.t("ledger.explanation"));
		}
		if (ledger.entries.some((entry) => entry.status !== "accepted")) {
			lines.push(this.messages.t("ledger.attention"));
		}
		// Retain the stable JSON fence for existing readers, hidden in rendered Markdown.
		const json = JSON.stringify(ledger, null, 2).replace(
			/[<>&`-]/g,
			(character) =>
				`\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`,
		);
		lines.push(`<!--\n\`\`\`json\n${json}\n\`\`\`\n-->`);
		return lines.join("\n\n");
	}
}
