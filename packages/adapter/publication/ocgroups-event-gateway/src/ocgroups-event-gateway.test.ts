import { ScheduledEventError } from "@meetup-automation/publication";
import type { Browser, Page } from "playwright-core";
import { describe, expect, it, vi } from "vitest";
import { event, remote } from "../testing/browser-fixture.js";
import { OcgroupsEventGateway } from "./ocgroups-event-gateway.js";

function fixture() {
	const page = { setDefaultTimeout: vi.fn() } as unknown as Page;
	const browser = {
		newContext: vi
			.fn()
			.mockResolvedValue({ newPage: vi.fn().mockResolvedValue(page) }),
		close: vi.fn().mockResolvedValue(undefined),
	};
	const launch = vi.fn().mockResolvedValue(browser as unknown as Browser);
	const session = {
		login: { login: vi.fn().mockResolvedValue(undefined) },
		editor: {
			save: vi.fn().mockResolvedValue({ identity: remote, status: "draft" }),
			inspect: vi.fn().mockResolvedValue({ identity: remote, status: "draft" }),
		},
		publisher: {
			publish: vi
				.fn()
				.mockResolvedValue({ identity: remote, status: "published" }),
		},
	};
	const gateway = new OcgroupsEventGateway(
		{ launch },
		{ username: "example-organizer", password: " synthetic-password " },
		() => session,
	);
	return { gateway, browser, launch, session };
}
describe("OCGroups browser lifetime", () => {
	it("uses a fresh context and closes the browser after success", async () => {
		// Arrange
		const f = fixture();
		const before = vi.fn();
		const after = vi.fn();
		// Act
		const result = await f.gateway.save(event, undefined, before, after);
		// Assert
		expect(result.status).toBe("draft");
		expect(f.browser.newContext).toHaveBeenCalledExactlyOnceWith({
			locale: "en-US",
			timezoneId: event.timeZone,
			viewport: { width: 1600, height: 1200 },
		});
		expect(f.session.login.login).toHaveBeenCalledWith(
			"example-organizer",
			" synthetic-password ",
		);
		expect(f.session.editor.save).toHaveBeenCalledWith(
			event,
			undefined,
			before,
			after,
		);
		expect(f.browser.close).toHaveBeenCalledOnce();
	});
	it("disposes the browser when authentication fails", async () => {
		// Arrange
		const f = fixture();
		f.session.login.login.mockRejectedValue(
			new ScheduledEventError("authentication"),
		);
		// Act
		const result = f.gateway.inspect(remote.publicUrl);
		// Assert
		await expect(result).rejects.toThrow("authentication");
		expect(f.session.editor.inspect).not.toHaveBeenCalled();
		expect(f.browser.close).toHaveBeenCalledOnce();
	});
	it("redacts unexpected browser errors and still closes the browser", async () => {
		// Arrange
		const f = fixture();
		f.session.publisher.publish.mockRejectedValue(
			new Error("private synthetic session data"),
		);
		// Act
		const result = f.gateway.publish(event, remote, vi.fn());
		// Assert
		await expect(result).rejects.toThrow("Event publication failed: editor");
		expect(f.browser.close).toHaveBeenCalledOnce();
	});
	it("preserves a recoverable result even if cleanup fails", async () => {
		// Arrange
		const f = fixture();
		f.browser.close.mockRejectedValue(new Error("cleanup"));
		// Act
		const result = await f.gateway.save(event, undefined, vi.fn(), vi.fn());
		// Assert
		expect(result.status).toBe("draft");
	});
	it("reports unavailable Chromium without leaking the launch error", async () => {
		// Arrange
		const f = fixture();
		f.launch.mockRejectedValue(new Error("private path"));
		// Act
		const result = f.gateway.inspect(remote.publicUrl);
		// Assert
		await expect(result).rejects.toThrow(
			"Event publication failed: unavailable",
		);
		expect(f.session.login.login).not.toHaveBeenCalled();
	});
});
