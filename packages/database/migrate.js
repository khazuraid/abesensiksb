// migrate.js — dijalankan sebelum app start di container
// Membaca bootstrap.sql dan seed-admin.sql, eksekusi ke DATABASE_URL
const { Pool } = require("pg");
const fs = require("node:fs");
const path = require("node:path");

async function run() {
	const pool = new Pool({ connectionString: process.env.DATABASE_URL });

	const bootstrap = fs.readFileSync(
		path.join(__dirname, "bootstrap.sql"),
		"utf8",
	);
	const seed = fs.readFileSync(path.join(__dirname, "seed-admin.sql"), "utf8");

	console.log("[migrate] Running bootstrap.sql...");
	try {
		await pool.query(bootstrap);
	} catch (e) {
		console.error("[migrate] WARNING: Failed to run bootstrap.sql:", e.message);
	}

	try {
		console.log("[migrate] Running patch.sql...");
		const patchSql = fs.readFileSync(path.join(__dirname, "patch.sql"), "utf8");
		await pool.query(patchSql);
	} catch (e) {
		console.error("[migrate] WARNING: Failed to run patch.sql:", e.message);
	}

	try {
		console.log("[migrate] Running seed-admin.sql...");
		await pool.query(seed);
	} catch (e) {
		console.error(
			"[migrate] WARNING: Failed to run seed-admin.sql:",
			e.message,
		);
	}

	console.log("[migrate] Done.");

	await pool.end();
}

run().catch((e) => {
	console.error("[migrate] ERROR in run():", e.message);
	console.error("[migrate] The server will still attempt to start...");
});
