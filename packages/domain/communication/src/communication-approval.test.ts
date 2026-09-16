import { describe, expect, it } from "vitest";
import type { CommunicationApprovalFacts } from "./approval-contracts.js";
import { CommunicationApproval } from "./communication-approval.js";

const FACTS: CommunicationApprovalFacts = {
	automationRevision: "revision-abc123",
	eventId: "issue-42",
	eventDate: "2026-10-08",
	occurrenceStatus: "scheduled",
	readiness: "ready",
	policyVersion: "1",
	mailingsRepository: "organization/mailings",
	notificationEnabled: true,
	notificationDestinationFingerprint: `sha256:${"a".repeat(64)}`,
	confirmations: { host: true, speakers: true },
	hostId: "host-0001",
	speakerIds: ["speaker-0002", "speaker-0001"],
	publicationUrls: {
		meetup: "https://meetup.example/events/42",
		community: "https://community.example/events/42",
		assets: "https://assets.example/folders/42",
	},
};

describe("communication approval snapshots", () => {
	it("creates a deeply immutable canonical snapshot", () => {
		// Arrange
		// No additional setup is needed.

		// Act
		const snapshot = CommunicationApproval.createCommunicationApprovalSnapshot({
			...FACTS,
			eventId: " issue-42 ",
			speakerIds: ["speaker-0002", "speaker-0001", "speaker-0002"],
			publicationUrls: {
				meetup: " https://meetup.example/events/42/ ",
				community: null,
				assets: "",
			},
		});
		const actual = Object.isFrozen(snapshot);
		const actual1 = Object.isFrozen(snapshot.facts);
		const actual2 = Object.isFrozen(snapshot.facts.confirmations);
		const actual3 = Object.isFrozen(snapshot.facts.speakerIds);
		const actual4 = Object.isFrozen(snapshot.facts.publicationUrls);

		// Assert
		expect(snapshot).toEqual({
			schemaVersion: 1,
			facts: {
				...FACTS,
				eventId: "issue-42",
				speakerIds: ["speaker-0001", "speaker-0002"],
				publicationUrls: {
					meetup: "https://meetup.example/events/42",
					community: null,
					assets: null,
				},
			},
		});
		expect(actual).toBe(true);
		expect(actual1).toBe(true);
		expect(actual2).toBe(true);
		expect(actual3).toBe(true);
		expect(actual4).toBe(true);
	});

	it("treats speaker identity as an order-independent set", () => {
		// Arrange
		// No additional setup is needed.

		// Act
		const actual = CommunicationApproval.communicationApprovalFactsEqual(
			FACTS,
			{
				...FACTS,
				speakerIds: ["speaker-0001", "speaker-0002", "speaker-0001"],
			},
		);

		// Assert
		expect(actual).toBe(true);
	});

	it.each([
		["automation revision", { automationRevision: "revision-def456" }],
		["event identity", { eventId: "issue-43" }],
		["event date", { eventDate: "2026-10-09" }],
		["occurrence status", { occurrenceStatus: "held" }],
		["readiness", { readiness: "not-ready" }],
		["policy version", { policyVersion: "2" }],
		["mail route", { mailingsRepository: "organization/new-mailings" }],
		[
			"notification policy",
			{
				notificationEnabled: false,
				notificationDestinationFingerprint: null,
			},
		],
		[
			"notification route",
			{ notificationDestinationFingerprint: `sha256:${"b".repeat(64)}` },
		],
		["host confirmation", { confirmations: { host: false, speakers: true } }],
		[
			"speaker confirmation",
			{ confirmations: { host: true, speakers: false } },
		],
		["host identity", { hostId: "host-0002" }],
		["speaker identity", { speakerIds: ["speaker-0001"] }],
		[
			"Meetup URL",
			{
				publicationUrls: {
					...FACTS.publicationUrls,
					meetup: "https://meetup.example/events/43",
				},
			},
		],
		[
			"community URL",
			{
				publicationUrls: {
					...FACTS.publicationUrls,
					community: "https://community.example/events/43",
				},
			},
		],
		[
			"assets URL",
			{
				publicationUrls: {
					...FACTS.publicationUrls,
					assets: "https://assets.example/folders/43",
				},
			},
		],
	] as const)("invalidates approval when %s changes", (_label, override) => {
		// Arrange
		// No additional setup is needed.

		// Act
		const approved =
			CommunicationApproval.createCommunicationApprovalSnapshot(FACTS);
		const current = { ...FACTS, ...override } as CommunicationApprovalFacts;
		const actual = CommunicationApproval.communicationApprovalMatches(
			approved,
			current,
		);

		// Assert
		expect(actual).toBe(false);
	});

	it.each([
		{ ...FACTS, automationRevision: "not safe!" },
		{ ...FACTS, eventDate: "2026-02-30" },
		{ ...FACTS, hostId: "not safe!" },
		{ ...FACTS, speakerIds: ["speaker-9001", "not safe!"] },
		{
			...FACTS,
			notificationEnabled: false,
			notificationDestinationFingerprint: `sha256:${"b".repeat(64)}`,
		},
		{
			...FACTS,
			notificationDestinationFingerprint: "not-a-fingerprint",
		},
		{
			...FACTS,
			publicationUrls: {
				...FACTS.publicationUrls,
				assets: "http://assets.example/private",
			},
		},
	] as CommunicationApprovalFacts[])(
		"rejects invalid approval facts %#",
		(facts) => {
			// Arrange
			// Use the shared fixtures.

			// Act
			const create = () =>
				CommunicationApproval.createCommunicationApprovalSnapshot(facts);

			// Assert
			expect(create).toThrow();
		},
	);

	it("rejects contact fields in stored approval snapshots", () => {
		// Arrange
		const source = {
			schemaVersion: 1,
			facts: { ...FACTS, email: "private@example.invalid" },
		};

		// Act
		const parse = () =>
			CommunicationApproval.parseCommunicationApprovalSnapshot(source);

		// Assert
		expect(parse).toThrow(/invalid schema/);
	});

	it("omits extra contact fields when creating an approval snapshot", () => {
		// Arrange
		// Use the shared fixtures.

		// Act
		const snapshot = CommunicationApproval.createCommunicationApprovalSnapshot({
			...FACTS,
			email: "private@example.invalid",
		} as CommunicationApprovalFacts & {
			readonly email: string;
		});

		// Assert
		expect(JSON.stringify(snapshot)).not.toContain("email");
		expect(JSON.stringify(snapshot)).not.toContain("private@example.invalid");
	});

	it("parses and canonicalizes a strict stored snapshot", () => {
		// Arrange
		// No additional setup is needed.

		// Act
		const parsed = CommunicationApproval.parseCommunicationApprovalSnapshot({
			schemaVersion: 1,
			facts: {
				...FACTS,
				speakerIds: ["speaker-0002", "speaker-0001", "speaker-0001"],
			},
		});

		// Assert
		expect(parsed.facts.speakerIds).toEqual(["speaker-0001", "speaker-0002"]);
	});
});
