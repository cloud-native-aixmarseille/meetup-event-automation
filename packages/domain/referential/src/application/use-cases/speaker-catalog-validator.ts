import type { ReferentialIdentifiers } from "../../domain/identifiers.js";
import type {
	RawSpeakerRecord,
	Speaker,
} from "../../domain/referential-catalog.js";
import type {
	ReferentialDiagnostic,
	ReferentialDiagnostics,
} from "../../domain/referential-diagnostic.js";
import type { ReferentialRecordFields } from "./referential-record-fields.js";
import type { SpeakerSourceFields } from "./speaker-source-fields.js";

export interface SpeakerCatalogValidatorCollaborators {
	readonly referentialDiagnostics: Pick<ReferentialDiagnostics, "diagnostic">;
	readonly speakerSourceFields: Pick<SpeakerSourceFields, "read">;
	readonly referentialRecordFields: Pick<
		ReferentialRecordFields,
		"requiredText" | "optionalText" | "email"
	>;
	readonly referentialIdentifiers: Pick<ReferentialIdentifiers, "asSpeakerId">;
}

export class SpeakerCatalogValidator {
	constructor(
		private readonly collaborators: SpeakerCatalogValidatorCollaborators,
	) {}

	validateSpeakers(
		records: readonly RawSpeakerRecord[],
		diagnostics: ReferentialDiagnostic[],
	): Speaker[] {
		const speakers: Speaker[] = [];
		const speakerIds = new Set<string>();

		for (const [index, record] of records.entries()) {
			const speakerId = this.speakerId(record, index, diagnostics);
			const { firstName, lastName, company, email, phone, displayName } =
				this.contactFields(record, index, diagnostics);

			if (
				!speakerId ||
				!displayName ||
				firstName === null ||
				lastName === null ||
				company === null ||
				!email ||
				phone === null
			) {
				continue;
			}

			if (speakerIds.has(speakerId)) {
				diagnostics.push(
					this.collaborators.referentialDiagnostics.diagnostic(
						"referential.speaker.id.duplicate",
						"error",
						`speakers[${index}].speakerId`,
						"Speaker stable identifiers must be unique.",
					),
				);
				continue;
			}
			speakerIds.add(speakerId);

			speakers.push({
				...(record.source
					? { source: Object.freeze({ ...record.source }) }
					: {}),
				id: speakerId,
				firstName: firstName ?? "",
				lastName: lastName ?? "",
				displayName,
				company: company ?? "",
				...this.collaborators.speakerSourceFields.read(
					record,
					index,
					diagnostics,
				),
				email,
				...(phone ? { phone } : {}),
			});
		}

		return speakers;
	}

	private speakerId(
		record: RawSpeakerRecord,
		index: number,
		diagnostics: ReferentialDiagnostic[],
	) {
		const speakerIdValue =
			this.collaborators.referentialRecordFields.requiredText(
				record.speakerId,
				"referential.speaker.id.invalid",
				`speakers[${index}].speakerId`,
				"Speaker stable identifier must be a non-empty string.",
				diagnostics,
			);
		const speakerId = speakerIdValue
			? this.collaborators.referentialIdentifiers.asSpeakerId(speakerIdValue)
			: undefined;
		if (speakerIdValue && !speakerId) {
			diagnostics.push(
				this.collaborators.referentialDiagnostics.diagnostic(
					"referential.speaker.id.invalid",
					"error",
					`speakers[${index}].speakerId`,
					"Speaker stable identifier must use the speaker-* slug format.",
				),
			);
		}

		return speakerId;
	}

	private contactFields(
		record: RawSpeakerRecord,
		index: number,
		diagnostics: ReferentialDiagnostic[],
	) {
		const firstName = this.collaborators.referentialRecordFields.optionalText(
			record.firstName,
			"referential.speaker.first-name.invalid",
			`speakers[${index}].firstName`,
			"Speaker first name must be a non-empty string.",
			diagnostics,
		);
		const lastName = this.collaborators.referentialRecordFields.optionalText(
			record.lastName,
			"referential.speaker.last-name.invalid",
			`speakers[${index}].lastName`,
			"Speaker last name must be a non-empty string.",
			diagnostics,
		);
		const company = this.collaborators.referentialRecordFields.optionalText(
			record.company,
			"referential.speaker.company.invalid",
			`speakers[${index}].company`,
			"Speaker company must be a non-empty string.",
			diagnostics,
		);
		const email = this.collaborators.referentialRecordFields.email(
			record.email,
			"referential.speaker.email.invalid",
			`speakers[${index}].email`,
			"Speaker email address is invalid.",
			diagnostics,
		);
		const phone = this.collaborators.referentialRecordFields.optionalText(
			record.phone,
			"referential.speaker.phone.invalid",
			`speakers[${index}].phone`,
			"Speaker phone must be a string when provided.",
			diagnostics,
		);

		const displayName = this.collaborators.referentialRecordFields.requiredText(
			record.displayName ||
				(firstName && lastName ? `${firstName} ${lastName}` : ""),
			"referential.speaker.display-name.invalid",
			`speakers[${index}].displayName`,
			"A display name or both structured names are required.",
			diagnostics,
		);
		return { firstName, lastName, company, email, phone, displayName };
	}
}
