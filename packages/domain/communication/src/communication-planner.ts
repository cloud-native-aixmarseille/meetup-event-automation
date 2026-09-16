import { CommunicationIdempotency } from "./idempotency.js";
import type {
	CommunicationDiagnostic,
	CommunicationIntent,
	CommunicationKind,
	MailMessageIntent,
	MailRecipient,
	NotificationMessageIntent,
	PlanCommunicationsInput,
	PlanCommunicationsResult,
} from "./model.js";
import { MAIL_POLICIES } from "./plan-communications-contracts.js";

export class CommunicationPlanner {
	static planMailMessages(
		input: PlanCommunicationsInput,
		policyName: keyof typeof MAIL_POLICIES,
		intents: CommunicationIntent[],
		diagnostics: CommunicationDiagnostic[],
	): void {
		for (const recipient of input.mailRecipients) {
			if (!recipient.receivesCommunications) {
				continue;
			}

			if (
				!CommunicationIdempotency.isSafeCommunicationIdentifier(
					recipient.recipientId,
				)
			) {
				diagnostics.push(
					CommunicationPlanner.errorDiagnostic("invalid-identifier"),
				);
				continue;
			}

			if (recipient.email.trim().length === 0) {
				diagnostics.push(
					CommunicationPlanner.errorDiagnostic("missing-mail-destination"),
				);
				continue;
			}

			const policy = MAIL_POLICIES[policyName][recipient.role];
			const base = CommunicationPlanner.createIntentBase(
				input,
				policy.kind,
				recipient.recipientId,
			);
			const intent: MailMessageIntent = {
				...base,
				channel: "mail",
				recipient: CommunicationPlanner.cloneMailRecipient(recipient),
				templateName: policy.templateName,
				placeholders: {
					...(input.mailPlaceholders ?? {}),
					...(recipient.placeholders ?? {}),
				},
			};
			intents.push(intent);
		}
	}

	static planReadinessNotifications(
		input: PlanCommunicationsInput,
		intents: CommunicationIntent[],
		diagnostics: CommunicationDiagnostic[],
	): void {
		if (!input.notificationContent?.trim()) {
			diagnostics.push(
				CommunicationPlanner.errorDiagnostic("missing-notification-content"),
			);
			return;
		}

		for (const recipient of input.notificationRecipients) {
			if (!recipient.receivesCommunications) {
				continue;
			}

			if (
				!CommunicationIdempotency.isSafeCommunicationIdentifier(
					recipient.recipientId,
				)
			) {
				diagnostics.push(
					CommunicationPlanner.errorDiagnostic("invalid-identifier"),
				);
				continue;
			}

			if (recipient.destination.trim().length === 0) {
				diagnostics.push(
					CommunicationPlanner.errorDiagnostic(
						"missing-notification-destination",
					),
				);
				continue;
			}

			const base = CommunicationPlanner.createIntentBase(
				input,
				"readiness-reminder",
				recipient.recipientId,
			);
			const intent: NotificationMessageIntent = {
				...base,
				channel: "notification",
				recipient: { ...recipient },
				content: input.notificationContent,
			};
			intents.push(intent);
		}
	}

	static createIntentBase(
		input: PlanCommunicationsInput,
		kind: CommunicationKind,
		recipientId: string,
	) {
		const idempotencyKey =
			CommunicationIdempotency.createCommunicationIdempotencyKey({
				repositoryId: input.repositoryId,
				eventId: input.eventId,
				kind,
				recipientId,
				policyVersion: input.policyVersion,
			});

		return {
			intentId: idempotencyKey,
			idempotencyKey,
			repositoryId: input.repositoryId,
			eventId: input.eventId,
			policyVersion: input.policyVersion,
			kind,
			recipientId,
		} as const;
	}

	static cloneMailRecipient(recipient: MailRecipient): MailRecipient {
		return {
			...recipient,
			...(recipient.placeholders
				? { placeholders: { ...recipient.placeholders } }
				: {}),
		};
	}

	static deduplicateIntents(
		intents: readonly CommunicationIntent[],
		diagnostics: CommunicationDiagnostic[],
	): PlanCommunicationsResult {
		const uniqueIntents = new Map<string, CommunicationIntent>();
		for (const intent of intents) {
			if (uniqueIntents.has(intent.idempotencyKey)) {
				diagnostics.push({
					...CommunicationPlanner.warningDiagnostic("duplicate-intent"),
					intentId: intent.intentId,
				});
				continue;
			}
			uniqueIntents.set(intent.idempotencyKey, intent);
		}

		return {
			intents: [...uniqueIntents.values()],
			diagnostics,
		};
	}

	static hasValidBaseIdentifiers(input: PlanCommunicationsInput): boolean {
		return [input.repositoryId, input.eventId, input.policyVersion].every(
			CommunicationIdempotency.isSafeCommunicationIdentifier,
		);
	}

	static errorDiagnostic(
		code: CommunicationDiagnostic["code"],
	): CommunicationDiagnostic {
		return { code, severity: "error" };
	}

	static warningDiagnostic(
		code: CommunicationDiagnostic["code"],
	): CommunicationDiagnostic {
		return { code, severity: "warning" };
	}
}
