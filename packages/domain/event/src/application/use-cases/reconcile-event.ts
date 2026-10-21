import type { EventDiagnostic } from "../../domain/diagnostic.js";
import type {
	EventRuleEngine,
	EventRuleEngineArguments,
} from "../../domain/event-rule-engine.js";
import type { EventRuleFactory } from "../../domain/event-rule-factory.js";
import type { EventLifecycle } from "../../domain/lifecycle.js";
import type { EventReadinessPolicy } from "../../domain/readiness.js";
import type { EventRepositoryPatches } from "../ports/event-repository.js";
import type { EventDocumentConcurrency } from "./event-document-concurrency.js";
import { EventNotFoundError } from "./event-not-found-error.js";
import type {
	ReconcileEventDependencies,
	ReconcileEventInput,
	ReconcileEventResult,
} from "./reconcile-event-contracts.js";

export interface ReconcileEventCollaborators {
	readonly eventRuleFactory: Pick<EventRuleFactory, "createDefaultEventRules">;
	readonly eventDocumentConcurrency: Pick<
		EventDocumentConcurrency,
		"sameIdentity" | "ensureEventDocumentIsCurrent"
	>;
	readonly eventReadinessPolicy: Pick<
		EventReadinessPolicy,
		"evaluateEventReadiness"
	>;
	readonly eventLifecycle: Pick<EventLifecycle, "evaluateEventLifecycle">;
	readonly eventRepositoryPatches: Pick<
		EventRepositoryPatches,
		"eventRepositoryPatchIsEmpty"
	>;
	readonly createEventRuleEngine: (
		...args: EventRuleEngineArguments
	) => EventRuleEngine;
}

export class ReconcileEvent {
	private readonly ruleEngine: EventRuleEngine;

	constructor(
		private readonly collaborators: ReconcileEventCollaborators,
		private readonly dependencies: ReconcileEventDependencies,
	) {
		this.ruleEngine = this.collaborators.createEventRuleEngine(
			dependencies.rules ??
				this.collaborators.eventRuleFactory.createDefaultEventRules(),
		);
	}

	async execute(input: ReconcileEventInput): Promise<ReconcileEventResult> {
		const document =
			input.sourceDocument ??
			(await this.dependencies.repository.find(input.identity));
		if (!document) {
			throw new EventNotFoundError(input.identity);
		}
		if (
			!this.collaborators.eventDocumentConcurrency.sameIdentity(
				document.identity,
				input.identity,
			)
		) {
			throw new EventNotFoundError(input.identity);
		}

		const decoded = this.dependencies.documentCodec.decode(document);
		const evaluated = this.ruleEngine.evaluate(decoded.event);
		const diagnostics: EventDiagnostic[] = [
			...decoded.diagnostics,
			...evaluated.diagnostics,
		];

		const readiness =
			this.collaborators.eventReadinessPolicy.evaluateEventReadiness(
				evaluated.event,
				diagnostics,
			);
		const lifecycle = this.collaborators.eventLifecycle.evaluateEventLifecycle({
			event: evaluated.event,
			readiness,
			now: this.dependencies.clock.now(),
		});
		const repositoryPatch = this.dependencies.documentCodec.createPatch(
			document,
			evaluated.event,
		);
		const shouldPersist =
			input.mode === "fix" &&
			!this.collaborators.eventRepositoryPatches.eventRepositoryPatchIsEmpty(
				repositoryPatch,
			);

		if (shouldPersist) {
			await this.collaborators.eventDocumentConcurrency.ensureEventDocumentIsCurrent(
				this.dependencies.repository,
				input.identity,
				document,
			);
			await this.dependencies.repository.applyPatch(
				input.identity,
				repositoryPatch,
			);
		}

		return {
			event: evaluated.event,
			diagnostics: readiness.diagnostics,
			normalizationPatch: evaluated.patch,
			repositoryPatch,
			readiness,
			lifecycle,
			persisted: shouldPersist,
		};
	}
}
export type ReconcileEventArguments =
	ConstructorParameters<typeof ReconcileEvent> extends [unknown, ...infer Args]
		? Args
		: never;
