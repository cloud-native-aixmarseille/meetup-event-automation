import {
	CommunicationDomainComposition,
	type DeliveryLedger,
	type DeliveryLedgerEntry,
} from "@meetup-automation/communication";
import {
	EventDomainComposition,
	type MeetupEvent,
} from "@meetup-automation/event";
import {
	MeetupEventIdentityPolicy,
	MeetupGroupUrl,
	PresentationFileUrl,
	type AttendeeSlidesGateway,
} from "@meetup-automation/publication";
import { describe, expect, it, vi } from "vitest";
import {
	createEventDependencies,
	event,
	identity,
	sourceDocument,
} from "../../testing/meetup-journey.fixtures.js";
import { EventPublicationResults } from "./event-publication-results.js";
import { ReconcileMeetupSlidesDelivery } from "./reconcile-meetup-slides-delivery.js";

function fixture() {
	const dependencies = createEventDependencies();
	const meetup: MeetupEvent = {
		...event,
		slidesPdfUrl: "https://drive.google.com/file/d/public-pdf/view",
		operationalChecklists: {
			...event.operationalChecklists,
			postEvent: event.operationalChecklists.postEvent.filter(
				(item) => item.name !== "Share slides to meetup",
			),
		},
	};
	vi.mocked(dependencies.documentCodec.decode).mockReturnValue({
		event: meetup,
		diagnostics: [],
	});
	vi.mocked(dependencies.documentCodec.createPatch).mockReturnValue({
		body: "updated checklist",
	});
	let entry: DeliveryLedgerEntry | undefined;
	const ledger = {
		find: vi.fn<DeliveryLedger["find"]>(async () => entry),
		reservePending: vi.fn<DeliveryLedger["reservePending"]>(async (input) => {
			entry = {
				idempotencyKey: input.idempotencyKey,
				intentId: input.intentId,
				status: "pending",
				updatedAt: input.reservedAt,
			};
			return { reserved: true, entry: { ...entry, status: "pending" } };
		}),
		markAccepted: vi.fn<DeliveryLedger["markAccepted"]>(async () => {
			if (entry) entry = { ...entry, status: "accepted" };
		}),
		markUncertain: vi.fn<DeliveryLedger["markUncertain"]>(async () => {
			if (entry) entry = { ...entry, status: "uncertain" };
		}),
		markRejected: vi.fn(),
		releasePending: vi.fn(async () => {
			entry = undefined;
		}),
	};
	const gateway = {
		sendSlides: vi.fn<AttendeeSlidesGateway["sendSlides"]>(
			async (_event, _pdf, beforeSend) => beforeSend(),
		),
	};
	const group = MeetupGroupUrl.parse("https://www.meetup.com/example-meetups/");
	if (!group) throw new Error("Invalid fixture group");
	const operation = new ReconcileMeetupSlidesDelivery(
		{
			repository: dependencies.repository,
			codec: dependencies.documentCodec,
			clock: dependencies.clock,
			concurrency: new EventDomainComposition().eventDocumentConcurrency(),
			postEvent: new CommunicationDomainComposition().postEventPolicy(),
			ledger,
			gateway,
			identity: new MeetupEventIdentityPolicy(group),
			presentationUrl: new PresentationFileUrl(),
			results: new EventPublicationResults("meetup", "Meetup"),
		},
		{ provider: "meetup", target: group.eventUrlPrefix },
	);
	return { dependencies, meetup, ledger, gateway, operation };
}

