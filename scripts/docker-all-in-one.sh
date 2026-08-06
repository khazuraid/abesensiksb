#!/bin/sh
set -eu

export PGDATA="${PGDATA:-/var/lib/postgresql/data}"
export DATABASE_URL="${DATABASE_URL:-postgres://${DB_USER:-adms}:${DB_PASSWORD:-adms123}@127.0.0.1:5432/${DB_NAME:-adms_db}}"
export REDIS_HOST="127.0.0.1"
export REDIS_PORT="6379"
export WORKER_PORT="8888"

mkdir -p "$PGDATA" /var/lib/redis /run/postgresql
chown -R postgres:postgres "$PGDATA" /run/postgresql
chown -R redis:redis /var/lib/redis

if [ ! -s "$PGDATA/PG_VERSION" ]; then
	password_file="$(mktemp)"
	printf '%s' "${DB_PASSWORD:-adms123}" > "$password_file"
	chown postgres:postgres "$password_file"
	su-exec postgres initdb -D "$PGDATA" --username="${DB_USER:-adms}" --pwfile="$password_file"
	rm -f "$password_file"
fi

su-exec postgres postgres -D "$PGDATA" -h 127.0.0.1 &
postgres_pid=$!
su-exec redis redis-server --bind 127.0.0.1 --appendonly yes --dir /var/lib/redis &
redis_pid=$!

cleanup() {
	for pid in "${web_pid:-}" "${worker_pid:-}" "$redis_pid" "$postgres_pid"; do
		[ -n "$pid" ] && kill -TERM "$pid" 2>/dev/null || true
	done
	wait || true
}
trap cleanup INT TERM EXIT

until pg_isready -h 127.0.0.1 -U "${DB_USER:-adms}" -d postgres >/dev/null 2>&1; do sleep 1; done
if ! su-exec postgres psql -h 127.0.0.1 -U "${DB_USER:-adms}" -d postgres -tAc "SELECT datname FROM pg_database" | grep -Fxq "${DB_NAME:-adms_db}"; then
	su-exec postgres createdb -h 127.0.0.1 -U "${DB_USER:-adms}" "${DB_NAME:-adms_db}"
fi
until redis-cli -h 127.0.0.1 ping >/dev/null 2>&1; do sleep 1; done

node packages/database/migrate.js
node packages/database/bootstrap-admin.js
node apps/worker/dist/index.js &
worker_pid=$!
node apps/web/server.js &
web_pid=$!

wait -n "$web_pid" "$worker_pid" "$redis_pid" "$postgres_pid"
exit 1
