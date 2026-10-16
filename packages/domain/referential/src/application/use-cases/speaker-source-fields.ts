import type {
	RawSpeakerRecord,
	Speaker,
} from "../../domain/referential-catalog.js";
import type { ReferentialDiagnostic } from "../../domain/referential-diagnostic.js";

export class SpeakerSourceFields {
	static read(
		record: RawSpeakerRecord,
		index: number,
		diagnostics: ReferentialDiagnostic[],
	): Pick<Speaker, "sourceIdentity" | "pictureUrl"> {
		const values = [
			record.sourceProvider,
			record.sourceEvent,
			record.sourceSpeakerId,
		];
		const hasMapping = values.some(
			(value) => value !== undefined && value !== "",
		);
		if (
			hasMapping &&
			!values.every(
				(value) =>
					typeof value === "string" && /^[a-zA-Z0-9_-]{1,200}$/.test(value),
			)
		) {
			SpeakerSourceFields.invalid(index, diagnostics);
			return {};
		}
		return {
			...(hasMapping
				? {
						sourceIdentity: {
							provider: String(record.sourceProvider),
							event: String(record.sourceEvent),
							speakerId: String(record.sourceSpeakerId),
						},
					}
				: {}),
			...(SpeakerSourceFields.pictureUrl(record.pictureUrl)
				? { pictureUrl: String(record.pictureUrl) }
				: {}),
		};
	}
	static pictureUrl(value: unknown): string | undefined {
		if (typeof value !== "string" || value.length > 2048) return undefined;
		try {
			const url = new URL(value);
			return url.protocol === "https:" && !url.username && !url.password
				? url.href
				: undefined;
		} catch {
			return undefined;
		}
	}
	static validateMappings(
		speakers: readonly Speaker[],
		diagnostics: ReferentialDiagnostic[],
	): void {
		const identities = new Set<string>();
		for (const [index, speaker] of speakers.entries()) {
			if (!speaker.sourceIdentity) continue;
			const key = JSON.stringify(speaker.sourceIdentity);
			if (identities.has(key)) SpeakerSourceFields.invalid(index, diagnostics);
			identities.add(key);
		}
	}
	private static invalid(
		index: number,
		diagnostics: ReferentialDiagnostic[],
	): void {
		diagnostics.push({
			code: "referential.speaker.mapping.invalid",
			severity: "error",
			path: `speakers[${index}].sourceIdentity`,
			message: "Source mappings must be complete, scoped and unique.",
		});
	}
}
