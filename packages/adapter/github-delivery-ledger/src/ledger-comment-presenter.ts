import {
	DELIVERY_LEDGER_MARKER,
	type StoredLedger,
} from "./github-delivery-ledger-contracts.js";
import type {
	LedgerMessages,
	LedgerMessagesArguments,
} from "./i18n/ledger-messages.js";
import type { LedgerCommentCodec } from "./ledger-comment-codec.js";

export interface LedgerCommentPresenterCollaborators {
	readonly ledgerCommentCodec: Pick<LedgerCommentCodec, "encode">;
	readonly createLedgerMessages: (
		...args: LedgerMessagesArguments
	) => LedgerMessages;
}

export class LedgerCommentPresenter {
	constructor(
		private readonly collaborators: LedgerCommentPresenterCollaborators,
		private readonly messages = collaborators.createLedgerMessages(),
	) {}

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
		lines.push(this.collaborators.ledgerCommentCodec.encode(ledger));
		return lines.join("\n\n");
	}
}
export type LedgerCommentPresenterArguments =
	ConstructorParameters<typeof LedgerCommentPresenter> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;
