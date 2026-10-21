export type StructureViolation = Readonly<{
	rule: string;
	line: number;
	message: string;
}>;
