import type { EventDiagnostic } from "../../domain/diagnostic.js";
import { EventRuleEngine } from "../../domain/event-rule-engine.js";
import { EventRuleFactory } from "../../domain/event-rule-factory.js";
import { EventLifecycle } from "../../domain/lifecycle.js";
import { EventReadinessPolicy } from "../../domain/readiness.js";
import { EventPaginationError } from "./event-pagination-error.js";
import type {
	ActiveEvent,
	ListActiveEventsDependencies,
	ListActiveEventsInput,
	ListActiveEventsResult,
} from "./list-active-events-contracts.js";

export class ListActiveEvents {
	private readonly ruleEngine: EventRuleEngine;

	constructor(private readonly dependencies: ListActiveEventsDependencies) {
		this.ruleEngine = new EventRuleEngine(
			dependencies.rules ?? EventRuleFactory.createDefaultEventRules(),
		);
	}

	async execute(input: ListActiveEventsInput): Promise<ListActiveEventsResult> {
		const activeEvents: ActiveEvent[] = [];
		const allDiagnostics: EventDiagnostic[] = [];
		const seenCursors = new Set<string>();
		const seenEvents = new Set<string>();
		const now = this.dependencies.clock.now();
		let cursor: string | undefined;

		do {
			const page = await this.dependencies.repository.listPage({
				...input,
				cursor,
			});

			for (const document of page.items) {
				const identityKey = `${document.identity.repository}#${document.identity.issueNumber}`;
				if (seenEvents.has(identityKey)) {
					continue;
				}
				seenEvents.add(identityKey);

				const decoded = this.dependencies.documentCodec.decode(document);
				const evaluated = this.ruleEngine.evaluate(decoded.event);
				const eventDiagnostics: EventDiagnostic[] = [
					...decoded.diagnostics,
					...evaluated.diagnostics,
				];
				const readiness = EventReadinessPolicy.evaluateEventReadiness(
					evaluated.event,
					eventDiagnostics,
				);
				const lifecycle = EventLifecycle.evaluateEventLifecycle({
					event: evaluated.event,
					readiness,
					now,
				});
				allDiagnostics.push(...readiness.diagnostics);

				if (
					lifecycle.state !== "cancelled" &&
					lifecycle.state !== "follow-up-complete"
				) {
					activeEvents.push({
						identity: { ...document.identity },
						event: evaluated.event,
						readiness,
						lifecycle,
					});
				}
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
}
