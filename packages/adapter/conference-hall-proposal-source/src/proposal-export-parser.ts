import {
	ProposalSourceError,
	type ProposalSnapshot,
	type SourceProposal,
	type SourceSpeaker,
} from "@meetup-automation/referential";

export class ProposalExportParser {
	static parse(value: unknown, event: string): ProposalSnapshot {
		const root = ProposalExportParser.object(value, "export");
		if (!Array.isArray(root.proposals) || root.proposals.length > 10000)
			throw ProposalExportParser.invalid("proposals");
		const speakers = new Map<string, SourceSpeaker>();
		const ids = new Set<string>();
		const proposals = root.proposals.map((raw, index): SourceProposal => {
			const path = `proposals[${index}]`;
			const proposal = ProposalExportParser.object(raw, path);
			const id = ProposalExportParser.id(proposal.id, `${path}.id`);
			if (ids.has(id)) throw ProposalExportParser.invalid(`${path}.id`);
			if (!Array.isArray(proposal.speakers) || proposal.speakers.length === 0)
				throw ProposalExportParser.invalid(`${path}.speakers`);
			ids.add(id);
			const speakerIds = proposal.speakers.map((item, speakerIndex) => {
				const speakerPath = `${path}.speakers[${speakerIndex}]`;
				const speaker = ProposalExportParser.speaker(item, speakerPath);
				const existing = speakers.get(speaker.id);
				if (existing && JSON.stringify(existing) !== JSON.stringify(speaker))
					throw ProposalExportParser.invalid(speakerPath);
				speakers.set(speaker.id, speaker);
				return speaker.id;
			});
			return {
				id,
				title: ProposalExportParser.text(proposal.title, `${path}.title`),
				abstract: ProposalExportParser.text(
					proposal.abstract,
					`${path}.abstract`,
				),
				accepted:
					proposal.deliberationStatus === "ACCEPTED" &&
					[null, undefined, "PENDING", "CONFIRMED"].includes(
						proposal.confirmationStatus as string | null | undefined,
					),
				languages: ProposalExportParser.strings(
					proposal.languages,
					`${path}.languages`,
				),
				formats: ProposalExportParser.strings(
					proposal.formats,
					`${path}.formats`,
				),
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
	private static speaker(value: unknown, path: string): SourceSpeaker {
		const speaker = ProposalExportParser.object(value, path);
		const email = ProposalExportParser.text(speaker.email, `${path}.email`);
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
			throw ProposalExportParser.invalid(`${path}.email`);
		return {
			id: ProposalExportParser.id(speaker.id, `${path}.id`),
			displayName: ProposalExportParser.text(speaker.name, `${path}.name`),
			email,
			...("company" in speaker
				? {
						company: ProposalExportParser.optionalText(
							speaker.company,
							`${path}.company`,
						),
					}
				: {}),
			...ProposalExportParser.picture(speaker),
		};
	}
	private static picture(
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
	private static optionalText(value: unknown, path: string): string | null {
		if (value === null || value === "") return null;
		return ProposalExportParser.text(value, path);
	}
	private static strings(value: unknown, path: string): readonly string[] {
		if (!Array.isArray(value) || value.length > 100)
			throw ProposalExportParser.invalid(path);
		return value.map((item, index) =>
			ProposalExportParser.text(item, `${path}[${index}]`),
		);
	}
	private static text(value: unknown, path: string): string {
		if (typeof value !== "string" || !value.trim() || value.length > 30000)
			throw ProposalExportParser.invalid(path);
		return value.trim();
	}
	private static id(value: unknown, path: string): string {
		const id = ProposalExportParser.text(value, path);
		if (!/^[a-zA-Z0-9_-]{1,200}$/.test(id))
			throw ProposalExportParser.invalid(path);
		return id;
	}
	private static invalid(field: string): ProposalSourceError {
		return new ProposalSourceError("invalid", undefined, {
			reason: "schema",
			field,
		});
	}
	private static object(value: unknown, path: string): Record<string, unknown> {
		if (!value || typeof value !== "object" || Array.isArray(value))
			throw ProposalExportParser.invalid(path);
		return value as Record<string, unknown>;
	}
}
