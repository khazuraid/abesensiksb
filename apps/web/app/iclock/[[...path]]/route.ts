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
	return {
		sn,
		device: sn === "unknown" ? undefined : await adms.findDevice(sn),
	};
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
		const { sn, device } = await authorize(request);
		await adms.updateDeviceStatus(sn, ip(request));
		if (endpoint(request) === "getrequest") {
			return text(await adms.getPendingCommands(sn));
		}
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
	return handle(request, async ({ body }) => {
		const { sn } = await authorize(request);
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
				);
			return text("OK");
		}
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
