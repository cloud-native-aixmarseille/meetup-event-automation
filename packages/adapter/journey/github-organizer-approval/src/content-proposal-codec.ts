import type {
	ContentAttempt,
	ContentDecision,
	ContentOrigin,
	ContentPlan,
	ContentProposal,
	PromotionalContentFingerprint,
	PromotionalContentPolicy,
} from "@meetup-automation/journey";
import type { ContentValueSchema } from "./content-value-schema.js";

export const CONTENT_STATE_MARKER = "<!-- meetup-content-proposal:v1 ";
export class ContentProposalCodec {
	constructor(
		private readonly values: ContentValueSchema,
		private readonly policy: Pick<
			PromotionalContentPolicy,
			"target" | "validDraft"
		>,
		private readonly fingerprints: Pick<
			PromotionalContentFingerprint,
			"source" | "proposal"
		>,
	) {}
	read(body: string): ContentProposal {
		if (!body.startsWith(CONTENT_STATE_MARKER) || !body.endsWith(" -->"))
			throw new Error("Invalid content proposal marker");
		return this.parse(JSON.parse(body.slice(CONTENT_STATE_MARKER.length, -4)));
	}
	write(proposal: ContentProposal): string {
		this.parse(proposal);
		return `${CONTENT_STATE_MARKER}${JSON.stringify(proposal).replaceAll("<", "\\u003c").replaceAll(">", "\\u003e").replaceAll("&", "\\u0026")} -->`;
	}
	private parse(value: unknown): ContentProposal {
		const item = this.values.object(value, [
			"publicationIntent",
			"recoveryRequest",
			"destinationBefore",
			"version",
			"promptVersion",
			"id",
			"plan",
			"origin",
			"guidance",
			"createdAt",
			"attempts",
			"draft",
			"revision",
			"decision",
			"accepted",
		]);
		if (item.version !== 1 || item.promptVersion !== "1")
			throw new Error("Unsupported content proposal schema");
		const id = this.values.text(item.id, 44);
		if (!/^content-[a-f0-9-]{36}$/.test(id))
			throw new Error("Invalid content proposal identity");
		const recovery = this.recovery(item.recoveryRequest);
		const proposal: ContentProposal = {
			...(item.publicationIntent === undefined
				? {}
				: { publicationIntent: this.values.text(item.publicationIntent, 200) }),
			...(recovery ? { recoveryRequest: recovery } : {}),
			version: 1,
			promptVersion: "1",
			id,
			plan: this.plan(item.plan),
			origin: this.origin(item.origin),
			guidance: this.values.text(item.guidance, 2000),
			destinationBefore:
				item.destinationBefore === null
					? null
					: this.values.text(item.destinationBefore, 12000),
			createdAt: this.instant(item.createdAt),
			attempts: this.values
				.list(item.attempts, 4)
				.map((attempt) => this.attempt(attempt)),
			draft: item.draft === null ? null : this.values.draft(item.draft),
			revision:
				item.revision === null ? null : this.values.text(item.revision, 64),
			decision: item.decision === null ? null : this.decision(item.decision),
			accepted:
				item.accepted === null ? null : this.values.draft(item.accepted),
		};
		this.validate(proposal);
		return proposal;
	}
	private recovery(value: unknown): ContentProposal["recoveryRequest"] {
		if (value === undefined) return undefined;
		const item = this.values.object(value, [
			"id",
			"actor",
			"proposalId",
			"guidance",
		]);
		return {
			id: this.values.text(item.id, 200),
			actor: this.values.text(item.actor, 39),
			proposalId: this.values.text(item.proposalId, 44),
			guidance: this.values.text(item.guidance, 2000),
		};
	}

