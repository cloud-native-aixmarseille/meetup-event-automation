import type { OrganizerApprovalRequest } from "@meetup-automation/journey";
export const contentRequest = {
	kind: "content-review",
	revision: "c".repeat(64),
	eventDate: "2099-06-08",
	requestedAt: "2099-06-01T10:00:00Z",
	content: {
		key: "content-00000000-0000-4000-8000-000000000001",
		target: "title",
		language: "fr",
		origin: "organizer",
		draft: { text: "Kubernetes au quotidien", media: [] },
	},
} satisfies OrganizerApprovalRequest;
export const coverRequest = {
	...contentRequest,
	content: {
		...contentRequest.content,
		target: "cover",
		draft: {
			text: "",
			media: [1, 2].map((slot) => ({
				id: `image-${slot}`,
				url: `https://images.example.org/cover-${slot}.png`,
				fingerprint: String(slot).repeat(64),
				description: "June community illustration",
				mimeType: "image/png" as const,
				width: 1792,
				height: 1024,
				sourceRevision: `revision-${slot}`,
			})),
		},
	},
} satisfies OrganizerApprovalRequest;
