import { describe, expect, it } from "vitest";
import { CommunicationDiagnosticProjection } from "./communication-diagnostic-projection.js";

describe("canonical communication diagnostic projection", () => {
	it("selects canonical machine text without exposing delivery identifiers", () => {
		// Arrange
		const diagnostic = {
			code: "gateway-delivery-uncertain" as const,
			severity: "warning" as const,
			intentId: "private@example.test",
		};

		// Act
		const result =
			CommunicationDiagnosticProjection.domainDiagnostic(diagnostic);

		// Assert
		expect(result).toEqual({
			code: "communication.gateway-delivery-uncertain",
			severity: "warning",
			message: "A gateway could not confirm delivery.",
		});
		expect(JSON.stringify(result)).not.toContain("private@example.test");
	});
	it("projects organizer approval facts independently from locale and channels", () => {
		// Arrange
		const diagnostic = {
			code: "communication.approval-pending" as const,
			severity: "warning" as const,
		};

		// Act
		const result =
			CommunicationDiagnosticProjection.runtimeDiagnostic(diagnostic);

		// Assert
		expect(result).toEqual({
			code: diagnostic.code,
			severity: "warning",
			message: "Email dispatch is waiting for approval on the meetup issue.",
		});
	});
});
