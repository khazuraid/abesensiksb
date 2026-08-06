# 🏗️ Rancangan Sistem Absensi ADMS (Attendance Management System)

Sistem ini adalah platform manajemen absensi modern tingkat enterprise yang mengintegrasikan perangkat keras absensi berbasis protokol **ADMS (Automatic Data Master Server)** dengan infrastruktur cloud yang scalable.

---

## 1. 🚀 Arsitektur Teknologi & Stack
Sistem menggunakan arsitektur **Monorepo (Turborepo)** untuk sinkronisasi tipe data antara backend, frontend, dan database.

### 1.1 Backend (Core API & Protocol Handler)
| Komponen | Teknologi | Fungsi |
| :--- | :--- | :--- |
| **Framework** | NestJS (Fastify) | Engine utama API dan handler protokol ADMS. |
| **Database** | PostgreSQL + Drizzle ORM | Storage relasional utama dengan performa tinggi. |
| **Queue & Cache** | Redis + BullMQ | Menangani traffic log tinggi dan antrean perintah mesin. |
| **Storage** | MinIO (S3 Compatible) | Menyimpan foto capture absensi dari mesin. |
| **Validation** | Zod | Validasi ketat untuk payload mesin dan input admin. |
| **Notifications** | Nestjs-Telegraf | Integrasi bot Telegram untuk report & alert real-time. |

### 1.2 Frontend (Admin Dashboard)
| Komponen | Teknologi | Fungsi |
| :--- | :--- | :--- |
| **Framework** | Next.js 14+ (App Router) | Antarmuka panel admin yang SEO-friendly & reaktif. |
| **UI Library** | shadcn/ui + Tailwind CSS | Komponen modern dengan estetika **Premium Glassmorphism**. |
| **Data Management** | TanStack Query | Fetching data otomatis & auto-refresh log absensi. |
| **Tables** | TanStack Table | Grid data yang powerful untuk ribuan log pegawai. |
| **State Management** | Zustand | Global state untuk filter, session, dan UI preferences. |

### 1.3 Infrastructure & DevOps
| Komponen | Teknologi | Fungsi |
| :--- | :--- | :--- |
| **Deployment** | Docker + Coolify | Orchestration dan auto-deploy via GitHub. |
| **Reverse Proxy** | Traefik | Routing domain, SSL otomatis, dan load balancing. |
| **Monitoring** | Sentry & Uptime Kuma | Pelacakan bug dan monitoring uptime server/database. |
| **Security** | Cloudflare WAF | Proteksi DDoS dan penyembunyian IP VPS. |

---

## 2. 📊 Skema Database (Drizzle ORM)
Database dirancang untuk skalabilitas dan integritas data yang tinggi.

### 2.1 Tabel Utama
1.  **`users`**: Akun sistem dengan RBAC (Admin, HRD, Pegawai).
2.  **`employees`**: Profil pegawai lengkap (NIP, Department, Biometric ID).
3.  **`shifts`**: Konfigurasi jam kerja, hari libur, dan toleransi keterlambatan.
4.  **`devices`**: Inventaris mesin absen (Serial Number, Status Online, Heartbeat).
5.  **`attendance_logs`**: History kehadiran beserta link foto dari MinIO.
6.  **`audit_logs`**: Tracking aktivitas perubahan data oleh admin.

---

## 3. 📡 Integrasi ADMS (Automatic Data Master Server)
Berbeda dengan API standar, mesin ADMS (seperti X609) berkomunikasi menggunakan payload teks (key-value) melalui HTTP.

### 3.1 Flow Komunikasi
-   **Handshake**: Perangkat mengirim Serial Number ke `/iclock/cdata` untuk registrasi.
-   **Data Push**: Perangkat mengirimkan log transaksi dalam format string. Backend mem-parsing string tersebut menggunakan logic khusus sebelum divalidasi oleh Zod.
-   **Command Queue (BullMQ)**: Perintah seperti `Remote Reboot`, `Clear Log`, atau `Sync User` dimasukkan ke Redis Queue dan diambil oleh mesin saat melakukan polling ke `/iclock/getrequest`.

---

## 4. 🗺️ Roadmap Pengembangan

### Fase 1: Fondasi & Infrastruktur (Selesai)
- [x] Setup Turborepo, NestJS, dan Next.js.
- [x] Konfigurasi Drizzle & PostgreSQL.
- [x] Setup Docker Compose untuk Redis, MinIO, dan PostgreSQL.

### Fase 2: Core Business Logic (In Progress)
- [ ] **ADMS Engine**: Parser untuk string log mesin dan handler `/iclock/cdata`.
- [ ] **Employee Management**: CRUD Pegawai dan sinkronisasi ke mesin.
- [ ] **Shift Engine**: Logic kalkulasi jam kerja (Telat, Lembur, Pulang Awal).

