const { createHash } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { Pool } = require("pg");

const files = [
	"bootstrap.sql",
	"patch.sql",
	"migrations/0005_attendance_log_idempotency.sql",
	"migrations/0006_production_hardening.sql",
	"migrations/0007_integrity_and_reliability.sql",
	"migrations/0008_final_reliability.sql",
	"migrations/0009_employee_shift_assignments.sql",
	"migrations/0010_adms_device_claims.sql",
	"migrations/0011_device_block.sql",
	"migrations/0012_device_info.sql",
];

async function run() {
	if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL wajib diisi");
	const pool = new Pool({ connectionString: process.env.DATABASE_URL });
	const client = await pool.connect();
	try {
		await client.query("SELECT pg_advisory_lock($1)", [1_832_746_521]);
		await client.query(`CREATE TABLE IF NOT EXISTS migration_history (
			name text PRIMARY KEY,
			checksum text NOT NULL,
			applied_at timestamptz NOT NULL DEFAULT now()
		)`);
		for (const file of files) {
			const migration = fs.readFileSync(path.join(__dirname, file), "utf8");
			const checksum = createHash("sha256").update(migration).digest("hex");
			const { rows } = await client.query(
				"SELECT checksum FROM migration_history WHERE name = $1",
				[file],
			);
			if (rows[0]) {
				if (rows[0].checksum !== checksum)
					throw new Error(`Checksum mismatch for applied migration ${file}`);
				continue;
			}
			console.log(`[migrate] Running ${file}...`);
			await client.query("BEGIN");
			try {
				await client.query(migration);
				await client.query(
					"INSERT INTO migration_history (name, checksum) VALUES ($1, $2)",
					[file, checksum],
				);
				await client.query("COMMIT");
			} catch (error) {
				await client.query("ROLLBACK");
				throw error;
			}
		}
		console.log("[migrate] Done.");
	} finally {
		try {
			await client.query("SELECT pg_advisory_unlock($1)", [1_832_746_521]);
		} finally {
			client.release();
			await pool.end();
		}
	}
}

run().catch((error) => {
	console.error("[migrate] ERROR in run():", error.message);
	process.exitCode = 1;
});
