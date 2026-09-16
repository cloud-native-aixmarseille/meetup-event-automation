import { EventRuleConfigurationError } from "./event-rule-configuration-error.js";
import type { EventRule } from "./rule-contracts.js";

export class EventRuleOrdering {
	static sortRules(rules: readonly EventRule[]): readonly EventRule[] {
		const byId = new Map<string, EventRule>();
		for (const rule of rules) {
			if (byId.has(rule.id)) {
				throw new EventRuleConfigurationError(
					`Duplicate event rule "${rule.id}"`,
				);
			}
			byId.set(rule.id, rule);
		}

		for (const rule of rules) {
			for (const dependency of rule.dependencies) {
				if (!byId.has(dependency)) {
					throw new EventRuleConfigurationError(
						`Event rule "${rule.id}" has missing dependency "${dependency}"`,
					);
				}
			}
		}

		const permanent = new Set<string>();
		const temporary = new Set<string>();
		const ordered: EventRule[] = [];

		const visit = (rule: EventRule, path: readonly string[]): void => {
			if (temporary.has(rule.id)) {
				throw new EventRuleConfigurationError(
					`Cyclic event rule dependency: ${[...path, rule.id].join(" -> ")}`,
				);
			}
			if (permanent.has(rule.id)) {
				return;
			}

			temporary.add(rule.id);
			for (const dependencyId of rule.dependencies) {
				const dependency = byId.get(dependencyId);
				if (!dependency) {
					throw new EventRuleConfigurationError(
						`Event rule "${rule.id}" has missing dependency "${dependencyId}"`,
					);
				}
				visit(dependency, [...path, rule.id]);
			}
			temporary.delete(rule.id);
			permanent.add(rule.id);
			ordered.push(rule);
		};

		for (const rule of rules) {
			visit(rule, []);
		}
		return Object.freeze(ordered);
	}
}
