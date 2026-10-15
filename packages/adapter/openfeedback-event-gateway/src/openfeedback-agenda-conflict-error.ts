export class OpenFeedbackAgendaConflictError extends Error {
	constructor() {
		super("The feedback agenda contains ambiguous talk or speaker identities");
		this.name = "OpenFeedbackAgendaConflictError";
	}
}
