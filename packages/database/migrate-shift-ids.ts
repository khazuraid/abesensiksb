import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config({ path: "../../.env" });

const pool = new Pool({
	connectionString:
		process.env.DATABASE_URL ||
		"postgres://adms:adms123@localhost:5432/adms_db",
});

async function run() {
	const client = await pool.connect();
	try {
		console.log("Starting migration...");
		await client.query("BEGIN");

		// Add new column
		await client.query(
			`ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "shift_ids" jsonb DEFAULT '[]' NOT NULL`,
		);

		// Migrate existing data if shift_id exists
		const res = await client.query(
			`SELECT column_name FROM information_schema.columns WHERE table_name='employees' AND column_name='shift_id'`,
		);
		if (res.rows.length > 0) {
			console.log("Migrating existing shift_id data...");
			await client.query(
				`UPDATE "employees" SET "shift_ids" = jsonb_build_array("shift_id") WHERE "shift_id" IS NOT NULL`,
			);
			await client.query(`ALTER TABLE "employees" DROP COLUMN "shift_id"`);
		}

		await client.query("COMMIT");
		console.log("Migration successful!");
	} catch (e) {
		await client.query("ROLLBACK");
		console.error("Migration failed:", e);
	} finally {
		client.release();
		pool.end();
	}
}

run();