describe("Meetup attendee slide delivery", () => {
	it("sends the public PDF and adds completion without requiring a form checkbox", async () => {
		// Arrange
		const f = fixture();
		// Act
		const result = await f.operation.execute(identity);
		// Assert
		expect(result.status).toBe("updated");
		expect(f.gateway.sendSlides).toHaveBeenCalledWith(
			`${f.meetup.publicationLinks.meetup}/`,
			f.meetup.slidesPdfUrl,
			expect.any(Function),
		);
		expect(f.ledger.markAccepted).toHaveBeenCalledOnce();
		expect(f.dependencies.documentCodec.createPatch).toHaveBeenCalledWith(
			sourceDocument,
			expect.objectContaining({
				operationalChecklists: {
					...f.meetup.operationalChecklists,
					postEvent: [
						...f.meetup.operationalChecklists.postEvent,
						{ name: "Share slides to meetup", completed: true },
					],
				},
			}),
		);
		expect(f.dependencies.repository.applyPatch).toHaveBeenCalledOnce();
	});
	it("restores a lost issue update from accepted delivery without sending again", async () => {
		// Arrange
		const f = fixture();
		vi.mocked(f.dependencies.repository.applyPatch).mockRejectedValueOnce(
			new Error("Issue unavailable"),
		);
		// Act
		const first = await f.operation
			.execute(identity)
			.catch(() => "issue-failed");
		const second = await f.operation.execute(identity);
		// Assert
		expect(first).toBe("issue-failed");
		expect(second.status).toBe("updated");
		expect(f.gateway.sendSlides).toHaveBeenCalledOnce();
		expect(f.dependencies.repository.applyPatch).toHaveBeenCalledTimes(2);
	});
	it("preserves uncertain delivery and blocks automatic retries", async () => {
		// Arrange
		const f = fixture();
		f.gateway.sendSlides.mockImplementation(async (_event, _pdf, before) => {
			await before();
			throw new Error("Lost response");
		});
		// Act
		const first = await f.operation.execute(identity);
		const retry = await f.operation.execute(identity);
		// Assert
		expect(first.diagnostics[0]?.code).toBe(
			"publication.meetup.slides-delivery-recovery",
		);
		expect(retry.status).toBe("blocked");
		expect(f.gateway.sendSlides).toHaveBeenCalledOnce();
		expect(f.ledger.markUncertain).toHaveBeenCalledOnce();
		expect(f.dependencies.repository.applyPatch).not.toHaveBeenCalled();
	});
	it("allows retry when form preparation fails before a send is reserved", async () => {
		// Arrange
		const f = fixture();
		f.gateway.sendSlides.mockRejectedValueOnce(new Error("No contact form"));
		// Act
		const first = await f.operation.execute(identity);
		const retry = await f.operation.execute(identity);
		// Assert
		expect(first.status).toBe("blocked");
		expect(retry.status).toBe("updated");
		expect(f.ledger.reservePending).toHaveBeenCalledOnce();
	});
	it("does not send after an issue changes before submission", async () => {
		// Arrange
		const f = fixture();
		vi.mocked(f.dependencies.repository.find)
			.mockResolvedValueOnce(sourceDocument)
			.mockResolvedValue({ ...sourceDocument, body: "changed" });
		// Act
		const result = await f.operation.execute(identity);
		// Assert
		expect(result.status).toBe("blocked");
		expect(f.ledger.reservePending).not.toHaveBeenCalled();
		expect(f.ledger.markAccepted).not.toHaveBeenCalled();
	});
	it.each([
		undefined,
		"https://drive.google.com/drive/folders/private",
		"https://untrusted.test/slides.pdf",
	])("waits for a prepared public PDF: %s", async (slidesPdfUrl) => {
		// Arrange
		const f = fixture();
		vi.mocked(f.dependencies.documentCodec.decode).mockReturnValue({
			event: { ...f.meetup, slidesPdfUrl },
			diagnostics: [],
		});
		// Act
		const result = await f.operation.execute(identity);
		// Assert
		expect(result.diagnostics[0]?.code).toBe(
			"publication.meetup.slides-pdf-pending",
		);
		expect(f.gateway.sendSlides).not.toHaveBeenCalled();
	});
	it.each(["cancelled", "postponed"] as const)(
		"skips %s events",
		async (occurrenceStatus) => {
			// Arrange
			const f = fixture();
			vi.mocked(f.dependencies.documentCodec.decode).mockReturnValue({
				event: { ...f.meetup, occurrenceStatus },
				diagnostics: [],
			});
			// Act
			const result = await f.operation.execute(identity);
			// Assert
			expect(result.status).toBe("skipped");
			expect(f.gateway.sendSlides).not.toHaveBeenCalled();
		},
	);
	it("preserves manual completion without sending another message", async () => {
		// Arrange
		const f = fixture();
		vi.mocked(f.dependencies.documentCodec.decode).mockReturnValue({
			event,
			diagnostics: [],
		});
		// Act
		const result = await f.operation.execute(identity);
		// Assert
		expect(result.status).toBe("skipped");
		expect(f.gateway.sendSlides).not.toHaveBeenCalled();
	});
	it("does not resend when an equivalent Meetup URL or the PDF changes", async () => {
		// Arrange
		const f = fixture();
		// Act
		await f.operation.execute(identity);
		vi.mocked(f.dependencies.documentCodec.decode).mockReturnValue({
			event: {
				...f.meetup,
				publicationLinks: {
					...f.meetup.publicationLinks,
					meetup: `${f.meetup.publicationLinks.meetup}/`,
				},
				slidesPdfUrl: "https://drive.google.com/file/d/revised-pdf/view",
			},
			diagnostics: [],
		});
		await f.operation.execute(identity);
		// Assert
		expect(f.gateway.sendSlides).toHaveBeenCalledOnce();
		expect(f.dependencies.repository.applyPatch).toHaveBeenCalledTimes(2);
	});
	it("blocks retry when Meetup confirmed sending but acceptance could not be recorded", async () => {
		// Arrange
		const f = fixture();
		f.ledger.markAccepted.mockRejectedValueOnce(
			new Error("Ledger unavailable"),
		);
		// Act
		const first = await f.operation
			.execute(identity)
			.catch(() => "ledger-failed");
		const retry = await f.operation.execute(identity);
		// Assert
		expect(first).toBe("ledger-failed");
		expect(retry.diagnostics[0]?.code).toBe(
			"publication.meetup.slides-delivery-recovery",
		);
		expect(f.gateway.sendSlides).toHaveBeenCalledOnce();
		expect(f.dependencies.repository.applyPatch).not.toHaveBeenCalled();
	});
});