### Fase 3: Real-time & Notifikasi
- [ ] **Telegram Bot**: Notifikasi harian ke grup/pribadi saat pegawai absen.
- [ ] **Live Dashboard**: Webhook/Polling untuk update log tanpa refresh.
- [ ] **Command Center**: UI untuk mengirim perintah ke mesin secara remote.

### Fase 4: Optimization & Security
- [ ] Implementasi Cloudflare WAF.
- [ ] Sentry Integration untuk tracking error ADMS parser.
- [ ] Load testing menggunakan ribuan data log simulasi.

---

## 5. 🖥️ Struktur Halaman Dashboard (Frontend)

Setiap halaman akan menggunakan desain **Glassmorphism** dengan komponen dari **shadcn/ui**.

### 5.1 Dashboard (Overview)
- **Summary Cards**: Statistik real-time (Hadir, Terlambat, Mesin Online, Total Pegawai).
- **Live Feed**: Stream log absensi terbaru beserta foto capture.
- **Device Monitor**: Status konektivitas seluruh mesin di berbagai lokasi.
- **Attendance Chart**: Visualisasi tren kehadiran mingguan.

### 5.2 Data Pegawai (Employees)
- **Employee Grid/Table**: Manajemen NIP, Nama, Jabatan, dan Departemen.
- **Biometric Status**: Indikator apakah data fingerprint/wajah sudah tersinkron ke mesin.
- **Action Center**: Fitur untuk "Push User" ke perangkat secara massal.

### 5.3 Log Absensi (Attendance Logs)
- **Data Audit**: Filter mendalam berdasarkan tanggal, lokasi, dan status kehadiran.
- **Photo Verification**: Menampilkan foto yang di-upload mesin ke MinIO saat scan.
- **Export Tools**: Download laporan dalam format Excel/PDF yang siap cetak.

### 5.4 Manajemen Perangkat (Devices)
- **Device Registry**: Pendaftaran mesin baru melalui Serial Number.
- **Terminal Command**: Kirim perintah remote (Reboot, Sync Time, Clear All Data).
- **Handshake Log**: Monitoring komunikasi mentah ADMS untuk debugging.

### 5.5 Jadwal & Shift (Shifts)
- **Shift Editor**: Pengaturan jam masuk, pulang, dan toleransi keterlambatan.
- **Work Calendar**: Pengaturan hari libur dan jadwal shift khusus pegawai.

### 5.6 Notifikasi Bot (Telegram)
- **Bot Config**: Pengaturan Token API dan Chat ID.
- **Alert System**: Konfigurasi otomatisasi laporan harian dan peringatan mesin offline.

---

## 6. 🎨 Standar Desain UI/UX
-   **Tema**: Dark Mode default dengan aksen warna vibrant (Emerald/Cyan).
-   **Material**: Efek kaca (`backdrop-filter: blur()`), border tipis, dan bayangan lembut.
-   **Tipografi**: Menggunakan font modern (Inter/Outfit).
-   **Interaksi**: Transisi halus dan micro-animations pada tombol/card.

---

## 🛠️ Standar Pengembangan untuk AI
1.  **Type Safety**: Gunakan shared-types antar apps/web dan apps/worker.
2.  **Error Handling**: Gunakan Sentry untuk menangkap kegagalan parsing data mesin.
3.  **Responsive Design**: Pastikan Dashboard nyaman digunakan di Mobile/Tablet.
4.  **Security**: Semua endpoint API internal wajib memakai session JWT dan RBAC.

---

## 7. 💡 Fitur Fungsional Tambahan (Enterprise Grade)
1. **Offline Tolerance & Bulk Sync:** 
   Antisipasi mesin IoT kehilangan koneksi internet. Saat *online* kembali, mesin akan mem-*push* ribuan log secara beruntun. Backend harus disiapkan dengan *Bulk Insert* logic (via Drizzle `insertMany`) untuk memproses *batch* payload tanpa time-out.
2. **Geo-Tagging & Map View:**
   Integrasi komponen peta interaktif (`react-leaflet`) di Dashboard untuk memonitor lokasi mesin yang tersebar secara geografis. Pin akan berubah warna hijau/merah berdasarkan status _heartbeat_ / koneksi TCP mesin secara *real-time*.
3. **Database Connection Pooling:**
   Implementasi **PgBouncer** untuk mencegah kelebihan beban pada PostgreSQL saat ribuan mesin ADMS terkoneksi bersamaan pada jam masuk kerja (08:00 pagi).
