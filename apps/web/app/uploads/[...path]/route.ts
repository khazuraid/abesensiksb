import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import type { NextRequest } from "next/server";
import { ApiError, handle } from "@/lib/server/api";
import { readSession } from "@/lib/server/auth";

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
		await readSession(request);
		const { path } = await context.params;
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
