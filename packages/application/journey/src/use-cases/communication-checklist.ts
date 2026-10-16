import type {
	MailCommunicationKind,
	MailRecipient,
} from "@meetup-automation/communication";
import type {
	EventOperationalChecklists,
	MeetupEvent,
	OperationalChecklistItem,
} from "@meetup-automation/event";

const INTRODUCTION = "Mail introduction";
const LEGACY_SPEAKER_THANKS = "Thanks speakers and share openfeedback reports";
const TASKS = {
	"host-introduction": {
		section: "communication",
		names: ["Mail introduction hoster", INTRODUCTION],
	},
	"speaker-introduction": {
		section: "communication",
		names: ["Mail introduction speakers", INTRODUCTION],
	},
	"host-thanks": {
		section: "postEvent",
		names: ["Mail thanks hoster", "Thanks hoster"],
	},
	"speaker-thanks": {
		section: "postEvent",
		names: ["Mail thanks speakers", "Thanks speakers", LEGACY_SPEAKER_THANKS],
	},
} as const;

/** Map email tasks to delivery groups; a checked task records completed work. */
export class CommunicationChecklist {
	static pendingRecipients(
		event: MeetupEvent,
		recipients: readonly MailRecipient[],
		thanks = event.occurrenceStatus === "held",
	): readonly MailRecipient[] {
		return recipients.filter((recipient) => {
			const kind =
				recipient.role === "hosting"
					? thanks
						? "host-thanks"
						: "host-introduction"
					: thanks
						? "speaker-thanks"
						: "speaker-introduction";
			return CommunicationChecklist.status(event, kind) === "pending";
		});
	}
	static status(
		event: MeetupEvent,
		kind: MailCommunicationKind,
	): "missing" | "pending" | "completed" {
		const task = TASKS[kind];
		const matches = event.operationalChecklists[task.section].filter((item) =>
			CommunicationChecklist.matches(item, task.names),
		);
		return matches.some((item) => item.completed)
			? "completed"
			: matches.length
				? "pending"
				: "missing";
	}

	static complete(
		event: MeetupEvent,
		accepted: readonly MailCommunicationKind[],
	): EventOperationalChecklists {
		const completed = new Set(accepted);
		const checklists = event.operationalChecklists;
		const communication = checklists.communication.map((item) => ({
			...item,
			completed:
				item.completed ||
				CommunicationChecklist.accepted(
					item,
					"communication",
					completed,
					checklists,
				),
		}));
		const postEvent = checklists.postEvent.map((item) => ({
			...item,
			completed:
				item.completed ||
				CommunicationChecklist.accepted(
					item,
					"postEvent",
					completed,
					checklists,
				),
		}));
		// A combined legacy task also includes manual report sharing. Record only its email portion.
		if (
			completed.has("speaker-thanks") &&
			postEvent.some((item) => item.name === LEGACY_SPEAKER_THANKS) &&
			!postEvent.some((item) => item.name === "Mail thanks speakers")
		) {
			postEvent.push({ name: "Mail thanks speakers", completed: true });
		}
		return { ...checklists, communication, postEvent };
	}

	private static accepted(
		item: OperationalChecklistItem,
		section: "communication" | "postEvent",
		accepted: ReadonlySet<MailCommunicationKind>,
		checklists: EventOperationalChecklists,
	): boolean {
		if (item.name === LEGACY_SPEAKER_THANKS) return false;
		const kinds = (Object.keys(TASKS) as MailCommunicationKind[]).filter(
			(kind) =>
				TASKS[kind].section === section &&
				CommunicationChecklist.matches(item, TASKS[kind].names),
		);
		return (
			kinds.length > 0 &&
			kinds.every(
				(kind) =>
					accepted.has(kind) ||
					checklists[section].some(
						(other) =>
							other.completed &&
							CommunicationChecklist.matches(other, TASKS[kind].names),
					),
			)
		);
	}

	private static matches(
		item: OperationalChecklistItem,
		names: readonly string[],
	): boolean {
		return names.includes(item.name);
	}
}
