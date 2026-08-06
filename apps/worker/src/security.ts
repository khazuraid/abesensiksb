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
