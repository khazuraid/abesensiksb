# ADMS Absensi

Monorepo pnpm/Turborepo untuk absensi ADMS.

## Arsitektur

- `apps/web`: Next.js UI + Route Handlers untuk seluruh REST API, auth cookie HttpOnly, endpoint ADMS `/iclock/*`, uploads.
- `apps/worker`: proses long-lived BullMQ, Telegram cron/polling, Socket.IO.
- `packages/database`: Drizzle schema, migration, PostgreSQL connection.
- `packages/shared-types`: kontrak dan validasi bersama.

Runtime NestJS lama telah dihapus; domain server reusable berada di `apps/web/lib/server`.

## Development

```bash
pnpm install
pnpm run dev
```

Web default `http://localhost:3000`; worker default `http://localhost:8888`. PostgreSQL/Redis lokal dapat dijalankan dengan `docker compose up -d postgres redis`.

## Quality gate

```bash
pnpm run lint
pnpm run test
pnpm run build
pnpm audit --prod --audit-level high
```

Tes server mencakup auth/cookie, request hardening, RBAC/error envelope, parity resource REST/ADMS, serta autentikasi Socket.IO/webhook.

Deployment: lihat `DEPLOYMENT.md` dan `docker-compose.yml`.
