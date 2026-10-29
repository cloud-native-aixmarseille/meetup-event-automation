import {
	CommunityGroupUrl,
	ScheduledEventError,
} from "@meetup-automation/publication";
import { describe, expect, it, vi } from "vitest";
import {
	communityFixture,
	remote,
} from "../../testing/community-publication.fixtures.js";
import { PublicationDestinationComposition } from "../publication-destination-composition.js";
import type { EventPublicationSource } from "./event-publication-source.js";
import { ReconcileEventPublication } from "./reconcile-event-publication.js";

function fixture() {
	const f = communityFixture();
	const group = CommunityGroupUrl.parse(
		"https://community.example.test/cncf/group/example/event/",
	);
	if (!group) throw new Error("Invalid fixture group");
	const destination = new PublicationDestinationComposition().community(
		f.dependencies,
		group,
	);
	const source = {
		event: f.currentEvent,
		ensureCurrent: vi.fn(),
		persist: vi.fn(),
	} as unknown as EventPublicationSource;
	if (!(destination instanceof ReconcileEventPublication))
		throw new Error("Expected reconciliation use case");
	return { ...f, source, destination };
}

describe("publication write guards", () => {
	it("does not reserve an event when an asset upload fails and permits retry", async () => {
		// Arrange
		const f = fixture();
		f.gateway.save.mockImplementationOnce(async (_, __, guard) => {
			await guard("asset");
			throw new ScheduledEventError("unavailable");
		});
		// Act
		const failed = await f.destination.reconcile(f.source);
		const reservationsAfterFailure = f.journal.reserve.mock.calls.length;
		const retried = await f.destination.reconcile(f.source);
		// Assert
		expect(failed.status).toBe("blocked");
		expect(reservationsAfterFailure).toBe(0);
		expect(retried.status).toBe("draft");
		expect(f.journal.reserve).toHaveBeenCalledOnce();
	});
	it("reserves once after asset checks and before creating an event", async () => {
		// Arrange
		const f = fixture();
		const counts: number[] = [];
		f.gateway.save.mockImplementation(async (_, __, guard, saved) => {
			await guard("asset");
			counts.push(f.journal.reserve.mock.calls.length);
			await guard("event");
			await guard("event");
			counts.push(f.journal.reserve.mock.calls.length);
			await saved(remote);
			return { identity: remote, status: "draft" };
		});
		// Act
		const result = await f.destination.reconcile(f.source);
		// Assert
		expect(result.status).toBe("draft");
		expect(counts).toEqual([0, 1]);
	});
	it("rejects stale artwork after upload before reserving or saving an event", async () => {
		// Arrange
		const f = fixture();
		const saved = vi.fn();
		f.gateway.save.mockImplementation(async (_, __, guard) => {
			await guard("asset");
			f.dependencies.artwork.cover.mockResolvedValue(undefined);
			await guard("event");
			saved();
			return { identity: remote, status: "draft" };
		});
		// Act
		const result = await f.destination.reconcile(f.source);
		// Assert
		expect(result.status).toBe("blocked");
		expect(f.journal.reserve).not.toHaveBeenCalled();
		expect(saved).not.toHaveBeenCalled();
	});
});
