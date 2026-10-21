import type {
	AttentionStageReport,
	AttentionStageReports,
} from "../src/result/attention-stage-reports.js";
export function attentionReports(
	overrides: Partial<
		Record<keyof AttentionStageReports, Partial<AttentionStageReport>>
	> = {},
): AttentionStageReports {
	const complete = {
		outcome: "success" as const,
		reported: true,
		diagnostics: [],
	};
	return {
		event: { ...complete, ...overrides.event },
		assets: { ...complete, ...overrides.assets },
		feedback: { ...complete, ...overrides.feedback },
		communications: { ...complete, ...overrides.communications },
	};
}
