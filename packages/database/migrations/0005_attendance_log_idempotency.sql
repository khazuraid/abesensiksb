CREATE UNIQUE INDEX IF NOT EXISTS "uq_attendance_employee_timestamp_type"
	ON "attendance_logs" ("employee_id", "timestamp", "type");