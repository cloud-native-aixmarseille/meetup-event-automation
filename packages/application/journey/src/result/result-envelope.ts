export interface PublicDiagnostic {
	code: string;
	severity: "error" | "warning" | "info";
	message: string;
	field?: string;
	fixApplied?: boolean;
}
