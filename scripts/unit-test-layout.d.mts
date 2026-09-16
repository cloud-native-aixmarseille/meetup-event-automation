export class UnitTestLayout {
	constructor(files: readonly string[]);
	inspect(): { file: string; rule: string; line: number; message: string }[];
}
