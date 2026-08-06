# ADMS — Calm Clinical Operations

## 1. Visual Theme & Atmosphere
ADMS adalah ruang kerja operasional untuk penggunaan berulang, bukan situs pemasaran. Arah visual tenang, klinis, terpercaya, dan presisi: latar off-white dingin, permukaan putih bersih, struktur garis halus, satu aksen hijau kesehatan. Kepadatan informasi tinggi tetapi tetap mudah dipindai. Tidak ada dekorasi yang tidak membantu keputusan operator.

## 2. Color
- Canvas: `#F3F6F4`
- Surface: `#FFFFFF`
- Subtle surface: `#EAF0ED`
- Primary ink: `#14211D`
- Secondary ink: `#53635D`
- Border: `#D5DED9`
- Strong border: `#AEBDB6`
- Primary: `#087066`
- Primary hover: `#05584F`
- Success: `#23734B`
- Warning: `#946617`
- Danger: `#A9433D`

Gunakan warna semantik melalui token. Hijau adalah satu-satunya aksen produk. Status selalu memakai teks atau ikon selain warna.

## 3. Typography
- UI/body: `Inter`, fallback `Helvetica Neue`, Arial, sans-serif.
- Data: `SFMono-Regular`, Consolas, monospace; gunakan tabular figures.
- Body desktop `14px`; mobile `16px` untuk input dan teks penting.
- Display hierarchy berbasis weight 600–700, tracking rapat, bukan ukuran yang berlebihan.
- Label selalu sentence case kecuali label navigasi kecil yang memakai uppercase dan tracking luas.

## 4. Spacing & Grid
- Sistem dasar 4px; tier utama 8 / 12 / 16 / 20 / 24 / 32 / 48.
- Content max-width `1360px`, gutter mobile 16px, tablet 20px, desktop 28px.
- Sidebar desktop 252px; konten utama tidak boleh tertutup shell tetap.
- Target sentuh minimum 44×44px.

## 5. Layout & Composition
- Desktop: sidebar permanen + utility bar ringkas + canvas konten.
- Mobile: app bar tetap + drawer; konten satu kolom dan aksi inti lebih dulu.
- Header layar memiliki eyebrow/konteks, satu judul, deskripsi singkat, maksimal satu CTA utama.
- Filter terpisah dari CTA. Data besar tetap tabel desktop; mobile memakai scroll terarah atau representasi ringkas tanpa menghilangkan fungsi.
- Cards hanya untuk mengelompokkan relasi; jangan membungkus setiap elemen.

## 6. Components
- Radius: 4px kontrol kecil, 8px surface, 12px sheet mobile. Tidak ada pill besar untuk tombol.
- Buttons: primary hijau solid; secondary putih ber-border; danger terpisah jelas. Semua memiliki hover, focus, pressed, disabled, loading.
- Fields: label terlihat, tinggi ≥44px, border kuat, focus ring 3px transparan, error di bawah field.
- Tables: header subtle, garis baris halus, angka tabular, sticky header hanya bila scroll container jelas.
- Status: compact badge dengan ikon/teks; bukan warna saja.
- Dialog: modal desktop; bottom sheet mobile; focus trap dan Escape tetap wajib.
- Empty/loading/error: skeleton mengikuti bentuk data; empty menjelaskan langkah berikut; error memberi retry/recovery.

## 7. Motion & Interaction
- Durasi 140–220ms; opacity dan transform saja.
- Press feedback `translateY(1px)` atau scale maksimum `0.99` tanpa layout shift.
- Maksimal 1–2 elemen bergerak per layar. Tidak ada motion dekoratif berulang selain indikator realtime yang sangat halus.
- `prefers-reduced-motion` mematikan seluruh motion non-esensial.

## 8. Voice & Brand
Bahasa Indonesia lugas dan operasional. Gunakan istilah yang sudah dikenal operator: Pegawai, Log Absensi, Shift, Cuti, Hari Libur, Laporan, Rekap Harian, Jasa Pelayanan. Pesan sukses tenang tanpa tanda seru. Error menjelaskan sebab dan langkah pemulihan.

## 9. Anti-patterns
- Tidak ada gradient ungu/biru, glassmorphism dekoratif, glow, texture berat, atau dark cockpit.
- Tidak ada radius besar seragam, shadow tebal, layout kartu generik, emoji, atau banyak warna aksen.
- Tidak ada teks penting <12px; input mobile <16px dilarang.
- Tidak ada hardcoded warna baru dalam page/component; gunakan token/kelas sistem.
- Tidak mengubah endpoint, query key, schema, mutation, route, auth/session, socket event, ekspor, atau behavior bisnis demi visual.
- Tidak mengandalkan hover, warna, atau gestur sebagai satu-satunya affordance.
