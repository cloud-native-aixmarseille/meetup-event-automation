import { createHash } from "node:crypto";
import {
	type FeedbackAgenda,
	FeedbackResolutionError,
} from "@meetup-automation/publication";
import type {
	OpenFeedbackAgendaData,
	OpenFeedbackSpeaker,
	OpenFeedbackTalk,
} from "./openfeedback-agenda-snapshot.js";
import type { OpenFeedbackRecordEquality } from "./openfeedback-record-equality.js";

export interface OpenFeedbackAgendaPlanCollaborators {
	readonly openFeedbackRecordEquality: Pick<
		OpenFeedbackRecordEquality,
		"sameSpeakers"
	>;
}

export class OpenFeedbackAgendaPlan {
	constructor(
		private readonly collaborators: OpenFeedbackAgendaPlanCollaborators,
	) {}

	create(
		key: string,
		agenda: FeedbackAgenda,
		current: OpenFeedbackAgendaData,
	): OpenFeedbackAgendaData {
		const speakers = this.matchSpeakers(key, agenda, current);
		const candidates = agenda.talks.map((talk) => {
			const ids = [
				...new Set(
					talk.speakers.map(
						(speaker) => (speakers.get(speaker.id) as OpenFeedbackSpeaker).id,
					),
				),
			].sort();
			return {
				id: this.id(
					"talk",
					talk.sourceIdentity
						? JSON.stringify([key, talk.sourceIdentity])
						: JSON.stringify([key, talk.title, ids]),
				),
				title: talk.title,
				speakers: ids,
			};
		});
		const stableIds = new Set(
			candidates
				.filter((_, index) => agenda.talks[index].sourceIdentity)
				.map((talk) => talk.id),
		);
		const talks = this.matchTalks(candidates, current.talks, stableIds);
		if (
			talks.length > 100 ||
			speakers.size > 100 ||
			talks.some((talk) => talk.title.length > 2000) ||
			[...speakers.values()].some((speaker) => speaker.name.length > 200)
		)
			throw new Error("Feedback agenda exceeds the synchronization limits");
		return {
			speakers: [...speakers.values()],
			talks,
		};
	}

	private matchSpeakers(
		key: string,
		agenda: FeedbackAgenda,
		current: OpenFeedbackAgendaData,
	): Map<string, OpenFeedbackSpeaker> {
		const speakers = new Map<string, OpenFeedbackSpeaker>();
		for (const talk of agenda.talks) {
			for (const speaker of talk.speakers) {
				if (speakers.has(speaker.id)) continue;
				const stableId = this.id("speaker", `${key}:${speaker.id}`);
				const found = current.speakers.find((item) => item.id === stableId);
				const matches = found
					? [found]
					: current.speakers.filter(
							(item) =>
								this.normalize(item.name) === this.normalize(speaker.name),
						);
				if (matches.length > 1) throw new FeedbackResolutionError("conflict");
				speakers.set(speaker.id, {
					id: matches[0]?.id ?? stableId,
					name: speaker.name,
				});
			}
		}
		if (
			new Set([...speakers.values()].map((speaker) => speaker.id)).size !==
			speakers.size
		)
			throw new FeedbackResolutionError("conflict");
		return speakers;
	}

	private matchTalks(
		incoming: readonly OpenFeedbackTalk[],
		current: readonly OpenFeedbackTalk[],
		stableIds: ReadonlySet<string>,
	): OpenFeedbackTalk[] {
		if (new Set(incoming.map((talk) => talk.id)).size !== incoming.length)
			throw new FeedbackResolutionError("conflict");
		const used = new Set<string>();
		const resolved = new Map<OpenFeedbackTalk, OpenFeedbackTalk>();
		for (const talk of incoming) {
			if (
				stableIds.has(talk.id) &&
				current.some((item) => item.id === talk.id)
			) {
				resolved.set(talk, talk);
				used.add(talk.id);
			}
		}
		this.matchExactTalks(
			incoming.filter((talk) => !resolved.has(talk)),
			current,
			resolved,
			used,
		);
		this.matchTitles(incoming, current, resolved, used);
		for (const talk of incoming.filter((item) => !resolved.has(item))) {
			const matches = current.filter(
				(item) => !used.has(item.id) && this.sameSpeakers(item, talk),
			);
			const pending = incoming.filter(
				(item) => !resolved.has(item) && this.sameSpeakers(item, talk),
			);
			if (matches.length > 1 || (matches.length === 1 && pending.length > 1))
				throw new FeedbackResolutionError("conflict");
			const id = matches[0]?.id ?? talk.id;
			if (
				used.has(id) ||
				(!matches[0] && current.some((item) => item.id === id))
			)
				throw new FeedbackResolutionError("conflict");
			resolved.set(talk, { ...talk, id });
			used.add(id);
		}
		return incoming.map((talk) => resolved.get(talk) as OpenFeedbackTalk);
	}

	private matchExactTalks(
		incoming: readonly OpenFeedbackTalk[],
		current: readonly OpenFeedbackTalk[],
		resolved: Map<OpenFeedbackTalk, OpenFeedbackTalk>,
		used: Set<string>,
	): void {
		for (const talk of incoming) {
			const matches = current.filter(
				(item) =>
					!used.has(item.id) &&
					this.normalize(item.title) === this.normalize(talk.title) &&
					this.sameSpeakers(item, talk),
			);
			if (matches.length > 1) throw new FeedbackResolutionError("conflict");
			if (matches[0]) {
				resolved.set(talk, { ...talk, id: matches[0].id });
				used.add(matches[0].id);
			}
		}
	}

	private matchTitles(
		incoming: readonly OpenFeedbackTalk[],
		current: readonly OpenFeedbackTalk[],
		resolved: Map<OpenFeedbackTalk, OpenFeedbackTalk>,
		used: Set<string>,
	): void {
		for (const talk of incoming.filter((item) => !resolved.has(item))) {
			const title = this.normalize(talk.title);
			const matches = current.filter(
				(item) => !used.has(item.id) && this.normalize(item.title) === title,
			);
			if (matches.length === 0) continue;
			const pending = incoming.filter(
				(item) => !resolved.has(item) && this.normalize(item.title) === title,
			);
			if (matches.length > 1 || pending.length > 1)
				throw new FeedbackResolutionError("conflict");
			resolved.set(talk, { ...talk, id: matches[0].id });
			used.add(matches[0].id);
		}
	}

	private sameSpeakers(
		left: OpenFeedbackTalk,
		right: OpenFeedbackTalk,
	): boolean {
		return this.collaborators.openFeedbackRecordEquality.sameSpeakers(
			left,
			right,
		);
	}

	private id(kind: string, key: string): string {
		return `meetup-${kind}-${createHash("sha256").update(key).digest("hex")}`;
	}

	private normalize(value: string): string {
		return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
	}
}
