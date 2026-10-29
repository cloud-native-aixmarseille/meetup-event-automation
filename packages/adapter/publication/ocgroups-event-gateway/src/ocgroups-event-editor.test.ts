import { type Browser, chromium } from "playwright-core";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
	event,
	installBrowserFixture,
	remote,
	target,
} from "../testing/browser-fixture.js";
import { images } from "../testing/photo-fixture.js";
import { OcgroupsEventGatewayComposition } from "./dependency-composition.js";
import type { OcgroupsEventEditor } from "./ocgroups-event-editor.js";

let browser: Browser;
beforeAll(async () => {
	browser = await chromium.launch({ headless: true });
});
afterAll(async () => {
	await browser?.close();
});
async function fixture(initial: "missing" | "draft" | "published" = "missing") {
	const context = await browser.newContext();
	const page = await context.newPage();
	page.setDefaultTimeout(500);
	const state = await installBrowserFixture(context, initial);
	const composition = new OcgroupsEventGatewayComposition(images);
	const session = composition.session(page, target());
	return { context, state, editor: session.editor as OcgroupsEventEditor };
}
describe("OCGroups editor browser contract", () => {
	it("creates a saved draft and records its UUID before reading the saved fields", async () => {
		// Arrange
		const f = await fixture();
		const before = vi.fn();
		const saved = vi.fn();
		// Act
		const result = await f.editor.save(event, undefined, before, saved);
		await f.context.close();
		// Assert
		expect(result).toEqual({ identity: remote, status: "draft" });
		expect(f.state.saves).toBe(1);
		expect(f.state.publishes).toBe(0);
		expect(before).toHaveBeenCalledTimes(2);
		expect(f.state.uploads).toBe(1);
		expect(before.mock.calls).toEqual([["asset"], ["event"]]);
		expect(f.state.fields.meetup_url).toBe(event.meetupUrl);
		expect(f.state.fields["speakers[0][user_id]"]).toBe(
			event.speakers[0].userId,
		);
		expect(f.state.fields["sponsors[0][group_sponsor_id]"]).toBe(
			event.sponsor.id,
		);
		expect(saved).toHaveBeenCalledExactlyOnceWith({
			id: remote.id,
			reviewUrl: remote.reviewUrl,
		});
	});
	it("performs no write when all managed fields already match", async () => {
		// Arrange
		const f = await fixture("published");
		const before = vi.fn();
		// Act
		const result = await f.editor.save(event, remote, before, vi.fn());
		await f.context.close();
		// Assert
		expect(result.status).toBe("published");
		expect(f.state.saves).toBe(0);
		expect(before).not.toHaveBeenCalled();
		expect(f.state.uploads).toBe(0);
	});
	it("preserves publication and existing registration while updating managed fields", async () => {
		// Arrange
		const f = await fixture("published");
		f.state.fields.name = "Old title";
		f.state.fields["ticket_types[0][seats_total]"] = "200";
		// Act
		const result = await f.editor.save(event, remote, vi.fn(), vi.fn());
		await f.context.close();
		// Assert
		expect(result.status).toBe("published");
		expect(f.state.fields.name).toBe(event.title);
		expect(f.state.fields["ticket_types[0][seats_total]"]).toBe("200");
		expect(f.state.publishes).toBe(0);
	});
	it("keeps the saved UUID recoverable when the editor reload fails", async () => {
		// Arrange
		const f = await fixture();
		f.state.brokenAfterSave = true;
		const saved = vi.fn();
		// Act
		const result = f.editor.save(event, undefined, vi.fn(), saved);
		// Assert
		await expect(result).rejects.toThrow();
		expect(saved).toHaveBeenCalledExactlyOnceWith({
			id: remote.id,
			reviewUrl: remote.reviewUrl,
		});
		expect(f.state.saves).toBe(1);
		await f.context.close();
	});
	it("blocks a changed draft registration policy before writing", async () => {
		// Arrange
		const f = await fixture("draft");
		f.state.fields["ticket_types[0][seats_total]"] = "200";
		// Act
		const result = f.editor.save(event, remote, vi.fn(), vi.fn());
		// Assert
		await expect(result).rejects.toThrow("verification");
		expect(f.state.saves).toBe(0);
		await f.context.close();
	});
	it("stops before submission if the source guard rejects", async () => {
		// Arrange
		const f = await fixture();
		const guard = vi.fn().mockRejectedValue(new Error("Source changed"));
		// Act
		const result = f.editor.save(event, undefined, guard, vi.fn());
		// Assert
		await expect(result).rejects.toThrow("Source changed");
		expect(f.state.saves).toBe(0);
		await f.context.close();
	});
	it("resolves a draft public slug through the organizer dashboard", async () => {
		// Arrange
		const f = await fixture("draft");
		// Act
		const result = await f.editor.inspect(remote.publicUrl);
		await f.context.close();
		// Assert
		expect(result).toEqual({ identity: remote, status: "draft" });
		expect(f.state.saves).toBe(0);
	});
	it("reopens an editor identity independently of the public slug", async () => {
		// Arrange
		const f = await fixture("published");
		// Act
		const result = await f.editor.inspect(remote.reviewUrl);
		await f.context.close();
		// Assert
		expect(result).toEqual({ identity: remote, status: "published" });
		expect(f.state.saves).toBe(0);
	});
});
