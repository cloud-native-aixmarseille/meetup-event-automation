import { isIP } from "node:net";
import { ContentError } from "@meetup-automation/publication";
import ipaddr from "ipaddr.js";

export class PublicImageUrl {
	parse(value: string, temporary = false): URL {
		const url = new URL(value);
		if (
			url.protocol !== "https:" ||
			url.username ||
			url.password ||
			url.hash ||
			(url.port && url.port !== "443") ||
			(!temporary && Buffer.byteLength(value) > 2048)
		)
			throw new ContentError("image");
		if (
			!temporary &&
			[...url.searchParams.keys()].some((key) =>
				/token|signature|credential|secret|key|auth|expires/i.test(key),
			)
		)
			throw new ContentError("image");
		const host = url.hostname.replace(/^\[|\]$/g, "");
		if (isIP(host) && !this.publicAddress(host))
			throw new ContentError("image");
		if (
			!host.includes(".") ||
			/(?:^|\.)(?:localhost|local|internal|test|invalid)$/.test(host)
		)
			throw new ContentError("image");
		return url;
	}

	publicAddress(address: string): boolean {
		try {
			return ipaddr.process(address).range() === "unicast";
		} catch {
			return false;
		}
	}
}
