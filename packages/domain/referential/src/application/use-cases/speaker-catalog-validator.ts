import { ReferentialIdentifiers } from "../../domain/identifiers.js";
import type {
	RawSpeakerRecord,
	Speaker,
} from "../../domain/referential-catalog.js";
import {
	type ReferentialDiagnostic,
	ReferentialDiagnostics,
} from "../../domain/referential-diagnostic.js";
import { ReferentialRecordFields } from "./referential-record-fields.js";

export class SpeakerCatalogValidator {
	static validateSpeakers(
		records: readonly RawSpeakerRecord[],
		diagnostics: ReferentialDiagnostic[],
	): Speaker[] {
		const speakers: Speaker[] = [];
		const speakerIds = new Set<string>();

		for (const [index, record] of records.entries()) {
			const speakerId = SpeakerCatalogValidator.speakerId(
				record,
				index,
				diagnostics,
			);
			const { firstName, lastName, company, email, phone } =
				SpeakerCatalogValidator.contactFields(record, index, diagnostics);

			if (
				!speakerId ||
				!firstName ||
				!lastName ||
				!company ||
				!email ||
				phone === null
			) {
				continue;
			}

			if (speakerIds.has(speakerId)) {
				diagnostics.push(
					ReferentialDiagnostics.diagnostic(
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
				firstName,
				lastName,
				displayName: `${firstName} ${lastName}`,
				company,
				email,
				...(phone ? { phone } : {}),
			});
		}

		return speakers;
	}

	private static speakerId(
		record: RawSpeakerRecord,
		index: number,
		diagnostics: ReferentialDiagnostic[],
	) {
		const speakerIdValue = ReferentialRecordFields.requiredText(
			record.speakerId,
			"referential.speaker.id.invalid",
			`speakers[${index}].speakerId`,
			"Speaker stable identifier must be a non-empty string.",
			diagnostics,
		);
		const speakerId = speakerIdValue
			? ReferentialIdentifiers.asSpeakerId(speakerIdValue)
			: undefined;
		if (speakerIdValue && !speakerId) {
			diagnostics.push(
				ReferentialDiagnostics.diagnostic(
					"referential.speaker.id.invalid",
					"error",
					`speakers[${index}].speakerId`,
					"Speaker stable identifier must use the speaker-* slug format.",
				),
			);
		}

		return speakerId;
	}

	private static contactFields(
		record: RawSpeakerRecord,
		index: number,
		diagnostics: ReferentialDiagnostic[],
	) {
		const firstName = ReferentialRecordFields.requiredText(
			record.firstName,
			"referential.speaker.first-name.invalid",
			`speakers[${index}].firstName`,
			"Speaker first name must be a non-empty string.",
			diagnostics,
		);
		const lastName = ReferentialRecordFields.requiredText(
			record.lastName,
			"referential.speaker.last-name.invalid",
			`speakers[${index}].lastName`,
			"Speaker last name must be a non-empty string.",
			diagnostics,
		);
		const company = ReferentialRecordFields.requiredText(
			record.company,
			"referential.speaker.company.invalid",
			`speakers[${index}].company`,
			"Speaker company must be a non-empty string.",
			diagnostics,
		);
		const email = ReferentialRecordFields.email(
			record.email,
			"referential.speaker.email.invalid",
			`speakers[${index}].email`,
			"Speaker email address is invalid.",
			diagnostics,
		);
		const phone = ReferentialRecordFields.optionalText(
			record.phone,
			"referential.speaker.phone.invalid",
			`speakers[${index}].phone`,
			"Speaker phone must be a string when provided.",
			diagnostics,
		);

		return { firstName, lastName, company, email, phone };
	}
}
