import type { EventDiagnostic } from "../../domain/diagnostic.js";
import type {
	EventRuleEngine,
	EventRuleEngineArguments,
} from "../../domain/event-rule-engine.js";
import type { EventRuleFactory } from "../../domain/event-rule-factory.js";
import type { EventLifecycle } from "../../domain/lifecycle.js";
import type { EventReadinessPolicy } from "../../domain/readiness.js";
import { EventPaginationError } from "./event-pagination-error.js";
import type {
	ActiveEvent,
	ListActiveEventsDependencies,
	ListActiveEventsInput,
	ListActiveEventsResult,
} from "./list-active-events-contracts.js";

export interface ListActiveEventsCollaborators {
	readonly eventRuleFactory: Pick<EventRuleFactory, "createDefaultEventRules">;
	readonly eventReadinessPolicy: Pick<
		EventReadinessPolicy,
		"evaluateEventReadiness"
	>;
	readonly eventLifecycle: Pick<EventLifecycle, "evaluateEventLifecycle">;
	readonly createEventRuleEngine: (
		...args: EventRuleEngineArguments
	) => EventRuleEngine;
}

export class ListActiveEvents {
	private readonly ruleEngine: EventRuleEngine;

	constructor(
		private readonly collaborators: ListActiveEventsCollaborators,
		private readonly dependencies: ListActiveEventsDependencies,
	) {
		this.ruleEngine = this.collaborators.createEventRuleEngine(
			dependencies.rules ??
				this.collaborators.eventRuleFactory.createDefaultEventRules(),
		);
	}

	async execute(input: ListActiveEventsInput): Promise<ListActiveEventsResult> {
		const activeEvents: ActiveEvent[] = [];
		const allDiagnostics: EventDiagnostic[] = [];
		const seenCursors = new Set<string>();
		const seenEvents = new Set<string>();
		const now = this.dependencies.clock.now();
		let pages = 0;
		let cursor: string | undefined;

		do {
			if (++pages > 20) throw new EventPaginationError("audit-page-limit");
			const page = await this.dependencies.repository.listPage({
				...input,
				includeClosed: false,
				cursor,
			});

			for (const document of page.items) {
				const identityKey = `${document.identity.repository}#${document.identity.issueNumber}`;
				if (document.issueState === "closed" || seenEvents.has(identityKey)) {
					continue;
				}
				seenEvents.add(identityKey);
				this.checkLimit(seenEvents.size);

				const decoded = this.dependencies.documentCodec.decode(document);
				const evaluated = this.ruleEngine.evaluate(decoded.event);
				const eventDiagnostics: EventDiagnostic[] = [
					...decoded.diagnostics,
					...evaluated.diagnostics,
				];
				const readiness =
					this.collaborators.eventReadinessPolicy.evaluateEventReadiness(
						evaluated.event,
						eventDiagnostics,
					);
				const lifecycle =
					this.collaborators.eventLifecycle.evaluateEventLifecycle({
						event: evaluated.event,
						readiness,
						now,
					});
				allDiagnostics.push(...readiness.diagnostics);

				activeEvents.push({
					identity: { ...document.identity },
					event: evaluated.event,
					readiness,
					lifecycle,
				});
			}

			cursor = page.nextCursor;
			if (cursor) {
				if (seenCursors.has(cursor)) {
					throw new EventPaginationError(cursor);
				}
				seenCursors.add(cursor);
			}
		} while (cursor);

		return {
			events: Object.freeze(activeEvents),
			diagnostics: Object.freeze(allDiagnostics),
		};
	}
	private checkLimit(count: number): void {
		if (count > 200) throw new EventPaginationError("audit-issue-limit");
	}
}
export type ListActiveEventsArguments =
	ConstructorParameters<typeof ListActiveEvents> extends [
		unknown,
		...infer Args,
	]
		? Args
		: never;
