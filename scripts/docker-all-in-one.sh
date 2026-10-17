#!/bin/sh
set -eu

export PGDATA="${PGDATA:-/var/lib/postgresql/data}"
export DATABASE_URL="${DATABASE_URL:-postgres://${DB_USER:-adms}:${DB_PASSWORD:-adms123}@127.0.0.1:5432/${DB_NAME:-adms_db}}"
export REDIS_HOST="${REDIS_HOST:-127.0.0.1}"
export REDIS_PORT="${REDIS_PORT:-6379}"
export WORKER_PORT="${WORKER_PORT:-8888}"

postgres_pid=""
redis_pid=""

is_local_db=0
case "$DATABASE_URL" in
	*@127.0.0.1*|*@localhost*)
		is_local_db=1
		;;
esac

is_local_redis=0
if [ "$REDIS_HOST" = "127.0.0.1" ] || [ "$REDIS_HOST" = "localhost" ]; then
	is_local_redis=1
fi

if [ -n "${REDIS_URL:-}" ]; then
	REDIS_HOST="$REDIS_URL"
fi

if [ "$is_local_db" -eq 1 ]; then
	mkdir -p "$PGDATA" /run/postgresql
	chown -R postgres:postgres "$PGDATA" /run/postgresql
	if [ ! -s "$PGDATA/PG_VERSION" ]; then
		password_file="$(mktemp)"
		printf '%s' "${DB_PASSWORD:-adms123}" > "$password_file"
		chown postgres:postgres "$password_file"
		su-exec postgres initdb -D "$PGDATA" --username="${DB_USER:-adms}" --pwfile="$password_file"
		rm -f "$password_file"
	fi
	su-exec postgres postgres -D "$PGDATA" -h 127.0.0.1 &
	postgres_pid=$!
fi

if [ "$is_local_redis" -eq 1 ]; then
	mkdir -p /var/lib/redis
	chown -R redis:redis /var/lib/redis
	su-exec redis redis-server --bind 127.0.0.1 --appendonly yes --dir /var/lib/redis &
	redis_pid=$!
fi

cleanup() {
	for pid in "${web_pid:-}" "${worker_pid:-}" "${redis_pid:-}" "${postgres_pid:-}"; do
		[ -n "$pid" ] && kill -TERM "$pid" 2>/dev/null || true
	done
	wait || true
}
trap cleanup INT TERM EXIT

if [ "$is_local_db" -eq 1 ]; then
	until pg_isready -h 127.0.0.1 -U "${DB_USER:-adms}" -d postgres >/dev/null 2>&1; do sleep 1; done
	if ! su-exec postgres psql -h 127.0.0.1 -U "${DB_USER:-adms}" -d postgres -tAc "SELECT datname FROM pg_database" | grep -Fxq "${DB_NAME:-adms_db}"; then
		su-exec postgres createdb -h 127.0.0.1 -U "${DB_USER:-adms}" "${DB_NAME:-adms_db}"
	fi
else
	until node -e "const net = require('net'); const u = new URL(process.env.DATABASE_URL); const s = net.createConnection({ host: u.hostname, port: Number(u.port) || 5432 }, () => { s.end(); process.exit(0); }); s.on('error', () => process.exit(1));" >/dev/null 2>&1; do
		echo "[zeabur/external-db] Waiting for database to be ready..."
		sleep 2
	done
fi

if [ "$is_local_redis" -eq 1 ]; then
	until redis-cli -h 127.0.0.1 ping >/dev/null 2>&1; do sleep 1; done
else
	until node -e "const net = require('net'); const h = process.env.REDIS_HOST; if (h.startsWith('redis://') || h.startsWith('rediss://')) { const u = new URL(h); const s = net.createConnection({ host: u.hostname, port: Number(u.port) || 6379 }, () => { s.end(); process.exit(0); }); s.on('error', () => process.exit(1)); } else { const s = net.createConnection({ host: h, port: Number(process.env.REDIS_PORT) || 6379 }, () => { s.end(); process.exit(0); }); s.on('error', () => process.exit(1)); }" >/dev/null 2>&1; do
		echo "[zeabur/external-redis] Waiting for redis to be ready..."
		sleep 2
	done
fi

node packages/database/migrate.js
node packages/database/bootstrap-admin.js
node apps/worker/dist/index.js &
worker_pid=$!
node apps/web/server.js &
web_pid=$!

pids="$web_pid $worker_pid"
[ -n "$redis_pid" ] && pids="$pids $redis_pid"
[ -n "$postgres_pid" ] && pids="$pids $postgres_pid"
wait -n $pids
exit 1
