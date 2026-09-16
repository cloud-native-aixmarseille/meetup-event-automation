export class EventRuleConfigurationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "EventRuleConfigurationError";
	}
}
