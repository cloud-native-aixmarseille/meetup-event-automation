export class ProductionCodeStructure {
	constructor(directory?: string);
	sourceFiles(directory: string): Promise<string[]>;
	inspect(): Promise<{
		files: number;
		violations: { file: string; rule: string; line: number; message: string }[];
	}>;
}
