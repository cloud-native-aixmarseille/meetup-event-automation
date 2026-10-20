import { describe, expect, it, vi } from "vitest";
import { contentFixture } from "../../testing/content.fixtures.js";
import { ContentError } from "../domain/content-error.js";
import { ContentFingerprint } from "../domain/content-fingerprint.js";

describe("managed content reconciliation", () => {
	it("updates a host logo on host reassignment, byte changes, and removal", async () => {
		// Arrange
		const f = contentFixture(true, undefined, "host.logo");
		const logo = {
			url: "https://images.example.org/logo.png",
			description: "Public host logo",
		};
		const first = {
			...f.input,
			model: { ...f.input.model, hostLogo: { ...logo, hostId: "host-one" } },
		};
		const second = {
			...first,
			fresh: false,
			model: { ...f.input.model, hostLogo: { ...logo, hostId: "host-two" } },
		};

		// Act
		await f.service.execute(first);
		await f.service.execute({ ...first, fresh: false });
		const unchangedWrites = vi.mocked(f.renderer.apply).mock.calls.length;
		await f.service.execute(second);
		const assignedHost = f.state.manifest?.bindings.find(
			(binding) => binding.type === "image",
		)?.hostId;
		f.state.sourceVersion = "updated-logo-bytes";
		await f.service.execute(second);
		const removed = await f.service.execute({ ...f.input, fresh: false });

		// Assert
		expect(unchangedWrites).toBe(1);
		expect(assignedHost).toBe("host-two");
		expect(
			f.writes
				.filter((value) => value.type === "image")
				.map((value) => value.hostId),
		).toEqual(["host-one", "host-two", "host-two", undefined]);
		expect(removed).toEqual({ status: "ready", fallback: true });
		expect(
			f.state.manifest?.bindings.find((binding) => binding.type === "image")
				?.hostId,
		).toBeUndefined();
	});

	it("preserves manually replaced host logos", async () => {
		// Arrange
		const f = contentFixture(true, undefined, "host.logo");
		await f.service.execute(f.input);
		f.state.content.set("image", ContentFingerprint.of("manual host logo"));

		// Act
		const result = f.service.execute({ ...f.input, fresh: false });

		// Assert
		await expect(result).rejects.toMatchObject({ code: "conflict" });
		expect(f.renderer.apply).toHaveBeenCalledTimes(1);
	});

	it("persists a slotted text binding through updates, no-ops, and manual-edit conflicts", async () => {
		// Arrange
		const f = contentFixture(false, {
			type: "text",
			token: "talk.title",
			slot: "opening",
			required: true,
		});

		// Act
		await f.service.execute(f.input);
		const changed = {
			...f.input,
			fresh: false,
			model: { text: { "talk.title:opening": "Updated title" }, pictures: {} },
		};
		await f.service.execute(changed);
		const unchanged = await f.service.execute(changed);
		f.state.content.set("title", ContentFingerprint.of("Manual title"));
		const conflict = f.service.execute(changed);

		// Assert
		expect(unchanged.status).toBe("ready");
		expect(f.state.manifest?.bindings[0].key).toBe("talk.title:opening");
		expect(f.renderer.apply).toHaveBeenCalledTimes(2);
		expect(f.writes.map((value) => value.text)).toEqual([
			"Public meetup",
			"Updated title",
		]);
		await expect(conflict).rejects.toMatchObject({ code: "conflict" });
	});

	it("safely retries a text batch that left the original content intact", async () => {
		// Arrange
		const f = contentFixture();
		vi.mocked(f.renderer.apply).mockRejectedValueOnce(
			new Error("connection lost before write"),
		);
		// Act
		const result = await f.service.execute(f.input);
		// Assert
		expect(result.status).toBe("ready");
		expect(f.renderer.apply).toHaveBeenCalledTimes(2);
	});

	it("recovers initial binding state after an ambiguous sidecar creation", async () => {
		// Arrange
		const f = contentFixture();
		const save = f.manifests.save;
		vi.mocked(f.manifests.save).mockImplementationOnce(
			async (_folder, manifest) => {
				f.state.manifest = structuredClone(manifest);
				throw new Error("lost sidecar response");
			},
		);
		// Act
		const first = await f.service
			.execute(f.input)
			.catch((error: unknown) => error);
		f.manifests.save = save;
		const recovered = await f.service.execute({ ...f.input, fresh: false });
		// Assert
		expect(first).toBeInstanceOf(Error);
		expect(recovered.status).toBe("ready");
		expect(f.renderer.apply).toHaveBeenCalledTimes(1);
	});

	it("requires explicit recovery for missing state on a managed copy", async () => {
		// Arrange
		const f = contentFixture();
		// Act
		const result = f.service.execute({ ...f.input, fresh: false });
		// Assert
		await expect(result).rejects.toMatchObject({ code: "recovery" });
		expect(f.renderer.apply).not.toHaveBeenCalled();
	});

	it("does not overwrite a collaborator after a rejected revision", async () => {
		// Arrange
		const f = contentFixture();
		vi.mocked(f.renderer.apply).mockImplementationOnce(async () => {
			f.state.revision++;
			f.state.content.set("title", ContentFingerprint.of("Collaborator text"));
			throw new ContentError("revision");
		});
		// Act
		const result = f.service.execute(f.input);
		// Assert
		await expect(result).rejects.toMatchObject({ code: "conflict" });
		expect(f.renderer.apply).toHaveBeenCalledTimes(1);
	});

	it("preserves manually replaced portraits", async () => {
		// Arrange
		const f = contentFixture(true);
		await f.service.execute(f.input);
		f.state.content.set("image", ContentFingerprint.of("manual replacement"));
		// Act
		const result = f.service.execute({ ...f.input, fresh: false });
		// Assert
		await expect(result).rejects.toMatchObject({ code: "conflict" });
		expect(f.renderer.apply).toHaveBeenCalledTimes(1);
	});

	it("replaces a portrait on explicit speaker reassignment and removal", async () => {
		// Arrange
		const f = contentFixture(true);
		const picture = {
			url: "https://images.example.org/portrait.png",
			description: "Speaker",
		};
		// Act
		await f.service.execute({
			...f.input,
			model: {
				...f.input.model,
				pictures: { portrait: { ...picture, speakerId: "speaker-one" } },
			},
		});
		await f.service.execute({
			...f.input,
			fresh: false,
			model: {
				...f.input.model,
				pictures: { portrait: { ...picture, speakerId: "speaker-two" } },
			},
		});
		const removed = await f.service.execute({ ...f.input, fresh: false });
		// Assert
		expect(
			f.writes
				.filter((value) => value.type === "image")
				.map((value) => value.speakerId),
		).toEqual(["speaker-one", "speaker-two", undefined]);
		expect(removed).toEqual({ status: "ready", fallback: true });
	});

	it("consumes an explicit restore once and preserves later edits", async () => {
		// Arrange
		const f = contentFixture();
		await f.service.execute(f.input);
		f.state.content.set("title", ContentFingerprint.of("Manual text"));
		const input = {
			...f.input,
			fresh: false,
			recovery: { operation: "restore", revision: "2", bindingId: "title" },
		} as const;
		// Act
		const restored = await f.service.execute(input);
		f.state.content.set("title", ContentFingerprint.of("Later manual text"));
		const repeated = f.service.execute(input);
		// Assert
		expect(restored.status).toBe("ready");
		await expect(repeated).rejects.toMatchObject({ code: "conflict" });
		expect(f.renderer.apply).toHaveBeenCalledTimes(2);
	});
	it("populates once, skips unchanged inputs and updates literal values using stable anchors", async () => {
		// Arrange
		const f = contentFixture();
		// Act
		const first = await f.service.execute(f.input);
		const unchanged = await f.service.execute({ ...f.input, fresh: false });
		const changed = await f.service.execute({
			...f.input,
			fresh: false,
			model: { text: { "event.title": "Literal {{host.name}}" }, pictures: {} },
		});
		// Assert
		expect([first.status, unchanged.status, changed.status]).toEqual([
			"ready",
			"ready",
			"ready",
		]);
		expect(f.renderer.apply).toHaveBeenCalledTimes(2);
		expect(f.writes.map((value) => value.text)).toEqual([
			"Public meetup",
			"Literal {{host.name}}",
		]);
		expect(f.state.manifest?.fileId).toBe("copy");
		expect(f.state.manifest?.pending).toBeUndefined();
		expect(JSON.stringify(f.state.manifest)).not.toContain("Public meetup");
	});

	it("preserves a manual edit inside a bound shape", async () => {
		// Arrange
		const f = contentFixture();
		await f.service.execute(f.input);
		f.state.content.set("title", ContentFingerprint.of("Manual work"));
		// Act
		const result = f.service.execute({ ...f.input, fresh: false });
		// Assert
		await expect(result).rejects.toMatchObject({ code: "conflict" });
		expect(f.renderer.apply).toHaveBeenCalledTimes(1);
		expect(f.state.content.get("title")).toBe(
			ContentFingerprint.of("Manual work"),
		);
	});

	it("confirms a lost text batch response by reading the pending fingerprints", async () => {
		// Arrange
		const f = contentFixture();
		f.state.failAfterApply = true;
		// Act
		const result = await f.service.execute(f.input);
		// Assert
		expect(result.status).toBe("ready");
		expect(f.renderer.apply).toHaveBeenCalledTimes(1);
		expect(f.state.manifest?.pending).toBeUndefined();
	});

	it("reports an uncertain image write as a technical failure and retains recovery state", async () => {
		// Arrange
		const f = contentFixture(true);
		f.state.failAfterApply = true;
		// Act
		const result = f.service.execute(f.input);
		// Assert
		await expect(result).rejects.toThrow("uncertain response");
		expect(f.renderer.apply).toHaveBeenCalledTimes(1);
		expect(f.state.manifest?.pending).toBeDefined();
	});

	it("shows organizer recovery on a later run after an uncertain image write", async () => {
		// Arrange
		const f = contentFixture(true);
		f.state.failAfterApply = true;
		await f.service.execute(f.input).catch(() => undefined);

		// Act
		const result = f.service.execute({ ...f.input, fresh: false });

		// Assert
		await expect(result).rejects.toMatchObject({ code: "recovery" });
		expect(f.renderer.apply).toHaveBeenCalledTimes(1);
		expect(f.state.manifest?.pending).toBeDefined();
	});

	it("preserves a failed write after safe retries confirm no changes", async () => {
		// Arrange
		const f = contentFixture();
		const error = new Error("Synthetic provider authentication failure");
		vi.mocked(f.renderer.apply).mockRejectedValue(error);

		// Act
		const result = f.service.execute(f.input);

		// Assert
		await expect(result).rejects.toBe(error);
		expect(f.renderer.apply).toHaveBeenCalledTimes(2);
		expect(f.state.manifest?.pending).toBeDefined();
		expect(f.state.content.get("title")).toBe(
			ContentFingerprint.of("{{event.title}}"),
		);
	});

	it("preserves the technical failure when a partial write requires recovery", async () => {
		// Arrange
		const f = contentFixture();
		const error = new Error("Synthetic transport failure");
		vi.mocked(f.renderer.apply).mockImplementationOnce(async () => {
			f.state.content.set("title", ContentFingerprint.of("Partial value"));
			f.state.revision++;
			throw error;
		});

		// Act
		const result = f.service.execute(f.input);

		// Assert
		await expect(result).rejects.toBe(error);
		expect(f.renderer.apply).toHaveBeenCalledTimes(1);
		expect(f.state.manifest?.pending).toBeDefined();
	});

	it("uses a fallback for an unbound portrait and refreshes changed bytes at the same URL", async () => {
		// Arrange
		const f = contentFixture(true);
		// Act
		const first = await f.service.execute(f.input);
		const unchanged = await f.service.execute({ ...f.input, fresh: false });
		f.state.sourceVersion = "source-v2";
		const changed = await f.service.execute({ ...f.input, fresh: false });
		// Assert
		expect([first, unchanged, changed]).toEqual(
			Array(3).fill({ status: "ready", fallback: true }),
		);
		expect(f.renderer.apply).toHaveBeenCalledTimes(2);
		expect(f.writes.filter((value) => value.type === "image")).toHaveLength(2);
	});

	it("reloads after a definite revision conflict", async () => {
		// Arrange
		const f = contentFixture();
		vi.mocked(f.renderer.apply).mockRejectedValueOnce(
			new ContentError("revision"),
		);
		// Act
		const result = await f.service.execute(f.input);
		// Assert
		expect(result.status).toBe("ready");
		expect(f.renderer.apply).toHaveBeenCalledTimes(2);
	});

	it("keeps the bound contract when the template revision changes", async () => {
		// Arrange
		const f = contentFixture();
		await f.service.execute(f.input);
		// Act
		const result = await f.service.execute({
			...f.input,
			fresh: false,
			contract: { ...f.input.contract, revision: "v2", fields: [] },
		});
		// Assert
		expect(result.status).toBe("ready");
		expect(f.state.manifest?.contract.revision).toBe("v1");
		expect(f.renderer.apply).toHaveBeenCalledTimes(1);
	});

	it("does not guess bindings for existing copy-only files", async () => {
		// Arrange
		const f = contentFixture();
		// Act
		const result = await f.service.execute({
			...f.input,
			fresh: false,
			managed: false,
		});
		// Assert
		expect(result.status).toBe("copy-only");
		expect(f.renderer.read).not.toHaveBeenCalled();
		expect(f.renderer.apply).not.toHaveBeenCalled();
	});

	it("removes a deleted anchor only under explicit revision-bound recovery", async () => {
		// Arrange
		const f = contentFixture();
		await f.service.execute(f.input);
		f.state.content.delete("title");
		// Act
		const result = await f.service.execute({
			...f.input,
			fresh: false,
			recovery: { operation: "remove", revision: "2", bindingId: "title" },
		});
		// Assert
		expect(result.status).toBe("ready");
		expect(f.state.manifest?.bindings).toEqual([]);
		expect(f.renderer.apply).toHaveBeenCalledTimes(1);
	});
});
