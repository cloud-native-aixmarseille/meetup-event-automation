import type { PublicationDiagnostic } from "../domain/model.js";

export type RegistrationResponseTable = readonly (readonly unknown[])[];

export interface RegistrationResponseSource {
	/** Read the source header and the explicitly bounded rows for one event. */
	read(): Promise<RegistrationResponseTable>;
}

export type RegistrationResponseMapping = Readonly<{
	emailColumn: string;
}>;

export type RegistrationResponseEvaluation = Readonly<{
	/** Private source identities; never include these in reports or outputs. */
	participants: readonly Readonly<{ email: string }>[];
	responseCount: number;
	duplicateCount: number;
	invalidCount: number;
	diagnostics: readonly PublicationDiagnostic[];
}>;
