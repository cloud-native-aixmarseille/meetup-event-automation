import type { CommunicationIdempotency } from "./idempotency.js";
import type {
	CommunicationDiagnostic,
	CommunicationIntent,
	MailCommunicationKind,
	MailMessageIntent,
	MailRecipient,
	PlanCommunicationsInput,
	PlanCommunicationsResult,
} from "./model.js";
import { MAIL_POLICIES } from "./plan-communications-contracts.js";

export interface CommunicationPlannerCollaborators {
	readonly communicationIdempotency: Pick<
		CommunicationIdempotency,
		"isSafeCommunicationIdentifier" | "createCommunicationIdempotencyKey"
	>;
}

export class CommunicationPlanner {
	constructor(
		private readonly collaborators: CommunicationPlannerCollaborators,
	) {}

	planMailMessages(
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
				!this.collaborators.communicationIdempotency.isSafeCommunicationIdentifier(
					recipient.recipientId,
				)
			) {
				diagnostics.push(this.errorDiagnostic("invalid-identifier"));
				continue;
			}

			if (recipient.email.trim().length === 0) {
				diagnostics.push(this.errorDiagnostic("missing-mail-destination"));
				continue;
			}

			const policy = MAIL_POLICIES[policyName][recipient.role];
			const base = this.createIntentBase(
				input,
				policy.kind,
				recipient.recipientId,
			);
			const intent: MailMessageIntent = {
				...base,
				channel: "mail",
				recipient: this.cloneMailRecipient(recipient),
				templateName: policy.templateName,
				placeholders: {
					...(input.mailPlaceholders ?? {}),
					...(recipient.placeholders ?? {}),
				},
			};
			intents.push(intent);
		}
	}

	createIntentBase<Kind extends MailCommunicationKind>(
		input: PlanCommunicationsInput,
		kind: Kind,
		recipientId: string,
	) {
		const idempotencyKey =
			this.collaborators.communicationIdempotency.createCommunicationIdempotencyKey(
				{
					repositoryId: input.repositoryId,
					eventId: input.eventId,
					kind,
					recipientId,
					policyVersion: input.policyVersion,
				},
			);

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

	cloneMailRecipient(recipient: MailRecipient): MailRecipient {
		return {
			...recipient,
			...(recipient.placeholders
				? { placeholders: { ...recipient.placeholders } }
				: {}),
		};
	}

	deduplicateIntents(
		intents: readonly CommunicationIntent[],
		diagnostics: CommunicationDiagnostic[],
	): PlanCommunicationsResult {
		const uniqueIntents = new Map<string, CommunicationIntent>();
		for (const intent of intents) {
			if (uniqueIntents.has(intent.idempotencyKey)) {
				diagnostics.push({
					...this.warningDiagnostic("duplicate-intent"),
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

	hasValidBaseIdentifiers(input: PlanCommunicationsInput): boolean {
		return [input.repositoryId, input.eventId, input.policyVersion].every(
			this.collaborators.communicationIdempotency.isSafeCommunicationIdentifier.bind(
				this.collaborators.communicationIdempotency,
			),
		);
	}

	errorDiagnostic(
		code: CommunicationDiagnostic["code"],
	): CommunicationDiagnostic {
		return { code, severity: "error" };
	}

	warningDiagnostic(
		code: CommunicationDiagnostic["code"],
	): CommunicationDiagnostic {
		return { code, severity: "warning" };
	}
}
