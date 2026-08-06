# Deployment satu container

Produksi/self-hosted menjalankan satu container `adms` berisi:

- Next.js UI + REST/ADMS API pada port `8080`.
- Worker BullMQ, Telegram, cron, dan Socket.IO pada port `8888`.
- PostgreSQL 16 dan Redis 7 internal; tidak diekspos ke host.

Pendekatan ini memenuhi instalasi satu-container. Untuk skala besar/high availability, pisahkan DB dan Redis.

## Menjalankan

```bash
cp .env.example .env
# Isi DB_PASSWORD, JWT_SECRET, ADMS_SECRET_KEY,
# ADMIN_EMAIL, dan ADMIN_PASSWORD.
docker compose up -d --build
docker compose ps
```

Aplikasi: `http://localhost:8080`. Realtime worker: `http://localhost:8888`.

Compose menjalankan migrasi dan membuat administrator awal otomatis sebelum web/worker aktif. Setelah boot pertama, `ADMIN_EMAIL` dan `ADMIN_PASSWORD` diabaikan jika ADMIN sudah tersedia.

## Data persisten

Pertahankan ketiga volume ini saat update/prune:

- `adms_postgres_data`
- `adms_redis_data`
- `adms_uploads`

Jangan gunakan `docker compose down -v` kecuali memang ingin menghapus seluruh data.

Backup PostgreSQL:

```bash
docker exec adms pg_dump -U adms -d adms_db -Fc > backup.dump
```

Restore:

```bash
docker exec -i adms pg_restore -U adms -d adms_db --clean --if-exists < backup.dump
```

## Update

```bash
docker compose build
docker compose up -d
docker compose logs -f absensi
```

## Verifikasi

```bash
docker ps --filter name=adms
curl -I http://localhost:8080/login
curl http://localhost:8888/health/ready
```

Container sehat hanya jika PostgreSQL, Redis, web, dan worker seluruhnya siap.

## Environment

Wajib:

```env
DB_PASSWORD=<password-kuat>
JWT_SECRET=<random-minimal-64-karakter>
ADMS_SECRET_KEY=<random-panjang>
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=<minimal-12-karakter>
WEB_PUBLIC_URL=http://localhost:8080
WORKER_PUBLIC_URL=http://localhost:8888
```

`JWT_SECRET` dipakai bersama oleh web dan worker. `WORKER_PUBLIC_URL` ditanam saat build untuk Socket.IO; gunakan URL HTTPS publik worker ketika dipasang di server/domain.

## Mesin ADMS

```text
Server Address: http(s)://domain-web
Port: 8080 atau 443 melalui reverse proxy
Path: /iclock
```

Jika `ADMS_SECRET_KEY` aktif, mesin harus mengirim `key=<ADMS_SECRET_KEY>`.

## Troubleshooting

- Container restart: `docker logs adms --tail 200`.
- Socket gagal: pastikan port/domain `8888` tersedia dan proxy mendukung WebSocket.
- Login gagal setelah update: jangan mengganti `JWT_SECRET` tanpa sengaja.
- DB kosong: periksa volume `adms_postgres_data` terpasang.
- Jangan expose PostgreSQL/Redis; keduanya hanya listen pada `127.0.0.1` di dalam container.
