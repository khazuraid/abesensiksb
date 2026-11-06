import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import type { NextRequest } from "next/server";
import { ApiError, handle } from "@/lib/server/api";
import { readSession } from "@/lib/server/auth";
import { employees } from "@/lib/server/container";

export const runtime = "nodejs";

const types: Record<string, string> = {
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".png": "image/png",
	".webp": "image/webp",
};

export async function GET(
	request: NextRequest,
	context: { params: Promise<{ path: string[] }> },
) {
	return handle(request, async () => {
		const session = await readSession(request);
		const { path } = await context.params;
		if (session.role === "USER") {
			const employee = await employees.resolveEmployeeIdentity(session.userId);
			const targetPin = path[1];
			if (
				!targetPin ||
				(targetPin !== employee.biometricId &&
					targetPin !== employee.employeeCode)
			) {
				throw new ApiError(403, "Akses ditolak");
			}
		}
		const root = resolve(process.cwd(), "uploads");
		const file = resolve(root, ...path);
		if (!file.startsWith(root + sep)) throw new ApiError(400, "Invalid path");
		try {
			const bytes = await readFile(file);
			return new Response(new Uint8Array(bytes), {
				headers: {
					"content-type":
						types[extname(file).toLowerCase()] ?? "application/octet-stream",
					"cache-control": "private, max-age=3600",
				},
			});
		} catch {
			throw new ApiError(404, "File not found");
		}
	});
}
