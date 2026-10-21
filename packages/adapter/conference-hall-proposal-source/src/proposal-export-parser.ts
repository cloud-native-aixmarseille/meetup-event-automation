import {
	type ProposalSnapshot,
	ProposalSourceError,
	type SourceProposal,
	type SourceSpeaker,
	type SourceSpeakerEquality,
} from "@meetup-automation/referential";

export interface ProposalExportParserCollaborators {
	readonly sourceSpeakerEquality: Pick<SourceSpeakerEquality, "equal">;
}

export class ProposalExportParser {
	constructor(
		private readonly collaborators: ProposalExportParserCollaborators,
	) {}

	parse(value: unknown, event: string): ProposalSnapshot {
		const root = this.object(value, "export");
		if (!Array.isArray(root.proposals) || root.proposals.length > 10000)
			throw this.invalid("proposals");
		const speakers = new Map<string, SourceSpeaker>();
		const ids = new Set<string>();
		const proposals = root.proposals.map((raw, index): SourceProposal => {
			const path = `proposals[${index}]`;
			const proposal = this.object(raw, path);
			const id = this.id(proposal.id, `${path}.id`);
			if (ids.has(id)) throw this.invalid(`${path}.id`);
			if (!Array.isArray(proposal.speakers) || proposal.speakers.length === 0)
				throw this.invalid(`${path}.speakers`);
			ids.add(id);
			const speakerIds = proposal.speakers.map((item, speakerIndex) => {
				const speakerPath = `${path}.speakers[${speakerIndex}]`;
				const speaker = this.speaker(item, speakerPath);
				const existing = speakers.get(speaker.id);
				if (
					existing &&
					!this.collaborators.sourceSpeakerEquality.equal(existing, speaker)
				)
					throw this.invalid(speakerPath);
				speakers.set(speaker.id, speaker);
				return speaker.id;
			});
			return {
				id,
				number: this.number(proposal.proposalNumber, `${path}.proposalNumber`),
				title: this.text(proposal.title, `${path}.title`),
				abstract: this.text(proposal.abstract, `${path}.abstract`),
				accepted:
					proposal.deliberationStatus === "ACCEPTED" &&
					(proposal.confirmationStatus == null ||
						proposal.confirmationStatus === "PENDING" ||
						proposal.confirmationStatus === "CONFIRMED"),
				languages: this.strings(proposal.languages, `${path}.languages`),
				formats: this.strings(proposal.formats, `${path}.formats`),
				speakerIds: [...new Set(speakerIds)],
			};
		});
		return {
			provider: "conference-hall",
			event,
			speakers: [...speakers.values()],
			proposals,
		};
	}
	private speaker(value: unknown, path: string): SourceSpeaker {
		const speaker = this.object(value, path);
		const email = this.text(speaker.email, `${path}.email`);
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
			throw this.invalid(`${path}.email`);
		return {
			id: this.id(speaker.id, `${path}.id`),
			displayName: this.text(speaker.name, `${path}.name`),
			email,
			...("company" in speaker
				? {
						company: this.optionalText(speaker.company, `${path}.company`),
					}
				: {}),
			...this.picture(speaker),
		};
	}
	private number(value: unknown, path: string): number | undefined {
		if (value === undefined || value === null) return undefined;
		if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1)
			throw this.invalid(path);
		return value;
	}
	private picture(
		speaker: Record<string, unknown>,
	): Pick<SourceSpeaker, "pictureUrl"> {
		if (!("picture" in speaker)) return {};
		if (speaker.picture === null || speaker.picture === "")
			return { pictureUrl: null };
		if (typeof speaker.picture !== "string" || speaker.picture.length > 2048)
			return {};
		try {
			const url = new URL(speaker.picture);
			return url.protocol === "https:" && !url.username && !url.password
				? { pictureUrl: url.href }
				: {};
		} catch {
			return {};
		}
	}
	private optionalText(value: unknown, path: string): string | null {
		if (value === null || value === "") return null;
		return this.text(value, path);
	}
	private strings(value: unknown, path: string): readonly string[] {
		if (!Array.isArray(value) || value.length > 100) throw this.invalid(path);
		return value.map((item, index) => this.text(item, `${path}[${index}]`));
	}
	private text(value: unknown, path: string): string {
		if (typeof value !== "string" || !value.trim() || value.length > 30000)
			throw this.invalid(path);
		return value.trim();
	}
	private id(value: unknown, path: string): string {
		const id = this.text(value, path);
		if (!/^[a-zA-Z0-9_-]{1,200}$/.test(id)) throw this.invalid(path);
		return id;
	}
	private invalid(field: string): ProposalSourceError {
		return new ProposalSourceError("invalid", undefined, {
			reason: "schema",
			field,
		});
	}
	private object(value: unknown, path: string): Record<string, unknown> {
		if (!value || typeof value !== "object" || Array.isArray(value))
			throw this.invalid(path);
		return value as Record<string, unknown>;
	}
}
