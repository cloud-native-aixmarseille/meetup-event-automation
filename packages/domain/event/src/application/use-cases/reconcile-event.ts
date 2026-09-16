import type { EventDiagnostic } from "../../domain/diagnostic.js";
import { EventRuleEngine } from "../../domain/event-rule-engine.js";
import { EventRuleFactory } from "../../domain/event-rule-factory.js";
import { EventLifecycle } from "../../domain/lifecycle.js";
import type { EventIdentity } from "../../domain/model.js";
import { EventReadinessPolicy } from "../../domain/readiness.js";
import {
	type EventDocument,
	type EventRepository,
	EventRepositoryPatches,
} from "../ports/event-repository.js";
import { EventConcurrentModificationError } from "./event-concurrent-modification-error.js";
import { EventNotFoundError } from "./event-not-found-error.js";
import type {
	ReconcileEventDependencies,
	ReconcileEventInput,
	ReconcileEventResult,
} from "./reconcile-event-contracts.js";

export class ReconcileEvent {
	private readonly ruleEngine: EventRuleEngine;

	constructor(private readonly dependencies: ReconcileEventDependencies) {
		this.ruleEngine = new EventRuleEngine(
			dependencies.rules ?? EventRuleFactory.createDefaultEventRules(),
		);
	}

	async execute(input: ReconcileEventInput): Promise<ReconcileEventResult> {
		const document =
			input.sourceDocument ??
			(await this.dependencies.repository.find(input.identity));
		if (!document) {
			throw new EventNotFoundError(input.identity);
		}
		if (!ReconcileEvent.sameIdentity(document.identity, input.identity)) {
			throw new EventNotFoundError(input.identity);
		}

		const decoded = this.dependencies.documentCodec.decode(document);
		const evaluated = this.ruleEngine.evaluate(decoded.event);
		const diagnostics: EventDiagnostic[] = [
			...decoded.diagnostics,
			...evaluated.diagnostics,
		];

		const readiness = EventReadinessPolicy.evaluateEventReadiness(
			evaluated.event,
			diagnostics,
		);
		const lifecycle = EventLifecycle.evaluateEventLifecycle({
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
			!EventRepositoryPatches.eventRepositoryPatchIsEmpty(repositoryPatch);

		if (shouldPersist) {
			await ReconcileEvent.ensureEventDocumentIsCurrent(
				this.dependencies.repository,
				input.identity,
				document,
			);
			await this.dependencies.repository.applyPatch(
				input.identity,
				repositoryPatch,
			);
		}

		let commentUpdated = false;
		if (input.mode === "fix") {
			const commentResult =
				await this.dependencies.commentRepository.reconcileDiagnostics(
					input.identity,
					readiness.diagnostics,
				);
			commentUpdated = commentResult.changed;
		}

		return {
			event: evaluated.event,
			diagnostics: readiness.diagnostics,
			normalizationPatch: evaluated.patch,
			repositoryPatch,
			readiness,
			lifecycle,
			persisted: shouldPersist,
			commentUpdated,
		};
	}

	static async ensureEventDocumentIsCurrent(
		repository: EventRepository,
		identity: EventIdentity,
		expected: EventDocument,
	): Promise<void> {
		const current = await repository.find(identity);
		if (!current) {
			throw new EventNotFoundError(identity);
		}
		if (!ReconcileEvent.eventDocumentsEqual(current, expected)) {
			throw new EventConcurrentModificationError(identity);
		}
	}

	static eventDocumentsEqual(
		left: EventDocument,
		right: EventDocument,
	): boolean {
		const leftLabels = [...left.labels].sort(ReconcileEvent.compareText);
		const rightLabels = [...right.labels].sort(ReconcileEvent.compareText);
		return (
			ReconcileEvent.sameIdentity(left.identity, right.identity) &&
			left.issueState === right.issueState &&
			left.issueTitle === right.issueTitle &&
			left.body === right.body &&
			leftLabels.length === rightLabels.length &&
			leftLabels.every((label, index) => label === rightLabels[index])
		);
	}

	private static compareText(left: string, right: string): number {
		return left < right ? -1 : left > right ? 1 : 0;
	}

	private static sameIdentity(
		left: EventIdentity,
		right: EventIdentity,
	): boolean {
		return (
			left.issueNumber === right.issueNumber &&
			left.repository.toLowerCase() === right.repository.toLowerCase()
		);
	}
}
