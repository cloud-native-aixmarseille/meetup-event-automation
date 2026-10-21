import type { PublicationEvent } from "./model.js";

export type ManualPublicationTaskKind =
	| "publish-meetup-event"
	| "publish-community-event"
	| "create-asset-folder"
	| "publish-slides"
	| "import-attendance";

export type ManualPublicationTaskStatus =
	| "pending"
	| "completed"
	| "not-applicable";

export type ManualPublicationTask = Readonly<{
	kind: ManualPublicationTaskKind;
	status: ManualPublicationTaskStatus;
	reason: string;
}>;

export class ManualPublicationPolicy {
	/** Tracks organizer approvals and manual work required for publication. */
	planManualPublicationTasks(
		event: PublicationEvent,
	): readonly ManualPublicationTask[] {
		if (event.occurrenceStatus === "cancelled") {
			return Object.freeze(
				this.allTaskKinds().map((kind) => ({
					kind,
					status: "not-applicable" as const,
					reason: "The event is cancelled",
				})),
			);
		}

		const occurrenceConfirmed = event.occurrenceStatus === "held";
		return Object.freeze([
			this.task(
				"publish-meetup-event",
				Boolean(event.references.meetup) && event.meetupPublished,
				"Approve publishing the event to Meetup",
			),
			this.task(
				"publish-community-event",
				Boolean(event.references.community),
				"Publish the event to the CNCF community platform",
			),
			this.task(
				"create-asset-folder",
				Boolean(event.references.assets),
				"Create the event asset folder",
			),
			occurrenceConfirmed
				? this.task(
						"publish-slides",
						event.slidesPublished,
						"Publish post-event slides",
					)
				: this.notApplicable(
						"publish-slides",
						"Slides are published only after occurrence is explicitly confirmed",
					),
			occurrenceConfirmed
				? this.task(
						"import-attendance",
						event.attendanceImported,
						"Import post-event attendance",
					)
				: this.notApplicable(
						"import-attendance",
						"Attendance is imported only after occurrence is explicitly confirmed",
					),
		]);
	}

	task(
		kind: ManualPublicationTaskKind,
		completed: boolean,
		reason: string,
	): ManualPublicationTask {
		return {
			kind,
			status: completed ? "completed" : "pending",
			reason,
		};
	}

	notApplicable(
		kind: ManualPublicationTaskKind,
		reason: string,
	): ManualPublicationTask {
		return { kind, status: "not-applicable", reason };
	}

	allTaskKinds(): readonly ManualPublicationTaskKind[] {
		return [
			"publish-meetup-event",
			"publish-community-event",
			"create-asset-folder",
			"publish-slides",
			"import-attendance",
		];
	}
}
