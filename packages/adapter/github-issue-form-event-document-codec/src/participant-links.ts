import type {
	MeetupEvent,
	ParticipantReference,
} from "@meetup-automation/event";
import { ReferenceBindings } from "./reference-bindings.js";

export class ParticipantLinks {
	static readSourceLinks(
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
				const name = ReferenceBindings.normalizeVisibleDisplayName(match[1]);
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

	static restoreSourceLocation(
		participant: ParticipantReference,
		sources: ReadonlyMap<string, ParticipantReference["source"]>,
	): ParticipantReference {
		const source = participant.id
			? sources.get(
					ReferenceBindings.normalizeVisibleDisplayName(
						participant.displayName,
					),
				)
			: undefined;
		return source ? { ...participant, source } : participant;
	}

	static encodeUrlSegment(value: string): string {
		return encodeURIComponent(value).replace(
			/[!'()*]/g,
			(character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
		);
	}

	static renderAgenda(
		event: MeetupEvent,
		renderParticipant: (participant: ParticipantReference) => string,
	): string {
		return event.agenda
			.map(
				(entry) =>
					`- ${entry.speakers.map(renderParticipant).join(", ")}: ${entry.description}`,
			)
			.join("\n");
	}
}