	private validate(proposal: ContentProposal): void {
		if (
			proposal.draft &&
			(!this.policy.validDraft(proposal.plan, proposal.draft) ||
				proposal.revision !==
					this.fingerprints.proposal(proposal, proposal.draft))
		)
			throw new Error("Invalid content proposal fingerprint");
		if (
			!proposal.draft &&
			(proposal.revision || proposal.decision || proposal.accepted)
		)
			throw new Error("Incomplete content proposal");
		if (proposal.accepted && proposal.decision?.status !== "approved")
			throw new Error("Unapproved applied content");
		const editedText = proposal.decision?.editedText;
		if (
			editedText !== undefined &&
			(proposal.decision?.status !== "approved" ||
				proposal.plan.target === "cover" ||
				!proposal.draft ||
				!this.policy.validDraft(proposal.plan, {
					...proposal.draft,
					text: editedText,
				}))
		)
			throw new Error("Invalid approved text edit");
		this.accepted(proposal);
	}
	private accepted(proposal: ContentProposal): void {
		const selected = proposal.decision?.selectedImage;
		if (
			proposal.plan.target === "cover" &&
			proposal.decision?.status === "approved" &&
			(!selected ||
				!proposal.draft?.media.some((image) => image.id === selected))
		)
			throw new Error("Approved cover selection is missing");
		if (
			selected &&
			(proposal.plan.target !== "cover" ||
				proposal.decision?.status !== "approved")
		)
			throw new Error("Unexpected cover selection");
		if (!proposal.accepted || !proposal.draft) return;
		const expected = selected
			? {
					text: "",
					media: proposal.draft.media.filter((image) => image.id === selected),
				}
			: {
					...proposal.draft,
					text: proposal.decision?.editedText ?? proposal.draft.text,
				};
		if (
			this.fingerprints.proposal(proposal, expected) !==
			this.fingerprints.proposal(proposal, proposal.accepted)
		)
			throw new Error("Accepted content differs from the approved value");
	}

	private plan(value: unknown): ContentPlan {
		const item = this.values.object(value, [
			"target",
			"language",
			"facts",
			"plannedAt",
			"sourceFingerprint",
			"destination",
		]);
		if (
			!this.policy.target(item.target) ||
			(item.language !== "en" && item.language !== "fr")
		)
			throw new Error("Invalid content target or language");
		const plan: Omit<ContentPlan, "sourceFingerprint"> = {
			target: item.target,
			...(item.destination === undefined
				? {}
				: { destination: this.values.destination(item.destination) }),
			language: item.language,
			facts: this.values.facts(item.facts),
			plannedAt: item.plannedAt === null ? null : this.instant(item.plannedAt),
		};
		const sourceFingerprint = this.values.text(item.sourceFingerprint, 64);
		if (this.fingerprints.source(plan) !== sourceFingerprint)
			throw new Error("Invalid content source fingerprint");
		return { ...plan, sourceFingerprint };
	}
	private origin(value: unknown): ContentOrigin {
		const item = this.values.object(value, [
			"kind",
			"provider",
			"model",
			"login",
			"submissionId",
		]);
		if (item.kind === "ai") {
			this.values.object(value, ["kind", "provider", "model"]);
			return {
				kind: "ai",
				provider: this.values.text(item.provider, 100),
				model: this.values.text(item.model, 100),
			};
		}
		if (item.kind === "organizer") {
			this.values.object(value, ["kind", "login", "submissionId"]);
			return {
				kind: "organizer",
				login: this.values.text(item.login, 39),
				submissionId: this.values.text(item.submissionId, 200),
			};
		}
		throw new Error("Invalid content author");
	}
	private attempt(value: unknown): ContentAttempt {
		const item = this.values.object(value, ["id", "phase", "media"]);
		if (
			item.phase !== "reserved" &&
			item.phase !== "complete" &&
			item.phase !== "failed"
		)
			throw new Error("Invalid content attempt");
		return {
			id: this.values.text(item.id, 200),
			phase: item.phase,
			...(item.media === undefined
				? {}
				: { media: this.values.media(item.media) }),
		};
	}
	private decision(value: unknown): ContentDecision {
		const item = this.values.object(value, [
			"status",
			"actor",
			"decidedAt",
			"selectedImage",
			"editedText",
		]);
		if (
			item.status !== "approved" &&
			item.status !== "rejected" &&
			item.status !== "iteration-requested"
		)
			throw new Error("Invalid content decision");
		return {
			status: item.status,
			actor: this.values.text(item.actor, 39),
			decidedAt: this.instant(item.decidedAt),
			...(item.editedText === undefined
				? {}
				: { editedText: this.values.text(item.editedText, 12000) }),
			...(item.selectedImage === undefined
				? {}
				: { selectedImage: this.values.text(item.selectedImage, 200) }),
		};
	}
	private instant(value: unknown): string {
		const text = this.values.text(value, 40);
		if (!Number.isFinite(Date.parse(text)))
			throw new Error("Invalid content timestamp");
		return text;
	}
}
