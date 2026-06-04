import "dotenv/config";
import bcrypt from "bcrypt";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { users } from "./src/schema";

async function seed() {
	const pool = new Pool({
		connectionString:
			process.env.DATABASE_URL ||
			"postgres://adms:adms123@localhost:5432/adms_db",
	});
	const db = drizzle(pool);

	const password = await bcrypt.hash("admin123", 10);

	await db
		.insert(users)
		.values({
			email: "admin@admin.com",
			password,
			name: "Administrator",
			role: "ADMIN",
		})
		.onConflictDoNothing({ target: users.email });

	console.log("✅ Admin user created: admin@admin.com / admin123");

	await pool.end();
}

seed().catch((e) => {
	console.error(e);
	process.exit(1);
});
