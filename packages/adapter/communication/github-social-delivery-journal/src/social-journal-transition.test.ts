import { describe, expect, it } from "vitest";
import {
	socialAttempt,
	socialRecord,
} from "../testing/social-journal.fixtures.js";
import { SocialJournalTransition } from "./social-journal-transition.js";

describe("social delivery record transitions", () => {
	it("does not erase uncertain provider evidence during recovery", () => {
		// Arrange
		const transitions = new SocialJournalTransition();
		const previous = socialRecord([
			socialAttempt({ status: "uncertain", code: "transport-uncertain" }),
		]);
		const next = socialRecord([
			socialAttempt({
				status: "uncertain",
				recovery: {
					actor: "organizer",
					decidedAt: "2026-10-20T13:00:00Z",
					outcome: "not-published",
					reference:
						"https://github.com/example/events/issues/42#issuecomment-100",
				},
			}),
		]);

		// Act
		const validate = () => transitions.validate(previous, next);

		// Assert
		expect(validate).toThrow("cannot change provider evidence");
	});
	it.each(["rejected", "deferred"] as const)(
		"preserves %s evidence when an organizer explicitly authorizes another attempt",
		(status) => {
			// Arrange
			const transitions = new SocialJournalTransition();
			const previous = socialRecord([
				socialAttempt({ status, code: "provider-denied" }),
			]);
			const next = socialRecord([
				{
					...previous.attempts[0],
					recovery: {
						actor: "organizer",
						decidedAt: "2026-10-20T13:00:00Z",
						outcome: "not-published",
						reference:
							"https://github.com/example/events/issues/42#issuecomment-100",
					},
				},
			]);

			// Act
			const validate = () => transitions.validate(previous, next);

			// Assert
			expect(validate).not.toThrow();
		},
	);
	it.each(["rejected", "deferred"] as const)(
		"cannot rewrite %s provider evidence while attaching recovery",
		(status) => {
			// Arrange
			const transitions = new SocialJournalTransition();
			const previous = socialRecord([
				socialAttempt({ status, code: "provider-denied" }),
			]);
			const next = socialRecord([
				{
					...previous.attempts[0],
					code: "different-response",
					recovery: {
						actor: "organizer",
						decidedAt: "2026-10-20T13:00:00Z",
						outcome: "not-published",
						reference:
							"https://github.com/example/events/issues/42#issuecomment-100",
					},
				},
			]);

			// Act
			const validate = () => transitions.validate(previous, next);

			// Assert
			expect(validate).toThrow("evidence cannot change");
		},
	);
	it("does not replay a manually completed announcement", () => {
		// Arrange
		const transitions = new SocialJournalTransition();
		const previous = {
			...socialRecord(),
			manual: {
				recordedAt: "2026-10-20T12:00:00Z",
				reference: "https://github.com/example/events/issues/42",
			},
		};
		const next = socialRecord([socialAttempt()]);

		// Act
		const validate = () => transitions.validate(previous, next);

		// Assert
		expect(validate).toThrow("Manual social completion cannot change");
	});
	it.each(["reserved", "prepared", "uncertain", "accepted"] as const)(
		"never appends automatically after %s",
		(status) => {
			// Arrange
			const transitions = new SocialJournalTransition();
			const previous = socialRecord([socialAttempt({ status })]);
			const next = socialRecord([
				...previous.attempts,
				socialAttempt({ id: "attempt-two" }),
			]);

			// Act
			const validate = () => transitions.validate(previous, next);

			// Assert
			expect(validate).toThrow("cannot be replayed");
		},
	);
	it.each(["rejected", "deferred"] as const)(
		"permits a fresh reservation after definitive %s",
		(status) => {
			// Arrange
			const transitions = new SocialJournalTransition();
			const previous = socialRecord([socialAttempt({ status })]);
			const next = socialRecord([
				...previous.attempts,
				socialAttempt({ id: "attempt-two" }),
			]);

			// Act
			const validate = () => transitions.validate(previous, next);

			// Assert
			expect(validate).not.toThrow();
		},
	);
	it("marks a pre-write reservation stale and permits a fresh reservation", () => {
		// Arrange
		const transitions = new SocialJournalTransition();
		const reserved = socialRecord([socialAttempt({ status: "reserved" })]);
		const stale = socialRecord([socialAttempt({ status: "stale" })]);
		const replay = socialRecord([
			...stale.attempts,
			socialAttempt({ id: "attempt-two" }),
		]);

		// Act
		const mark = () => transitions.validate(reserved, stale);
		const reserve = () => transitions.validate(stale, replay);

		// Assert
		expect(mark).not.toThrow();
		expect(reserve).not.toThrow();
	});
	it("retains recovery actor, decision time, and evidence before allowing a new reservation", () => {
		// Arrange
		const transitions = new SocialJournalTransition();
		const previous = socialRecord([socialAttempt({ status: "uncertain" })]);
		const recovered = socialRecord([
			socialAttempt({
				status: "uncertain",
				recovery: {
					actor: "organizer",
					decidedAt: "2026-10-20T13:00:00Z",
					outcome: "not-published",
					reference: "Verified the selected channel for this event",
				},
			}),
		]);
		const next = socialRecord([
			...recovered.attempts,
			socialAttempt({ id: "attempt-two" }),
		]);

		// Act
		const recover = () => transitions.validate(previous, recovered);
		const reserve = () => transitions.validate(recovered, next);

		// Assert
		expect(recover).not.toThrow();
		expect(reserve).not.toThrow();
	});
	it("prevents changing an accepted provider identity", () => {
		// Arrange
		const transitions = new SocialJournalTransition();
		const previous = socialRecord([
			socialAttempt({
				status: "accepted",
				receipt: {
					provider: "slack",
					workspaceId: "T123",
					channelId: "C123",
					ts: "1234.5678",
				},
			}),
		]);
		const next = socialRecord([
			socialAttempt({
				status: "accepted",
				receipt: {
					provider: "slack",
					workspaceId: "T123",
					channelId: "C123",
					ts: "4321.5678",
				},
			}),
		]);

		// Act
		const validate = () => transitions.validate(previous, next);

		// Assert
		expect(validate).toThrow("evidence cannot change");
	});
	it("does not let a new content revision replace the reservation", () => {
		// Arrange
		const transitions = new SocialJournalTransition();
		const previous = socialRecord([socialAttempt()]);
		const next = socialRecord([
			socialAttempt({ revision: "revision-two", status: "rejected" }),
		]);

		// Act
		const validate = () => transitions.validate(previous, next);

		// Assert
		expect(validate).toThrow("reservation cannot change");
	});
	it("does not allow an accepted record without an earlier reservation", () => {
		// Arrange
		const transitions = new SocialJournalTransition();
		const next = socialRecord([socialAttempt({ status: "accepted" })]);

		// Act
		const validate = () => transitions.validate(undefined, next);

		// Assert
		expect(validate).toThrow("reserved before effects");
	});
	it("prevents erasing delivery history", () => {
		// Arrange
		const transitions = new SocialJournalTransition();
		const previous = socialRecord([socialAttempt()]);

		// Act
		const validate = () => transitions.validate(previous, socialRecord());

		// Assert
		expect(validate).toThrow("history must be preserved");
	});
});
