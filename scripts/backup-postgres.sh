#!/usr/bin/env bash
set -euo pipefail
umask 077
: "${DATABASE_URL:?DATABASE_URL wajib diisi}"
backup_dir="${BACKUP_DIR:-./backups}"
mkdir -p "$backup_dir"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
final="$backup_dir/adms-$timestamp.dump"
tmp="$(mktemp "$backup_dir/.adms-$timestamp.XXXXXX.dump")"
trap 'rm -f "$tmp"' EXIT
dump="${PG_DUMP:-pg_dump}"
restore="${PG_RESTORE:-pg_restore}"
psql="${PSQL:-psql}"
server_version_num="$($psql "$DATABASE_URL" -Atc 'SHOW server_version_num')"
dump_version="$($dump --version)"
[[ "$server_version_num" =~ ^[0-9]+$ ]] || {
	printf 'Tidak dapat mendeteksi versi PostgreSQL\n' >&2
	exit 1
}
[[ "$dump_version" =~ ([0-9]+)\. ]] || {
	printf 'Tidak dapat mendeteksi versi pg_dump\n' >&2
	exit 1
}
dump_major="${BASH_REMATCH[1]}"
server_major=$((server_version_num / 10000))
[[ "$dump_major" -le "$server_major" ]] || {
	printf 'pg_dump major %s lebih baru dari server major %s\n' "$dump_major" "$server_major" >&2
	exit 1
}
"$dump" --format=custom --no-owner --no-acl --file="$tmp" "$DATABASE_URL"
"$restore" --list "$tmp" >/dev/null
mv "$tmp" "$final"
trap - EXIT
find "$backup_dir" -type f -name 'adms-*.dump' -mtime +"${BACKUP_RETENTION_DAYS:-14}" -delete
printf '%s\n' "$final"
