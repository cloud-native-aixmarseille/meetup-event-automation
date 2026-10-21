export class DependencyInjection {
	constructor(filename: string, program: unknown);
	inspect(
		node: unknown,
		owner?: unknown,
	): {
		rule: string;
		line: number;
		message: string;
	}[];
}
