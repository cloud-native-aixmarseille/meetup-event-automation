import type { AttentionStage } from "@meetup-automation/communication";
const OWNERS = ["event", "assets", "feedback", "communications"] as const;
/** Only explicit outcomes and allowlisted diagnostic codes cross this boundary. */
export class AttentionStages {
	static parse(value: string): readonly AttentionStage[] {
		const input = JSON.parse(value) as Record<
			string,
			{ outcome?: unknown; diagnostics?: unknown }
		>;
		return OWNERS.map((owner) => {
			const stage = input?.[owner];
			const outcome =
				stage?.outcome === "success" || stage?.outcome === "failure"
					? stage.outcome
					: "unknown";
			return {
				owner,
				outcome,
				blocked:
					owner !== "event" && AttentionStages.blocked(stage?.diagnostics),
			};
		});
	}
	private static blocked(input: unknown): boolean {
		let diagnostics = input;
		if (typeof diagnostics === "string") {
			if (!diagnostics) return false;
			try {
				diagnostics = JSON.parse(diagnostics);
			} catch {
				throw new Error("Invalid attention stage diagnostics");
			}
		}
		if (!Array.isArray(diagnostics)) return false;
		return diagnostics.some((item: unknown) => {
			if (!item || typeof item !== "object") return false;
			const { code, severity } = item as { code?: unknown; severity?: unknown };
			if (
				typeof code !== "string" ||
				!/^(event|publication|communication|referential)\.[a-z.-]+$/.test(code)
			)
				return false;
			// Business incompleteness is evaluated from the reloaded event. Approval waits are not failures.
			if (
				code === "communication.approval-pending" ||
				code === "communication.approval-rejected"
			)
				return false;
			return (
				severity === "error" ||
				[
					"communication.gateway-delivery-uncertain",
					"communication.gateway-threw-ambiguous-error",
					"communication.approval-notification-failed",
				].includes(code)
			);
		});
	}
}
