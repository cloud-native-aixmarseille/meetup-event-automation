/** Serialized records stay owned by their adapters; updates preserve other scopes. */
export type AutomationStateScope =
	| "content"
	| "social"
	| "meetup"
	| "community";

export interface AutomationStateRepository {
	read(scope: AutomationStateScope): Promise<readonly string[]>;
	write(
		scope: AutomationStateScope,
		previous: readonly string[],
		next: readonly string[],
	): Promise<void>;
	reconcile(): Promise<void>;
}
