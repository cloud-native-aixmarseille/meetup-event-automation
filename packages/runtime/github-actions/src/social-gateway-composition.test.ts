import { createHash } from "node:crypto";
import type {
	LinkedInSocialDestination,
	SlackSocialDestination,
} from "@meetup-automation/communication";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SocialGatewayComposition } from "./social-gateway-composition.js";

const slack: SlackSocialDestination = {
	key: "engineering",
	provider: "slack",
	label: "Engineering",
	workspaceId: "TENGINEERING",
	channelId: "CENGINEERING",
};
const linkedin: LinkedInSocialDestination = {
	key: "community-page",
	provider: "linkedin",
	label: "Community Page",
	organizationUrn: "urn:li:organization:123",
};

afterEach(() => vi.unstubAllGlobals());

describe("configured social provider wiring", () => {
	it("creates no gateways or requests for an empty destination list", () => {
		// Arrange
		const fetcher = vi.fn<typeof fetch>();
		vi.stubGlobal("fetch", fetcher);

		// Act
		const gateways = new SocialGatewayComposition().create([], {});

		// Assert
		expect(gateways.size).toBe(0);
		expect(fetcher).not.toHaveBeenCalled();
	});
	it.each([{}, { slack: { TOTHER: "other-workspace-token" } }])(
		"requires a credential for the configured Slack workspace",
		(credentials) => {
			// Arrange
			const fetcher = vi.fn<typeof fetch>();
			vi.stubGlobal("fetch", fetcher);
			const composition = new SocialGatewayComposition();

			// Act
			const compose = () => composition.create([slack], credentials);

			// Assert
			expect(compose).toThrow("Missing Slack workspace credential");
			expect(fetcher).not.toHaveBeenCalled();
		},
	);
	it("requires a LinkedIn credential when a Page is configured", () => {
		// Arrange
		const fetcher = vi.fn<typeof fetch>();
		vi.stubGlobal("fetch", fetcher);
		const composition = new SocialGatewayComposition();

		// Act
		const compose = () => composition.create([linkedin], {});

		// Assert
		expect(compose).toThrow("Missing LinkedIn credential");
		expect(fetcher).not.toHaveBeenCalled();
	});
	it("uses the matching installation token and channel for each Slack workspace", async () => {
		// Arrange
		const second = {
			...slack,
			key: "operations",
			workspaceId: "TOPERATIONS",
			channelId: "COPERATIONS",
		};
		const destinations = [slack, second];
		const fetcher = vi.fn<typeof fetch>();
		for (const destination of destinations) {
			fetcher.mockResolvedValueOnce(
				Response.json({
					ok: true,
					team_id: destination.workspaceId,
					bot_id: "BBOT",
				}),
			);
			fetcher.mockResolvedValueOnce(
				Response.json({
					ok: true,
					channel: destination.channelId,
					ts: "1792497600.000001",
				}),
			);
		}
		vi.stubGlobal("fetch", fetcher);
		const gateways = new SocialGatewayComposition().create(destinations, {
			slack: {
				TENGINEERING: "engineering-token",
				TOPERATIONS: "operations-token",
			},
		});
		const guard = vi.fn(async () => {});
		const results = [];

		// Act
		for (const destination of destinations) {
			const gateway = gateways.get(destination.key);
			if (!gateway) throw new Error("Configured gateway missing");
			results.push(
				await gateway.posts.publish(
					{ destination, text: "Reviewed meetup announcement" },
					guard,
				),
			);
		}

		// Assert
		expect([...gateways.keys()]).toEqual(["engineering", "operations"]);
		expect(results).toEqual(
			destinations.map((destination) => ({
				status: "accepted",
				receipt: {
					provider: "slack",
					workspaceId: destination.workspaceId,
					channelId: destination.channelId,
					ts: "1792497600.000001",
				},
			})),
		);
		expect(
			fetcher.mock.calls.map(([, init]) =>
				new Headers(init?.headers).get("authorization"),
			),
		).toEqual([
			"Bearer engineering-token",
			"Bearer engineering-token",
			"Bearer operations-token",
			"Bearer operations-token",
		]);
		expect(fetcher.mock.calls[1]).toEqual([
			"https://slack.com/api/chat.postMessage",
			expect.objectContaining({
				body: expect.stringContaining('"channel":"CENGINEERING"'),
			}),
		]);
		expect(fetcher.mock.calls[3]).toEqual([
			"https://slack.com/api/chat.postMessage",
			expect.objectContaining({
				body: expect.stringContaining('"channel":"COPERATIONS"'),
			}),
		]);
		expect(guard).toHaveBeenCalledTimes(2);
	});
	it("refuses an installation authenticated to another workspace before posting", async () => {
		// Arrange
		const fetcher = vi
			.fn<typeof fetch>()
			.mockResolvedValue(
				Response.json({ ok: true, team_id: "TOTHER", bot_id: "BBOT" }),
			);
		vi.stubGlobal("fetch", fetcher);
		const gateway = new SocialGatewayComposition()
			.create([slack], { slack: { TENGINEERING: "wrong-installation-token" } })
			.get(slack.key);
		if (!gateway) throw new Error("Configured gateway missing");
		const guard = vi.fn(async () => {});

		// Act
		const result = await gateway.posts.publish(
			{ destination: slack, text: "Reviewed announcement" },
			guard,
		);

		// Assert
		expect(result).toEqual({ status: "rejected", code: "workspace-mismatch" });
		expect(fetcher).toHaveBeenCalledTimes(1);
		expect(fetcher.mock.calls[0][0]).toBe("https://slack.com/api/auth.test");
		expect(guard).not.toHaveBeenCalled();
	});
	it("uses the Page credential for image preparation and the approved post", async () => {
		// Arrange
		const bytes = Buffer.from(
			"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jH7sAAAAASUVORK5CYII=",
			"base64",
		);
		const image = {
			destination: linkedin,
			bytes,
			mimeType: "image/png",
			fingerprint: createHash("sha256").update(bytes).digest("hex"),
			description: "Reviewed announcement image",
		};
		const status = {
			id: "urn:li:image:ABC123",
			owner: linkedin.organizationUrn,
			status: "AVAILABLE",
		};
		const uploadUrl =
			"https://www.linkedin.com/dms-uploads/ABC123/uploaded-image/0?ut=synthetic";
		const fetcher = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(
				Response.json({ value: { image: status.id, uploadUrl } }),
			)
			.mockResolvedValueOnce(new Response(null, { status: 201 }))
			.mockResolvedValueOnce(Response.json(status))
			.mockResolvedValueOnce(Response.json(status))
			.mockResolvedValueOnce(
				new Response(null, {
					status: 201,
					headers: { "x-restli-id": "urn:li:share:456" },
				}),
			);
		vi.stubGlobal("fetch", fetcher);
		const gateway = new SocialGatewayComposition()
			.create([linkedin], {
				linkedin: {
					accessToken: "page-token",
					googleCredentials: "unused-by-provider",
				},
			})
			.get(linkedin.key);
		if (!gateway?.images) throw new Error("Configured image gateway missing");
		const guard = vi.fn(async () => {});
		const record = vi.fn(async () => {});

		// Act
		const prepared = await gateway.images.prepare(image, guard, record);
		if (prepared.status !== "ready")
			throw new Error("Image preparation failed");
		const result = await gateway.posts.publish(
			{
				destination: linkedin,
				text: "Reviewed meetup announcement",
				media: prepared.media,
			},
			guard,
		);

		// Assert
		expect(result).toMatchObject({
			status: "accepted",
			receipt: {
				provider: "linkedin",
				organizationUrn: linkedin.organizationUrn,
				postUrn: "urn:li:share:456",
			},
		});
		expect(record).toHaveBeenCalledExactlyOnceWith({
			assetUrn: status.id,
			fingerprint: image.fingerprint,
			description: image.description,
		});
		expect(record.mock.invocationCallOrder[0]).toBeLessThan(
			fetcher.mock.invocationCallOrder[1],
		);
		expect(
			fetcher.mock.calls.map(([, init]) =>
				new Headers(init?.headers).get("authorization"),
			),
		).toEqual(Array(5).fill("Bearer page-token"));
		expect(fetcher.mock.calls[0]).toEqual([
			"https://api.linkedin.com/rest/images?action=initializeUpload",
			expect.objectContaining({
				body: JSON.stringify({
					initializeUploadRequest: { owner: linkedin.organizationUrn },
				}),
			}),
		]);
		expect(fetcher.mock.calls[1]).toEqual([
			uploadUrl,
			expect.objectContaining({ method: "PUT", body: new Uint8Array(bytes) }),
		]);
		expect(fetcher.mock.calls[4]).toEqual([
			"https://api.linkedin.com/rest/posts",
			expect.objectContaining({
				body: expect.stringContaining('"author":"urn:li:organization:123"'),
			}),
		]);
		expect(guard).toHaveBeenCalledTimes(3);
	});
});
