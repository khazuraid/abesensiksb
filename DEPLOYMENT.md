# 🚀 Tutorial Deploy ke VPS dengan Coolify via GitHub

## Prasyarat

- VPS (Ubuntu 22.04+) dengan minimal 2GB RAM
- Domain yang sudah pointing ke IP VPS
- Akun GitHub dengan repo ini sudah di-push

---

## 1. Install Coolify di VPS

SSH ke VPS lalu jalankan:

```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

Setelah selesai, akses Coolify di `http://IP_VPS:8000` dan buat akun admin.

---

## 2. Push Kode ke GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/USERNAME/absensi.git
git push -u origin main
```

---

## 3. Buat Dockerfile

Buat file `Dockerfile` di root project:

```dockerfile
# === BUILD STAGE ===
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/ ./packages/
COPY apps/ ./apps/

RUN pnpm install --frozen-lockfile
RUN pnpm turbo build

# === API STAGE ===
FROM node:20-alpine AS api
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/packages/ ./packages/
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/api/dist/ ./apps/api/dist/

RUN pnpm install --prod --frozen-lockfile

WORKDIR /app/apps/api
EXPOSE 3333
CMD ["node", "dist/main.js"]

# === WEB STAGE ===
FROM node:20-alpine AS web
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./.next/static
COPY --from=builder /app/apps/web/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
```

---

## 4. Buat docker-compose.prod.yml

```yaml
services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${DB_USER:-adms}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME:-adms_db}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U adms"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: unless-stopped

  api:
    build:
      context: .
      target: api
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    environment:
      DATABASE_URL: postgres://${DB_USER:-adms}:${DB_PASSWORD}@postgres:5432/${DB_NAME:-adms_db}
      REDIS_HOST: redis
      REDIS_PORT: 6379
      JWT_SECRET: ${JWT_SECRET}
      CORS_ORIGIN: ${WEB_URL}
      TELEGRAM_TOKEN: ${TELEGRAM_TOKEN:-}
      TELEGRAM_CHAT_ID: ${TELEGRAM_CHAT_ID:-}
      ADMS_SECRET_KEY: ${ADMS_SECRET_KEY:-}
      PORT: 3333
    ports:
      - "3333:3333"

  web:
    build:
      context: .
      target: web
    restart: unless-stopped
    depends_on:
      - api
    environment:
      NEXT_PUBLIC_API_URL: ${API_URL}
    ports:
      - "3000:3000"

volumes:
  postgres_data:
```

---

## 5. Setup di Coolify

### 5.1 Hubungkan GitHub

1. Buka Coolify → **Settings** → **GitHub**
2. Klik **Connect** → Authorize Coolify ke repo GitHub
3. Pilih repository `absensi`

### 5.2 Buat Project

1. **Projects** → **New Project** → Beri nama "ADMS Absensi"
2. Klik project → **New Resource**

### 5.3 Deploy Database (PostgreSQL)

1. **New Resource** → **Database** → **PostgreSQL**
2. Set password yang kuat
3. Catat connection string: `postgres://adms:PASSWORD@postgres:5432/adms_db`

### 5.4 Deploy Redis

1. **New Resource** → **Database** → **Redis**
2. Biarkan default

### 5.5 Deploy API

1. **New Resource** → **Application** → Pilih repo GitHub
2. **Build Pack**: Docker
3. **Dockerfile Location**: `./Dockerfile`
4. **Docker Build Target**: `api`
5. **Port**: `3333`
6. **Domain**: `api.domain.com`

**Environment Variables:**
```
DATABASE_URL=postgres://absensi:rHHnr9QpPKSmaxgEffctxo35EvbEDMAhhgGqxgwq2kEbsqP5bSASK6YyCNMm3Cay@postgres-internal:5432/adms_db
REDIS_HOST=redis-internal
REDIS_PORT=6379
JWT_SECRET=F6kYn6j5V7wS3p2r9m0t4h8q1s5u9e2o
CORS_ORIGIN=https://absensi.domain.com
TELEGRAM_TOKEN=8423654730:AAGzXJbN86kP4vXF78zR-0B49T72X50pWl4
TELEGRAM_CHAT_ID=-1003025671345
ADMS_SECRET_KEY=KPB6969
PORT=8888
```

### 5.6 Deploy Web (Frontend)

1. **New Resource** → **Application** → Pilih repo GitHub
2. **Build Pack**: Docker
3. **Dockerfile Location**: `./Dockerfile`
4. **Docker Build Target**: `web`
5. **Port**: `3000`
6. **Domain**: `absensi.domain.com`

**Environment Variables:**
```
NEXT_PUBLIC_API_URL=https://api.domain.com/api
```

---

## 6. Setup Auto-Deploy

Coolify otomatis deploy saat ada push ke branch `main`:

1. Di Coolify, buka resource → **Settings**
2. Pastikan **Auto Deploy** = ON
3. Branch: `main`

Sekarang setiap `git push origin main` akan trigger deploy otomatis.

---

## 7. Migrasi Database

Setelah deploy pertama, jalankan migrasi:

```bash
# SSH ke VPS
ssh user@IP_VPS

# Masuk ke container API
docker exec -it CONTAINER_API sh

# Jalankan migrasi
cd /app/packages/database
npx drizzle-kit push
```

Atau tambahkan di Dockerfile API sebelum CMD:
```dockerfile
RUN cd /app/packages/database && npx drizzle-kit push
```

---

## 8. Setting Mesin ADMS

Di mesin ZKTeco, set ADMS server:

```
Server Address: https://api.domain.com
Port: 443
```

Mesin akan otomatis connect dan push data.

---

## 9. SSL/HTTPS

Coolify otomatis generate SSL certificate via Let's Encrypt untuk domain yang sudah di-set. Pastikan:

1. Domain A record pointing ke IP VPS
2. Port 80 dan 443 terbuka di firewall

---

## 10. Monitoring

### Uptime Kuma (Opsional)

1. Di Coolify → **New Resource** → **Service** → **Uptime Kuma**
2. Tambahkan monitor:
   - `https://api.domain.com/api` (API health)
   - `https://absensi.domain.com` (Web)

---

## Struktur Domain

| Service | Domain | Port Internal |
|---------|--------|---------------|
| Web (Frontend) | `absensi.domain.com` | 3000 |
| API (Backend) | `api.domain.com` | 3333 |
| Mesin ADMS | `api.domain.com/iclock` | 3333 |

---

## Troubleshooting

### API tidak bisa connect ke database
```bash
# Cek apakah postgres running
docker ps | grep postgres

# Cek logs
docker logs CONTAINER_API
```

### Mesin tidak connect
- Pastikan port 443 terbuka
- Pastikan `ADMS_SECRET_KEY` di .env sama dengan yang di-set di mesin (query param `key`)
- Cek log: `docker logs CONTAINER_API | grep iclock`

### Build gagal
```bash
# Build manual di VPS
cd /path/to/repo
docker build --target api -t adms-api .
docker build --target web -t adms-web .
```
