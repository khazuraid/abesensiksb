import { createHmac } from "node:crypto";
import jwt from "jsonwebtoken";

export type SocketUser = { userId: number; role: string };

export function authorizeSocket(
	token: string | undefined,
	secret: string,
): SocketUser {
	if (!token) throw new Error("Unauthorized");
	try {
		const payload = jwt.verify(token, secret, {
			audience: "worker-socket",
		}) as {
			sub?: number | string;
			userId?: number;
			role?: string;
		};
		const userId = Number(payload.userId ?? payload.sub);
		if (!Number.isInteger(userId) || !payload.role) throw new Error();
		return { userId, role: payload.role };
	} catch {
		throw new Error("Unauthorized");
	}
}

export function webhookHeaders(
	timestamp: string,
	secret: string | null,
	body: string,
) {
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
		"x-adms-timestamp": timestamp,
	};
	if (secret) {
		headers["x-adms-signature"] = `sha256=${createHmac("sha256", secret)
			.update(`${timestamp}.${body}`)
			.digest("hex")}`;
	}
	return headers;
}

export function isSafeWebhookUrl(urlString: string): boolean {
	try {
		const parsed = new URL(urlString);
		if (parsed.protocol !== "https:" && parsed.protocol !== "http:")
			return false;
		const hostname = parsed.hostname.toLowerCase();
		if (
			hostname === "localhost" ||
			hostname === "127.0.0.1" ||
			hostname === "0.0.0.0" ||
			hostname === "::1" ||
			hostname === "169.254.169.254" ||
			hostname.endsWith(".internal") ||
			hostname.endsWith(".local") ||
			hostname.startsWith("10.") ||
			hostname.startsWith("192.168.") ||
			/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
		) {
			return false;
		}
		return true;
	} catch {
		return false;
	}
}
