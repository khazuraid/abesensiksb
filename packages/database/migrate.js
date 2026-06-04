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
	await pool.query(bootstrap);
	console.log("[migrate] Running seed-admin.sql...");
	await pool.query(seed);
	console.log("[migrate] Done.");

	await pool.end();
}

run().catch((e) => {
	console.error("[migrate] FAILED:", e.message);
	process.exit(1);
});
