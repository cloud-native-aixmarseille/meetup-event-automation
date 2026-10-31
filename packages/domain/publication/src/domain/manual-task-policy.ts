import type { PublicationEvent } from "./model.js";

export type ManualPublicationTaskKind =
	| "publish-community-event"
	| "create-asset-folder"
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
	/** Tracks manual work outside automated event publication. */
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
			"publish-community-event",
			"create-asset-folder",
			"import-attendance",
		];
	}
}
