import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const nextConfig = readFileSync(
	resolve(process.cwd(), "next.config.js"),
	"utf8",
);

test("CSP permits the application font and Cloudflare analytics origins", () => {
	assert.match(nextConfig, /style-src[^"\n]*https:\/\/fonts\.googleapis\.com/);
	assert.match(
		nextConfig,
		/style-src-elem[^"\n]*https:\/\/fonts\.googleapis\.com/,
	);
	assert.match(nextConfig, /font-src[^"\n]*https:\/\/fonts\.gstatic\.com/);
	assert.match(
		nextConfig,
		/script-src[^"\n]*https:\/\/static\.cloudflareinsights\.com/,
	);
	assert.match(
		nextConfig,
		/script-src-elem[^"\n]*https:\/\/static\.cloudflareinsights\.com/,
	);
	assert.match(
		nextConfig,
		/connect-src[^"\n]*https:\/\/cloudflareinsights\.com/,
	);
});

// Content scripts are injected by a browser extension, outside this app's bundle.
test("application source does not overwrite window.open", () => {
	const appRoot = resolve(process.cwd(), "app");
	const files = [
		resolve(appRoot, "layout.tsx"),
		resolve(process.cwd(), "providers/socket-provider.tsx"),
	];
	for (const file of files) {
		assert.doesNotMatch(readFileSync(file, "utf8"), /window\.open\s*=/);
	}
});
