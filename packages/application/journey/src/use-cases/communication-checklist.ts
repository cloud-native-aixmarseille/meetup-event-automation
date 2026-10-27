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

/** Email groups are pending until completed; form checkboxes do not enable delivery. */
export class CommunicationChecklist {
	pendingRecipients(
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
			return this.status(event, kind) === "pending";
		});
	}
	status(
		event: MeetupEvent,
		kind: MailCommunicationKind,
	): "pending" | "completed" {
		const task = TASKS[kind];
		const matches = event.operationalChecklists[task.section].filter((item) =>
			this.matches(item, task.names),
		);
		return matches.some((item) => item.completed) ? "completed" : "pending";
	}

	complete(
		event: MeetupEvent,
		accepted: readonly MailCommunicationKind[],
	): EventOperationalChecklists {
		const completed = new Set(accepted);
		const checklists = event.operationalChecklists;
		const communication = checklists.communication.map((item) => ({
			...item,
			completed:
				item.completed ||
				this.accepted(item, "communication", completed, checklists),
		}));
		const postEvent = checklists.postEvent.map((item) => ({
			...item,
			completed:
				item.completed ||
				this.accepted(item, "postEvent", completed, checklists),
		}));
		for (const kind of completed) {
			const task = TASKS[kind];
			const items =
				task.section === "communication" ? communication : postEvent;
			// Record email completion separately from a combined manual report-sharing task.
			if (
				!items.some(
					(item) =>
						item.name !== LEGACY_SPEAKER_THANKS &&
						this.matches(item, task.names),
				)
			)
				items.push({ name: task.names[0], completed: true });
		}
		return { ...checklists, communication, postEvent };
	}

	private accepted(
		item: OperationalChecklistItem,
		section: "communication" | "postEvent",
		accepted: ReadonlySet<MailCommunicationKind>,
		checklists: EventOperationalChecklists,
	): boolean {
		if (item.name === LEGACY_SPEAKER_THANKS) return false;
		const kinds = (Object.keys(TASKS) as MailCommunicationKind[]).filter(
			(kind) =>
				TASKS[kind].section === section &&
				this.matches(item, TASKS[kind].names),
		);
		return (
			kinds.length > 0 &&
			kinds.every(
				(kind) =>
					accepted.has(kind) ||
					checklists[section].some(
						(other) =>
							other.completed && this.matches(other, TASKS[kind].names),
					),
			)
		);
	}

	private matches(
		item: OperationalChecklistItem,
		names: readonly string[],
	): boolean {
		return names.includes(item.name);
	}
}
