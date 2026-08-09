import type { NextRequest } from "next/server";
import { handle } from "@/lib/server/api";
import { adms } from "@/lib/server/container";

export const runtime = "nodejs";

function text(value: string, status = 200) {
	return new Response(value, {
		status,
		headers: { "content-type": "text/plain; charset=utf-8" },
	});
}

async function authorize(request: NextRequest) {
	const sn = request.nextUrl.searchParams.get("SN") ?? "unknown";
	const device =
		sn === "unknown"
			? await adms.findClaimedDevice(ip(request))
			: await adms.findDevice(sn);
	const resolved = device ?? (await adms.registerDevice(sn, ip(request)));
	if (resolved?.isBlocked) return { sn, device: null, blocked: true as const };
	return { sn, device: resolved, blocked: false as const };
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
		const { sn, device, blocked } = await authorize(request);
		if (blocked) return text("BLOCKED", 403);
		await adms.updateDeviceStatus(sn, ip(request), device?.id);
		if (endpoint(request) === "getrequest") {
			const info = request.nextUrl.searchParams.get("info") ?? undefined;
			return text(await adms.getPendingCommands(sn, device?.id, info));
		}
		return text(
			[
				`GET OPTION FROM: ${sn}`,
				`Stamp=${device?.stamp ?? "0"}`,
				`OpStamp=${device?.opStamp ?? "0"}`,
				`Delay=${device?.delay ?? 30}`,
				`ErrorDelay=${device?.errorDelay ?? 60}`,
				"TransTimes=00:00;14:05",
				"TransInterval=1",
				"TransFlag=1111000000",
				`TimeZone=${device?.deviceTimezone ?? 7}`,
				"Realtime=1",
				"Encrypt=0",
			].join("\n"),
		);
	});
}

export async function POST(request: NextRequest) {
	return handle(request, async ({ body }) => {
		const { sn, device, blocked } = await authorize(request);
		if (blocked) return text("BLOCKED", 403);
		const path = endpoint(request);
		const raw = Buffer.from(body as ArrayBuffer)
			.toString("utf8")
			.trim();
		if (path === "fdata") {
			const pin = request.nextUrl.searchParams.get("PIN") ?? "";
			if (sn && pin)
				await adms.handlePhotoUpload(
					sn,
					pin,
					request.nextUrl.searchParams.get("FileName") ?? "",
					Buffer.from(body as ArrayBuffer),
				);
			return text("OK");
		}
		if (path === "devicecmd") {
			const id = raw.match(/ID[=:](\d+)/)?.[1];
			if (id)
				await adms.ackCommand(
					Number(id),
					(raw.match(/Return[=:](\d+)/)?.[1] ?? "0") === "0",
					sn,
					device?.id,
					raw,
				);
			return text("OK");
		}
		await adms.updateDeviceStatus(sn, ip(request), device?.id);
		if (!raw) return text("OK");
		const table = (
			request.nextUrl.searchParams.get("table") ?? ""
		).toUpperCase();
		if (table === "USER" || table === "USERINFO")
			return text(await adms.handleUserData(sn, raw));
		if (table === "OPERLOG") {
			const opStamp = request.nextUrl.searchParams.get("opstamp");
			if (opStamp && device?.id) await adms.updateOpStamp(device.id, opStamp);
			if (/^OPLOG/i.test(raw))
				return text(await adms.handleOplog(sn, raw, device?.id));
			if (raw.includes("FP PIN") || raw.includes("FP	PIN"))
				return text(await adms.handleFingerprintData(sn, raw));
			if (raw.includes("PIN=")) return text(await adms.handleUserData(sn, raw));
			return text("OK");
		}
		if (table === "ATTLOG") {
			const stamp = request.nextUrl.searchParams.get("stamp");
			if (stamp && device?.id) await adms.updateStamp(device.id, stamp);
			return text(await adms.handleLogData(sn, raw, device?.id));
		}
		return text("OK");
	});
}
