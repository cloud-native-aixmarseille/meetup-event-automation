export class CodeStructure {
	constructor(filename: string);
	inspect(source: string): {
		rule: string;
		line: number;
		message: string;
	}[];
}
