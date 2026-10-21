import type {
	DeliveryLedgerEntry,
	DeliveryReservation,
	DeliveryReservationResult,
	GatewayDispatchResult,
	MailMessageIntent,
} from "./model.js";

export interface CommunicationClock {
	now(): Date;
}

export interface DeliveryLedger {
	find(idempotencyKey: string): Promise<DeliveryLedgerEntry | undefined>;
	reservePending(
		reservation: DeliveryReservation,
	): Promise<DeliveryReservationResult>;
	markAccepted(idempotencyKey: string, acceptedAt: string): Promise<void>;
	markUncertain(
		idempotencyKey: string,
		uncertainAt: string,
		diagnosticCode: string,
	): Promise<void>;
	markRejected(
		idempotencyKey: string,
		rejectedAt: string,
		diagnosticCode: string,
	): Promise<void>;
	releasePending(idempotencyKey: string): Promise<void>;
}

export interface MailGateway {
	dispatch(message: MailMessageIntent): Promise<GatewayDispatchResult>;
}
