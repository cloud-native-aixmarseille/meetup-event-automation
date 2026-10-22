import type {
	DeliveryLedgerEntry,
	DeliveryReservation,
} from "@meetup-automation/communication";

export const DELIVERY_LEDGER_MARKER =
	"<!-- meetup-automation-delivery-ledger:v1 -->";

export interface StoredEntry extends DeliveryLedgerEntry {
	repositoryId: string;
	eventId: string;
	kind: DeliveryReservation["kind"];
	recipientId: string;
	policyVersion: string;
	diagnosticCode?: string;
}

export interface StoredLedger {
	schemaVersion: 2;
	entries: StoredEntry[];
}

export interface GithubDeliveryLedgerOptions {
	dispatchAuthorized: boolean;
	/** Only comments owned by this trusted automation identity form the ledger. */
	authorLogin: string;
}
