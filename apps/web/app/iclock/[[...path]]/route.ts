import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { ApiError, handle } from "@/lib/server/api";
import { adms } from "@/lib/server/container";

export const runtime = "nodejs";

function text(value: string, status = 200) {
	return new Response(value, {
		status,
		headers: { "content-type": "text/plain; charset=utf-8" },
	});
}

function authorize(request: NextRequest) {
	const secret = process.env.ADMS_SECRET_KEY;
	if (!secret) {
		if (process.env.NODE_ENV === "production")
			throw new ApiError(503, "ADMS secret is not configured");
		return;
	}
	const key = request.nextUrl.searchParams.get("key") ?? "";
	const actual = Buffer.from(key),
		expected = Buffer.from(secret);
	if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
		throw new ApiError(401, "Invalid ADMS key");
}

function endpoint(request: NextRequest) {
	return (
		request.nextUrl.pathname.replace(/^\/iclock\/?/, "").split("/")[0] ||
		"cdata"
	);
}

function ip(request: NextRequest) {
	return (
		request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
		request.headers.get("x-real-ip") ||
		""
	);
}

export async function GET(request: NextRequest) {
	return handle(request, async () => {
		authorize(request);
		const sn = request.nextUrl.searchParams.get("SN") ?? "";
		if (endpoint(request) === "getrequest")
			return text(await adms.getPendingCommands(sn));
		if (!sn) return text("OK");
		const device = await adms.registerOrUpdateDevice(sn, ip(request));
		return text(
			[
				`GET OPTION FROM: ${sn}`,
				"Stamp=0",
				"OpStamp=0",
				`Delay=${device?.delay ?? 30}`,
				`ErrorDelay=${device?.errorDelay ?? 60}`,
				"TransTimes=00:00;14:05",
				"TransInterval=1",
				"TransFlag=1111000000",
				"TimeZone=7",
				"Realtime=1",
				"Encrypt=0",
			].join("\n"),
		);
	});
}

export async function POST(request: NextRequest) {
	return handle(request, async () => {
		authorize(request);
		const sn = request.nextUrl.searchParams.get("SN") ?? "";
		const path = endpoint(request);
		if (path === "fdata") {
			const pin = request.nextUrl.searchParams.get("PIN") ?? "";
			if (sn && pin)
				await adms.handlePhotoUpload(
					sn,
					pin,
					request.nextUrl.searchParams.get("FileName") ?? "",
					Buffer.from(await request.arrayBuffer()),
				);
			return text("OK");
		}
		const raw = Buffer.from(await request.arrayBuffer())
			.toString("utf8")
			.trim();
		if (path === "devicecmd") {
			const id = raw.match(/ID[=:](\d+)/)?.[1];
			if (id)
				await adms.ackCommand(
					Number(id),
					(raw.match(/Return[=:](\d+)/)?.[1] ?? "0") === "0",
				);
			return text("OK");
		}
		if (!sn) return text("ERROR: Missing SN");
		await adms.updateDeviceStatus(sn, ip(request));
		if (!raw) return text("OK");
		const table = request.nextUrl.searchParams.get("table") ?? "";
		if (table === "user" || table === "USERINFO")
			return text(await adms.handleUserData(sn, raw));
		if (table === "OPERLOG") {
			if (raw.includes("FP PIN") || raw.includes("FP\tPIN"))
				return text(await adms.handleFingerprintData(sn, raw));
			if (raw.includes("PIN=")) return text(await adms.handleUserData(sn, raw));
			return text("OK");
		}
		return text(await adms.handleLogData(sn, raw));
	});
}
