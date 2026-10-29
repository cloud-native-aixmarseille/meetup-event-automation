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
import type { OcgroupsEventPublisher } from "./ocgroups-event-publisher.js";

let browser: Browser;
beforeAll(async () => {
	browser = await chromium.launch({ headless: true });
});
afterAll(async () => {
	await browser?.close();
});
async function fixture(initial: "draft" | "published" = "draft") {
	const context = await browser.newContext();
	const page = await context.newPage();
	page.setDefaultTimeout(500);
	const state = await installBrowserFixture(context, initial);
	return {
		context,
		page,
		state,
		publisher: new OcgroupsEventGatewayComposition(images).session(
			page,
			target(),
		).publisher as OcgroupsEventPublisher,
	};
}
describe("OCGroups publication browser contract", () => {
	it("guards the final confirmation and verifies the saved publication", async () => {
		// Arrange
		const f = await fixture();
		const guard = vi.fn(async () => {
			expect(f.state.publishes).toBe(0);
			expect(await f.page.locator(".swal2-popup").isVisible()).toBe(true);
		});
		// Act
		const result = await f.publisher.publish(event, remote, guard);
		await f.context.close();
		// Assert
		expect(result).toEqual({ identity: remote, status: "published" });
		expect(guard).toHaveBeenCalledOnce();
		expect(f.state.publishes).toBe(1);
		expect(f.state.saves).toBe(0);
	});
	it("does not republish an already published event", async () => {
		// Arrange
		const f = await fixture("published");
		const guard = vi.fn();
		// Act
		const result = await f.publisher.publish(event, remote, guard);
		await f.context.close();
		// Assert
		expect(result.status).toBe("published");
		expect(guard).not.toHaveBeenCalled();
		expect(f.state.publishes).toBe(0);
	});
	it("leaves the draft unpublished when the final guard rejects", async () => {
		// Arrange
		const f = await fixture();
		const guard = vi.fn().mockRejectedValue(new Error("Approval changed"));
		// Act
		const result = f.publisher.publish(event, remote, guard);
		// Assert
		await expect(result).rejects.toThrow("Approval changed");
		expect(f.state.publishes).toBe(0);
		await f.context.close();
	});
	it.each(["name", "starts_at", "description", "ticket_types[0][seats_total]"])(
		"blocks a remote change to %s",
		async (field) => {
			// Arrange
			const f = await fixture();
			f.state.fields[field] = "changed";
			const guard = vi.fn();
			// Act
			const result = f.publisher.publish(event, remote, guard);
			// Assert
			await expect(result).rejects.toThrow("verification");
			expect(guard).not.toHaveBeenCalled();
			expect(f.state.publishes).toBe(0);
			await f.context.close();
		},
	);
	it.each(["canceled", "series"] as const)("blocks %s events", async (flag) => {
		// Arrange
		const f = await fixture();
		f.state[flag] = true;
		// Act
		const result = f.publisher.publish(event, remote, vi.fn());
		// Assert
		await expect(result).rejects.toThrow("verification");
		expect(f.state.publishes).toBe(0);
		await f.context.close();
	});
});
