import type {
	RawSpeakerRecord,
	Speaker,
} from "../../domain/referential-catalog.js";
import type { ReferentialDiagnostic } from "../../domain/referential-diagnostic.js";

export class SpeakerSourceFields {
	read(
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
			this.invalid(index, diagnostics);
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
			...(this.pictureUrl(record.pictureUrl)
				? { pictureUrl: String(record.pictureUrl) }
				: {}),
		};
	}
	pictureUrl(value: unknown): string | undefined {
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
	validateMappings(
		speakers: readonly Speaker[],
		diagnostics: ReferentialDiagnostic[],
	): void {
		const identities: NonNullable<Speaker["sourceIdentity"]>[] = [];
		for (const [index, speaker] of speakers.entries()) {
			const identity = speaker.sourceIdentity;
			if (!identity) continue;
			if (
				identities.some(
					(existing) =>
						existing.provider === identity.provider &&
						existing.event === identity.event &&
						existing.speakerId === identity.speakerId,
				)
			)
				this.invalid(index, diagnostics);
			identities.push(identity);
		}
	}
	private invalid(index: number, diagnostics: ReferentialDiagnostic[]): void {
		diagnostics.push({
			code: "referential.speaker.mapping.invalid",
			severity: "error",
			path: `speakers[${index}].sourceIdentity`,
			message: "Source mappings must be complete, scoped and unique.",
		});
	}
}
