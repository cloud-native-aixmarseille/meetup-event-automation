import type {
	EventDocument,
	EventIdentity,
	EventRepository,
	MeetupEvent,
} from "@meetup-automation/event";
import {
	type ContentMedia,
	ContentMediaChangedError,
} from "@meetup-automation/publication";
import type { ContentPlanFactory } from "../proposals/content-plan-factory.js";
import type {
	ContentLanguage,
	ContentPlan,
	ContentTarget,
} from "../proposals/promotional-content.js";
import type { DiagnosticPolicy } from "../result/diagnostic-policy.js";
import type { ManageMeetupEvent } from "../use-cases/manage-meetup-event.js";
import type { ScheduledEventSettings } from "../use-cases/scheduled-event-projection.js";
import type {
	ContentFactsProjection,
	ContentSettings,
} from "./content-facts-projection.js";

export interface ContentContext {
	readonly document: EventDocument;
	readonly event: MeetupEvent;
	readonly plan: ContentPlan;
	readonly destination: string | null;
}
export interface ContentWorkspaceDependencies {
	readonly diagnostics: Pick<DiagnosticPolicy, "isTechnicalFailure">;
	readonly repository: EventRepository;
	readonly manageEvent: Pick<ManageMeetupEvent, "execute">;
	readonly plans: Pick<ContentPlanFactory, "create">;
	readonly projection: Pick<
		ContentFactsProjection,
		"create" | "active" | "destination"
	>;
	readonly publication: ScheduledEventSettings;
	readonly settings: ContentSettings;
	readonly announcement: (event: MeetupEvent) => Promise<ContentMedia | null>;
}
export class ContentWorkspace {
	constructor(private readonly dependencies: ContentWorkspaceDependencies) {}
	async read(
		identity: EventIdentity,
		target: ContentTarget,
		language: ContentLanguage,
	): Promise<ContentContext | undefined> {
		const document = await this.dependencies.repository.find(identity);
		if (!document) throw new Error("Content source issue is unavailable");
		const result = await this.dependencies.manageEvent.execute({
			identity,
			mode: "check",
			sourceDocument: document,
		});
		if (result.skipped || !this.dependencies.projection.active(result.event))
			return undefined;
		if (
			result.diagnostics.some((item) =>
				this.dependencies.diagnostics.isTechnicalFailure(item),
			)
		)
			throw new Error("Content source verification failed");
		const event = result.event;
		const agendaValid = !result.diagnostics.some(
			(item) =>
				item.severity === "error" &&
				/agenda|proposals|referential\.speaker|reference\.speaker/.test(
					item.code,
				),
		);
		const source = agendaValid ? event : { ...event, agenda: [] };
		if (
			target.includes(":") &&
			result.diagnostics.some(
				(item) => item.code === "event.link.meetup.invalid",
			)
		)
			return undefined;
		if (
			/:d[07]$/.test(target) &&
			(!/^\d{4}-\d{2}-\d{2}$/.test(event.date) ||
				!Number.isFinite(Date.parse(event.date)))
		)
			return undefined;
		const announcement = target.startsWith("linkedin:")
			? await this.announcement(event)
			: null;
		const facts = this.dependencies.projection.create(
			source,
			this.dependencies.publication,
			this.dependencies.settings,
			announcement,
		);
		return {
			document,
			event,
			plan: this.dependencies.plans.create(
				target,
				language,
				facts,
				this.dependencies.settings.reminderTime,
			),
			destination: this.dependencies.projection.destination(event, target),
		};
	}
	private async announcement(event: MeetupEvent): Promise<ContentMedia | null> {
		try {
			return await this.dependencies.announcement(event);
		} catch (error) {
			if (error instanceof ContentMediaChangedError) return null;
			throw error;
		}
	}
}
