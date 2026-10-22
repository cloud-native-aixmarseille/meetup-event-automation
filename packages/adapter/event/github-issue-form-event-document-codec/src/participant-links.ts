import type {
	MeetupEvent,
	ParticipantReference,
} from "@meetup-automation/event";
import type { ProposalSelectionCodec } from "./proposal-selection-codec.js";
import type { ReferenceBindings } from "./reference-bindings.js";

export interface ParticipantLinksCollaborators {
	readonly referenceBindings: Pick<
		ReferenceBindings,
		"normalizeVisibleDisplayName"
	>;
	readonly proposalSelectionCodec: Pick<
		ProposalSelectionCodec,
		"unescape" | "escape"
	>;
}

export class ParticipantLinks {
	constructor(private readonly collaborators: ParticipantLinksCollaborators) {}

	readSourceLinks(
		value: string,
		repository: string,
	): ReadonlyMap<string, ParticipantReference["source"]> {
		const sources = new Map<string, ParticipantReference["source"]>();
		const prefix = `https://github.com/${repository}/blob/`;
		for (const match of value.matchAll(
			/\[([^\]]+)\]\((https:\/\/github\.com\/[^)\s]+)\)/g,
		)) {
			const target = match[2];
			if (!target.startsWith(prefix)) continue;
			const location = target
				.slice(prefix.length)
				.match(/^[^/]+\/(.+)#L([1-9]\d*)$/);
			if (!location) continue;
			try {
				const source = {
					path: decodeURIComponent(location[1]),
					line: Number(location[2]),
				};
				const name =
					this.collaborators.referenceBindings.normalizeVisibleDisplayName(
						this.collaborators.proposalSelectionCodec.unescape(match[1]),
					);
				const previous = sources.get(name);
				// Conflicting links for a repeated speaker must be resolved from the catalog.
				sources.set(
					name,
					sources.has(name) &&
						(previous?.path !== source.path || previous?.line !== source.line)
						? undefined
						: source,
				);
			} catch {
				// Malformed URL escapes cannot supply a source location.
			}
		}
		return sources;
	}

	restoreSourceLocation(
		participant: ParticipantReference,
		sources: ReadonlyMap<string, ParticipantReference["source"]>,
	): ParticipantReference {
		const source = participant.id
			? sources.get(
					this.collaborators.referenceBindings.normalizeVisibleDisplayName(
						participant.displayName,
					),
				)
			: undefined;
		return source ? { ...participant, source } : participant;
	}

	encodeUrlSegment(value: string): string {
		return encodeURIComponent(value).replace(
			/[!'()*]/g,
			(character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
		);
	}

	renderAgenda(
		event: MeetupEvent,
		renderParticipant: (participant: ParticipantReference) => string,
	): string {
		return event.agenda
			.map(
				(entry) =>
					`- ${entry.speakers.map(renderParticipant).join(", ")}: ${event.proposalStatus === "current" ? this.collaborators.proposalSelectionCodec.escape(entry.description) : entry.description}`,
			)
			.join("\n");
	}
}
