/** Input names and requirements are authored schema text, never input values. */
export class RuntimeInputError extends Error {
	constructor(field: string, requirement: string) {
		super(`${field} ${requirement}`);
		this.name = "RuntimeInputError";
	}
}
