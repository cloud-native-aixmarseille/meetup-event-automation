import {
	ProposalSourceError,
	type ProposalSnapshot,
	type SourceProposal,
	type SourceSpeaker,
} from "@meetup-automation/referential";

export class ProposalExportParser {
	static parse(value: unknown, event: string): ProposalSnapshot {
		const root = ProposalExportParser.object(value);
		if (!Array.isArray(root.proposals) || root.proposals.length > 10000)
			throw new ProposalSourceError("invalid");
		const speakers = new Map<string, SourceSpeaker>();
		const ids = new Set<string>();
		const proposals = root.proposals.map((raw): SourceProposal => {
			const proposal = ProposalExportParser.object(raw);
			const id = ProposalExportParser.id(proposal.id);
			if (
				ids.has(id) ||
				!Array.isArray(proposal.speakers) ||
				proposal.speakers.length === 0
			)
				throw new ProposalSourceError("invalid");
			ids.add(id);
			const speakerIds = proposal.speakers.map((item) => {
				const speaker = ProposalExportParser.speaker(item);
				const existing = speakers.get(speaker.id);
				if (existing && JSON.stringify(existing) !== JSON.stringify(speaker))
					throw new ProposalSourceError("invalid");
				speakers.set(speaker.id, speaker);
				return speaker.id;
			});
			return {
				id,
				title: ProposalExportParser.text(proposal.title),
				abstract: ProposalExportParser.text(proposal.abstract),
				accepted:
					proposal.deliberationStatus === "ACCEPTED" &&
					[null, undefined, "PENDING", "CONFIRMED"].includes(
						proposal.confirmationStatus as string | null | undefined,
					),
				languages: ProposalExportParser.strings(proposal.languages),
				formats: ProposalExportParser.strings(proposal.formats),
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
	private static speaker(value: unknown): SourceSpeaker {
		const speaker = ProposalExportParser.object(value);
		const email = ProposalExportParser.text(speaker.email);
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
			throw new ProposalSourceError("invalid");
		return {
			id: ProposalExportParser.id(speaker.id),
			displayName: ProposalExportParser.text(speaker.name),
			email,
			...("company" in speaker
				? { company: ProposalExportParser.optionalText(speaker.company) }
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
	private static optionalText(value: unknown): string | null {
		if (value === null || value === "") return null;
		return ProposalExportParser.text(value);
	}
	private static strings(value: unknown): readonly string[] {
		if (!Array.isArray(value) || value.length > 100)
			throw new ProposalSourceError("invalid");
		return value.map((item) => ProposalExportParser.text(item));
	}
	private static text(value: unknown): string {
		if (typeof value !== "string" || !value.trim() || value.length > 30000)
			throw new ProposalSourceError("invalid");
		return value.trim();
	}
	private static id(value: unknown): string {
		const id = ProposalExportParser.text(value);
		if (!/^[a-zA-Z0-9_-]{1,200}$/.test(id))
			throw new ProposalSourceError("invalid");
		return id;
	}
	private static object(value: unknown): Record<string, unknown> {
		if (!value || typeof value !== "object" || Array.isArray(value))
			throw new ProposalSourceError("invalid");
		return value as Record<string, unknown>;
	}
}
