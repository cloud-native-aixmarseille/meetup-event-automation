import type {
	DeliveryStatus,
	MailCommunicationKind,
} from "@meetup-automation/communication";

export interface EmailDeliverySummary {
	readonly kind: MailCommunicationKind;
	readonly status: DeliveryStatus | "not-sent";
	readonly count: number;
}

/** Project durable delivery evidence into the corresponding review requests. */
export interface EmailDeliveryReport {
	synchronize(): Promise<void>;
}
