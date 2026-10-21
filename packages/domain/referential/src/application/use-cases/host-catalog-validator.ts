import type {
	HostId,
	ReferentialIdentifiers,
} from "../../domain/identifiers.js";
import type { Host, RawHostRecord } from "../../domain/referential-catalog.js";
import type {
	ReferentialDiagnostic,
	ReferentialDiagnostics,
} from "../../domain/referential-diagnostic.js";
import type { ReferentialRecordFields } from "./referential-record-fields.js";
import type {
	HostBuilder,
	ParsedHostRecord,
} from "./validate-referential-catalog-contracts.js";

export interface HostCatalogValidatorCollaborators {
	readonly referentialDiagnostics: Pick<ReferentialDiagnostics, "diagnostic">;
	readonly referentialRecordFields: Pick<
		ReferentialRecordFields,
		"requiredText" | "email" | "optionalText"
	>;
	readonly referentialIdentifiers: Pick<
		ReferentialIdentifiers,
		"asHostId" | "asContactId"
	>;
}

export class HostCatalogValidator {
	constructor(
		private readonly collaborators: HostCatalogValidatorCollaborators,
	) {}

	validateHosts(
		records: readonly RawHostRecord[],
		diagnostics: ReferentialDiagnostic[],
	): Host[] {
		const hostsById = new Map<HostId, HostBuilder>();
		const contactIds = new Set<string>();

		for (const [index, record] of records.entries()) {
			const parsed = this.parseHostRecord(record, index, diagnostics);
			if (!parsed) {
				continue;
			}

			if (contactIds.has(parsed.contact.id)) {
				diagnostics.push(
					this.collaborators.referentialDiagnostics.diagnostic(
						"referential.contact.id.duplicate",
						"error",
						`hosts[${index}].contactId`,
						"Contact stable identifiers must be unique.",
					),
				);
				continue;
			}
			contactIds.add(parsed.contact.id);

			const host = hostsById.get(parsed.hostId);
			if (!host) {
				hostsById.set(parsed.hostId, {
					...(record.source
						? { source: Object.freeze({ ...record.source }) }
						: {}),
					id: parsed.hostId,
					displayName: parsed.displayName,
					contacts: [parsed.contact],
				});
				continue;
			}

			if (host.displayName !== parsed.displayName) {
				diagnostics.push(
					this.collaborators.referentialDiagnostics.diagnostic(
						"referential.host.id.conflict",
						"error",
						`hosts[${index}].hostId`,
						"A host stable identifier cannot describe different host names.",
					),
				);
				continue;
			}

			host.contacts.push(parsed.contact);
		}

		return [...hostsById.values()].map((host) => ({
			...(host.source ? { source: host.source } : {}),
			id: host.id,
			displayName: host.displayName,
			contacts: host.contacts,
		}));
	}

	parseHostRecord(
		record: RawHostRecord,
		index: number,
		diagnostics: ReferentialDiagnostic[],
	): ParsedHostRecord | undefined {
		const hostId = this.hostId(record, index, diagnostics);
		const displayName = this.collaborators.referentialRecordFields.requiredText(
			record.displayName,
			"referential.host.display-name.invalid",
			`hosts[${index}].displayName`,
			"Host display name must be a non-empty string.",
			diagnostics,
		);
		const contactId = this.contactId(record, index, diagnostics);
		const contactName = this.collaborators.referentialRecordFields.requiredText(
			record.contactName,
			"referential.contact.name.invalid",
			`hosts[${index}].contactName`,
			"Contact name must be a non-empty string.",
			diagnostics,
		);
		const email = this.collaborators.referentialRecordFields.email(
			record.email,
			"referential.contact.email.invalid",
			`hosts[${index}].email`,
			"Host contact email address is invalid.",
			diagnostics,
		);
		const phone = this.collaborators.referentialRecordFields.optionalText(
			record.phone,
			"referential.contact.phone.invalid",
			`hosts[${index}].phone`,
			"Host contact phone must be a string when provided.",
			diagnostics,
		);
		const address = this.collaborators.referentialRecordFields.requiredText(
			record.address,
			"referential.contact.address.invalid",
			`hosts[${index}].address`,
			"Host contact address must be a non-empty string.",
			diagnostics,
		);

		if (
			!hostId ||
			!displayName ||
			!contactId ||
			!contactName ||
			!email ||
			address === undefined ||
			phone === null
		) {
			return undefined;
		}

		return {
			hostId,
			displayName,
			contact: {
				id: contactId,
				name: contactName,
				email,
				...(phone ? { phone } : {}),
				address,
			},
		};
	}

	private hostId(
		record: RawHostRecord,
		index: number,
		diagnostics: ReferentialDiagnostic[],
	) {
		const hostIdValue = this.collaborators.referentialRecordFields.requiredText(
			record.hostId,
			"referential.host.id.invalid",
			`hosts[${index}].hostId`,
			"Host stable identifier must be a non-empty string.",
			diagnostics,
		);
		const hostId = hostIdValue
			? this.collaborators.referentialIdentifiers.asHostId(hostIdValue)
			: undefined;
		if (hostIdValue && !hostId) {
			diagnostics.push(
				this.collaborators.referentialDiagnostics.diagnostic(
					"referential.host.id.invalid",
					"error",
					`hosts[${index}].hostId`,
					"Host stable identifier must use the opaque host-0001 format.",
				),
			);
		}

		return hostId;
	}

	private contactId(
		record: RawHostRecord,
		index: number,
		diagnostics: ReferentialDiagnostic[],
	) {
		const contactIdValue =
			this.collaborators.referentialRecordFields.requiredText(
				record.contactId,
				"referential.contact.id.invalid",
				`hosts[${index}].contactId`,
				"Contact stable identifier must be a non-empty string.",
				diagnostics,
			);
		const contactId = contactIdValue
			? this.collaborators.referentialIdentifiers.asContactId(contactIdValue)
			: undefined;
		if (contactIdValue && !contactId) {
			diagnostics.push(
				this.collaborators.referentialDiagnostics.diagnostic(
					"referential.contact.id.invalid",
					"error",
					`hosts[${index}].contactId`,
					"Contact stable identifier must use the opaque contact-0001 format.",
				),
			);
		}

		return contactId;
	}
}
