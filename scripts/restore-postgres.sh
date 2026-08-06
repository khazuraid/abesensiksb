#!/usr/bin/env bash
set -euo pipefail
umask 077
: "${DATABASE_URL:?DATABASE_URL wajib diisi}"
backup="${1:?Usage: restore-postgres.sh /path/to/backup.dump}"
[[ -r "$backup" ]] || { printf 'Backup tidak dapat dibaca: %s\n' "$backup" >&2; exit 1; }
"${PG_RESTORE:-pg_restore}" --list "$backup" >/dev/null
"${PG_RESTORE:-pg_restore}" --clean --if-exists --no-owner --no-acl --single-transaction --exit-on-error --dbname="$DATABASE_URL" "$backup"
printf 'Restore selesai: %s\n' "$backup"
