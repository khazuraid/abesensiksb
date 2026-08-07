const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const test = require("node:test");

const migrate = readFileSync(resolve(__dirname, "migrate.js"), "utf8");
const patch = readFileSync(resolve(__dirname, "patch.sql"), "utf8");
const compose = readFileSync(
	resolve(__dirname, "../../docker-compose.yml"),
	"utf8",
);
const dockerfile = readFileSync(resolve(__dirname, "../../Dockerfile"), "utf8");
const ci = readFileSync(
	resolve(__dirname, "../../.github/workflows/ci.yml"),
	"utf8",
);
const reliability = readFileSync(
	resolve(__dirname, "migrations/0008_final_reliability.sql"),
	"utf8",
);
const shiftAssignments = readFileSync(
	resolve(__dirname, "migrations/0009_employee_shift_assignments.sql"),
	"utf8",
);
const admsDeviceClaims = readFileSync(
	resolve(__dirname, "migrations/0010_adms_device_claims.sql"),
	"utf8",
);

const chain = [
	"bootstrap.sql",
	"patch.sql",
	"migrations/0005_attendance_log_idempotency.sql",
	"migrations/0006_production_hardening.sql",
	"migrations/0007_integrity_and_reliability.sql",
	"migrations/0008_final_reliability.sql",
	"migrations/0009_employee_shift_assignments.sql",
	"migrations/0010_adms_device_claims.sql",
];

test("all-in-one deployment runs fail-closed migration before runtimes", () => {
	assert.match(compose, /^ {2}absensi:/m);
	assert.doesNotMatch(compose, /^ {2}(postgres|redis|migrate|web|worker):/m);
	assert.match(
		dockerfile,
		/ENTRYPOINT \["\/usr\/local\/bin\/docker-all-in-one"\]/,
	);
	assert.match(dockerfile, /COPY scripts\/docker-all-in-one\.sh/);
	assert.doesNotMatch(dockerfile, /apps\/web\/public/);
	const entrypoint = readFileSync(
		resolve(__dirname, "../../scripts/docker-all-in-one.sh"),
		"utf8",
	);
	assert.match(entrypoint, /node packages\/database\/migrate\.js/);
	assert.match(entrypoint, /node packages\/database\/bootstrap-admin\.js/);
	assert.doesNotMatch(migrate, /server will still attempt to start/i);
	assert.doesNotMatch(migrate, /WARNING: Failed to run/);
});

test("migration chain applies schema and production hardening in order without static credentials", () => {
	for (const file of chain) {
		assert.match(migrate, new RegExp(file.replace(/[./]/g, "\\$&")));
	}
	for (let index = 1; index < chain.length; index += 1) {
		assert.ok(
			migrate.indexOf(chain[index - 1]) < migrate.indexOf(chain[index]),
		);
	}
	assert.doesNotMatch(migrate, /seed-admin\.sql/);
});

test("compatibility patch provisions every Jaspel runtime table", () => {
	for (const table of [
		"jaspel_funds",
		"employee_jaspel_variables",
		"jaspel_distributions",
	]) {
		assert.match(patch, new RegExp(`CREATE TABLE IF NOT EXISTS "${table}"`));
	}
});

test("migration runner serializes changes and journals checksums", () => {
	assert.match(migrate, /pg_advisory_lock/);
	assert.match(migrate, /migration_history/);
	assert.match(migrate, /createHash/);
	assert.match(migrate, /BEGIN/);
});

test("CI database credentials match the PostgreSQL service", () => {
	assert.match(ci, /POSTGRES_PASSWORD: ci_password/);
	assert.match(
		ci,
		/DATABASE_URL: postgresql:\/\/adms:ci_password@127\.0\.0\.1:5432\/adms_ci/,
	);
	assert.match(ci, /count\(\*\) from migration_history.*= "8"/s);
});

test("final reliability migration upgrades existing databases", () => {
	assert.match(reliability, /attendance_effect_checkpoints/);
	assert.match(reliability, /started_at/);
	assert.match(reliability, /ALTER COLUMN "completed_at" DROP NOT NULL/);
	assert.match(reliability, /SET "status" = 'COMPLETED'/);
});

test("shift assignments persist dated periods with database range protection", () => {
	assert.match(shiftAssignments, /employee_shift_assignments/);
	assert.match(shiftAssignments, /"start_date" date NOT NULL/);
	assert.match(shiftAssignments, /"end_date" date/);
	assert.match(shiftAssignments, /"end_date" >= "start_date"/);
	assert.match(shiftAssignments, /"assignment_group_id" text NOT NULL/);
	assert.match(shiftAssignments, /EXCLUDE USING gist/);
	assert.match(shiftAssignments, /"assignment_group_id" WITH <>/);
});

test("ADMS device claims journal SN-less requests and permit one approved IP", () => {
	assert.match(admsDeviceClaims, /adms_device_claims/);
	assert.match(admsDeviceClaims, /"source_ip" varchar\(50\) NOT NULL/);
	assert.match(admsDeviceClaims, /adms_device_claim_status/);
	assert.match(admsDeviceClaims, /uq_adms_device_claims_pending_ip/);
	assert.match(admsDeviceClaims, /uq_adms_device_claims_approved_ip/);
});
