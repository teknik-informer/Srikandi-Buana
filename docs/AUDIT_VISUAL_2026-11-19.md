# Audit Visual & UI/UX — Srikandi Buana

**Tanggal:** 19 November 2026
**Cabang:** `arena/5508dfd5-srikandi-buana` (baseline `a578737`)
**Objek:** seluruh permukaan situs: 25 halaman publik + area administrasi (`/dashboard/*`, `/masuk`), komponen bersama, sistem desain, dan aset merek.

## 1. Metode dan batasan

Audit ini menggabungkan tiga sumber bukti:

1. **Render nyata**: halaman dijalankan lokal dari commit yang sama dengan deployment produksi, lalu diambil tangkapan layar desktop 1440×900 dan mobile 390×844 (Chrome headless). Halaman yang diperiksa: beranda, program, galeri, produk, kontak, kabar, dan masuk.
2. **Produksi langsung**: konten dan metadata diperiksa pada `https://srikandibuana.vercel.app` (deployment produksi Vercel dari commit `a578737`).
3. **Pemeriksaan kode**: `globals.css`, `public.css`, `login.css`, preset tema, komponen navigasi, `BrandLogo`, `WorkspaceShell`, dan skrip verifikasi yang sudah ada.

**Batasan penting:** area `/dashboard` dilindungi autentikasi dan database, sehingga tidak di-screenshot langsung. Penilaian dashboard didasarkan pada kode komponen, token CSS, dan kontrak visual yang diuji oleh `verify-visual-compositions.mjs`. Data lokal kosong sehingga beberapa tangkapan layar menampilkan *empty state*; produksi juga dikonfirmasi memiliki `/kabar`, `/galeri`, dan `/produk` tanpa konten terbitan.

## 2. Ringkasan eksekutif

**Skor keseluruhan: 7,2 / 10 — "rapi, kredibel, tetapi belum terasa hidup".**

Situs ini sudah memiliki fondasi visual yang jauh lebih baik daripada aplikasi internal pada umumnya: identitas hijau–emas konsisten, tipografi editorial berani, tata letak responsif, serta perhatian serius pada aksesibilitas dan SEO. Masalah utama bukanlah "situs rusak", melainkan **konten visual yang kosong**, **ukuran teks yang terlalu kecil**, dan **pengulangan pola halaman** yang membuat seluruh situs terasa seperti satu templat yang dipakai berulang kali.

| Dimensi | Skor | Catatan singkat |
|---|---:|---|
| Identitas & konsistensi merek | 8,5 | Palet hijau emerald + amber dan logo sangat konsisten |
| Hierarki & tipografi | 6,5 | Serif besar bagus, tetapi teks pendukung 7–12 px dan Arial generik |
| Komposisi & tata letak | 8,0 | Grid disiplin, whitespace lapang, kartu rapi |
| Kekayaan konten visual | 5,0 | Satu ilustrasi dipakai ulang; galeri/produk/kabar kosong |
| Responsivitas | 8,5 | Tidak ada overflow horizontal di 390 px dan 1440 px |
| Aksesibilitas | 8,0 | Skip link, breadcrumb, keyboard mega-menu, focus ring, reduced motion |
| Interaksi & umpan balik | 7,0 | Pencarian ⌘K dan toast baik; transisi/status masih minim |
| Tampilan administrasi | 7,5 | Token workspace sudah hijau, tabel/number rapi; masih padat |
| Performa aset | 6,5 | Hero 264 KB dan logo PNG 236 KB untuk ukuran tampilan kecil |
| Maintainability CSS | 5,0 | 77 KB `globals.css` + 76 KB `public.css`, token ditimpa beberapa lapis |

## 3. Kelebihan yang sudah kuat

1. **Identitas merek dewasa dan khas.** Hijau gelap (`#123d32` / emerald-950), aksen amber, logo berbentuk sayur, dan tipografi serif miring menghasilkan kesan organik tetapi tetap profesional. Tidak terlihat seperti template admin generik.
2. **Beranda memiliki "hero" yang meyakinkan.** Foto lanskap/kebun full-bleed dengan gradient overlay, komposisi cahaya hangat, kicker, judul tiga baris, tiga CTA dengan hierarki jelas, dan kredit gambar — ini sudah memenuhi standar situs institusi modern.
3. **Sistem grid yang disiplin.** Kontainer 1240–1440 px, ritme section ~90 px, kartu dengan padding konsisten, dan pembagian kolom 3/4 untuk program serta 2 kolom untuk teks. Hasilnya tenang dan mudah dipindai.
4. **Responsivitas nyata.** Breakpoint 1200/1000/700 px, menu mobile, penyesuaian hero menjadi satu kolom, serta `overflow-x: clip`. Pengukuran DOM menunjukkan `scrollWidth === innerWidth` pada 390 px dan 1440 px.
5. **Aksesibilitas bukan sekadar label.** `skip-link`, breadcrumb, `aria-current`, mega-menu dengan ArrowLeft/ArrowRight/ArrowDown/Escape, fokus yang dikembalikan, `focus-visible`, `prefers-reduced-motion`, dan stylesheet print semuanya hadir.
6. **Halaman masuk dirancang dengan empati.** Split-screen foto + formulir, isi singkat, catatan privasi/OTP, jalur bantuan, dan tautan kebijakan. Ini mengurangi kecemasan pengguna sebelum login.
7. **Fondasi non-visual solid.** Metadata/canonical per halaman, JSON-LD Organization/WebSite, kartu sosial, PWA/offline, serta indikator koneksi mendukung persepsi "situs yang dikelola dengan serius".
8. **Dashboard sudah mengikuti bahasa visual yang sama.** Token workspace menggunakan emerald, angka tabular, status badge, search, dan mega-menu; bukan warna abu-abu stok shadcn.

## 4. Kekurangan dan dampaknya

### Prioritas 0 — mengganggu kredibilitas

| Masalah | Bukti | Dampak |
|---|---|---|
| Halaman publik penting kosong | `/kabar` = **0 publikasi**, `/galeri` = belum ada dokumentasi, `/produk` = belum ada produk yang dipublikasikan (dikonfirmasi di produksi) | Pengunjung yang datang lewat CTA "Kabar", "Galeri", atau "Jelajahi produk" langsung menemui halaman kosong. Cerita "perempuan tani" tidak didukung bukti visual. |
| Satu gambar dipakai berulang | `/images/pertanian-premium-v1.webp` dipakai di beranda dan halaman masuk | Kesan stok/AI-generated; tidak ada foto kegiatan, anggota, atau hasil tani yang memperkuat kepercayaan. |
| Teks pendukung terlalu kecil | Terukur: kicker **7–9 px**, breadcrumb **10 px**, metadata kartu **10 px**, isi kartu **12 px**, navigasi desktop **12 px**, body global **14 px Arial** | Sulit dibaca di HP dan proyektor rapat; mengurangi kepadatan informasi yang sebenarnya penting. |

### Prioritas 1 — membuat situs terasa monoton

1. **Semua halaman memakai satu resep:** pita hijau gelap + kicker + judul serif besar + deskripsi, lalu deretan kartu putih. Strategi ini konsisten, tetapi halaman profil, visi-misi, program, kabar, dan kebijakan menjadi sulit dibedakan secara visual.
2. **Tipografi tidak memanfaatkan aset yang sudah ada.** Registry `src/lib/fonts/registry.ts` berisi puluhan font `next/font/google`, tetapi tidak pernah dipasang di layout; `:root` justru menimpa `--font-sans` menjadi Arial. Pilihan font di preferensi karena itu tidak memberi dampak visual nyata.
3. **CSS bertumpuk dan sulit dirawat.** `globals.css` (77 KB) dan `public.css` (76 KB) sebagian besar adalah baris minified panjang. Token didefinisikan di `:root`, ditimpa di baris ~305, lalu ditimpa lagi untuk `.workspace-shell` di baris ~358. Perubahan kecil berisiko merusak tema lain.
4. **Target sentuh kecil.** Sekitar 25–29 tautan/tombol di beranda memiliki tinggi < 24 px (footer, tautan teks, breadcrumb). Ini di bawah rekomendasi ukuran target WCAG 2.2 dan tidak nyaman di HP.
5. **Aset belum dioptimalkan.** Logo wordmark PNG 236 KB dipakai pada ukuran tampilan ~180 px; versi WebP 70 KB sudah tersedia. Hero 264 KB dan semua `<img>` dimuat tanpa `loading="lazy"`/`srcset`, sehingga galeri masa depan akan langsung mahal.
6. **Tema preset di luar identitas.** `brutalist`, `soft-pop`, dan `tangerine` memperkenalkan merah/purple/oranye yang bertentangan dengan merek hijau–emas. Tidak salah secara teknis, tetapi melemahkan konsistensi jika dipakai pengguna admin.

### Prioritas 2 — peluang pengembangan

1. Dashboard kaya fungsi tetapi padat; belum ada "langkah berikutnya" yang memberi arah kepada pengelola baru.
2. Hampir tidak ada *micro-interaction*: skeleton loading, transisi masuk kartu, progress simpan, atau animasi status. `prefers-reduced-motion` sudah disiapkan, jadi aman untuk menambah animasi halus.
3. *Empty state* informatif tetapi pasif: belum mengarahkan ke aksi nyata seperti "Unggah foto pertama" atau "Tambah produk pertama" bagi pengelola.
4. Belum ada pemisahan visual yang kuat antara konten "informasi publik" dan "ruang pengelola" pada halaman yang sama.

## 5. Perbaikan yang diterapkan di cabang ini

Perbaikan kecil, aman, dan langsung terlihat sudah dikerjakan:

| Perubahan | Berkas | Dampak |
|---|---|---|
| Breadcrumb `/produk` salah menampilkan "Rincian kabar" → "Katalog produk" | `src/app/_components/public/utilities.tsx` | Jejak halaman sesuai konten |
| Tautan syarat/privasi/bantuan di halaman masuk menjadi blok dan menyisakan titik "·" berbaris sendiri | `src/app/masuk/login.css` | Footer login rapi; tautan tetap inline dengan underline halus |
| Logo default `BrandLogo` dari `wordmark.png` (236 KB) → `wordmark.webp` (70 KB) | `src/components/brand-logo.tsx` | Penghematan ~70% untuk setiap header/footer yang memuat logo |

Verifikasi: `npm run typecheck`, `verify-seo.mjs`, `verify-pwa.mjs`, `verify-visual-compositions.mjs`, `tests/navigation-compatibility.mjs`, dan `tests/terminology-consistency.mjs` semuanya lolos setelah perubahan.

## 6. Rekomendasi desain dan pengembangan

### 6.1 Sistem desain ringkas yang disarankan

```css
:root {
  --brand-ink: #123d32;        /* teks utama, header, CTA */
  --brand-green: #0f513d;      /* aksi & tautan */
  --brand-mint: #e8f4ee;       /* permukaan sekunder */
  --brand-amber: #f2c14e;      /* aksen/urgent, bukan teks kecil */
  --surface: #fafaf9;          /* paper */
  --surface-raised: #ffffff;
  --line: #e7e5e4;
  --text: #1c2b26;
  --text-muted: #5b6b64;       /* minimal 4.5:1 di atas paper */

  --step--1: 0.875rem;  /* 14 px: meta */
  --step-0: 1rem;       /* 16 px: body */
  --step-1: 1.25rem;    /* 20 px: subjudul kartu */
  --step-2: 2.25rem;    /* 36 px: h2 */
  --step-3: 4rem;       /* 64 px: hero */

  --space-3: 0.75rem; --space-4: 1rem; --space-6: 1.5rem;
  --space-8: 2rem; --space-12: 3rem; --space-16: 4rem;
  --radius-card: 14px; --radius-button: 10px;
}
```

Aturan pemakaian:
- **Body minimal 16 px**, metadata minimal 14 px, label kecil boleh 11 px tetapi hanya untuk kicker dengan `letter-spacing` dan kontras tinggi.
- **Tombol minimal 44×44 px**; tautan teks diberi padding agar area sentuh ≥ 24 px.
- Kartu: padding 24 px, radius 14 px, border 1 px, hover naik 2 px + bayangan sangat lembut (120 ms, `ease-out`).
- Gunakan satu font sans modern (mis. Geist/Inter/Plus Jakarta Sans) + satu serif (Lora/Playfair Display) untuk kutipan. Muat **maksimal dua** font, bukan puluhan.

### 6.2 Strategi konten visual (dampak terbesar)

1. Ambil 8–12 foto autentik kegiatan KWT: training budidaya, rapat anggota, kebun, panen, produk. Simpan sebagai WebP di `public/images/` dengan nama deskriptif.
2. Isi minimal 3 kabar dan 3 produk contoh yang disetujui pengelola, sehingga CTA beranda tidak menuju halaman kosong.
3. Tambahkan pada beranda satu band "Dampak Kami" dengan angka **hanya jika bersumber dari data nyata** (jumlah anggota terverifikasi, program aktif, kegiatan tahun ini). Jangan menampilkan angka dekoratif.
4. Galeri memakai masonry 3 kolom + lightbox (komponen sudah ada di CSS), dengan keterangan gambar yang informatif.

### 6.3 Pengalaman halaman

- Beranda: selain hero, tambahkan satu blok "Cerita terkini" dengan foto besar + kutipan anggota, dan satu pita "Program prioritas" dengan progress nyata dari `getProgramProgress`.
- Halaman dalam: variasi pembuka — sebagian pakai foto latar, sebagian pakai ilustrasi garis, sebagian komposisi dua kolom — agar tidak semua identik.
- Empty state: sertakan ilustrasi khas + satu CTA (untuk pengunjung: "Lihat program"; untuk pengelola: "Tambah data pertama").
- Pencarian ⌘K sudah baik; tambahkan riwayat pencarian dan hasil terkelompok.

### 6.4 Dashboard/admin

- Tambahkan kartu "Langkah berikutnya" berbasis peran (verifikasi anggota, notulen belum ditandatangani, pesanan menunggu) menggunakan data yang sudah ada.
- Gunakan skeleton saat data dimuat dan toast ringkas saat simpan berhasil/gagal (Sonner sudah terpasang).
- Kelompokkan sidebar terlalu panjang menjadi 6 aplikasi sesuai arsitektur v1: Platform Core, Organization, Agriculture, Business, BI, Public.
- Sediakan mode "Ringkas" yang menyembunyikan label sekunder pada layar < 1280 px.

### 6.5 Kinerja & teknis

- Ganti `<img>` kritis dengan `next/image` (`priority` untuk hero, `sizes` responsif, `lazy` untuk galeri).
- Konsolidasikan token warna: satu sumber kebenaran, lalu preset tema hanya mengubah 6–8 variabel. Hapus duplikasi `:root` di `globals.css`.
- Pilih satu font, pasang `fontVars` di layout, hapus font registry yang tidak dipakai.
- Target: LCP < 2,5 s, CLS < 0,1, semua gambar WebP/AVIF, dan tidak ada overflow horizontal di 320–1920 px.

## 7. Roadmap yang disarankan

| Fase | Fokus | Hasil yang bisa diterima |
|---|---|---|
| **1 — Kredibilitas (1–2 minggu)** | Foto asli, isi kabar/produk, perbaikan tipografi & target sentuh | Tidak ada halaman publik kosong; body ≥ 14 px; target sentuh ≥ 24 px; galeri ≥ 6 foto |
| **2 — Sistem desain (2–3 minggu)** | Token tunggal, 2 font, CSS duplikat dibersihkan, komponen empty/loading | Satu file token; tidak ada override Arial; LCP < 2,5 s; preset tetap lolos tes visual |
| **3 — Ketertarikan (2 minggu)** | Variasi pembuka halaman, blok dampak, micro-interaction | Beranda memiliki ≥ 3 modifier section; animasi menghormati reduced motion |
| **4 — Ruang kerja (3 minggu)** | Onboarding checklist, skeleton, grouping sidebar 6 aplikasi | Tugas berikutnya muncul di dashboard; waktu ke aksi pertama turun; UAT admin lolos |

## 8. Cara mengukur keberhasilan

- **Visual:** screenshot desktop + mobile setiap rilis dan bandingkan dengan baseline ini.
- **Aksesibilitas:** `axe`/Lighthouse accessibility ≥ 95; kontras teks ≥ 4,5:1; target sentuh ≥ 24 px.
- **Kinerja:** Lighthouse performance ≥ 90 mobile untuk beranda; LCP < 2,5 s; CLS < 0,1.
- **Konten:** 0 halaman publik dengan *empty state* utama setelah fase 1.
- **Bisnis:** peningkatan klik CTA "Hubungi kami", "Program kerja", dan "Lihat produk" (Vercel Web Analytics masih bisa diaktifkan; saat ini `speedInsights` aktif tetapi `webAnalytics` belum).

## 9. Kesimpulan

Situs Srikandi Buana sudah **layak berfungsi** dan terlihat profesional. Untuk naik ke level "modern dan tidak membosankan", prioritasnya bukan menambah warna atau animasi berlebihan, melainkan: **(1)** mengisi situs dengan bukti visual dan cerita nyata, **(2)** memperbesar dan merapikan tipografi pendukung, dan **(3)** memecah pengulangan templat antarhalaman. Tiga perbaikan kecil sudah diterapkan di cabang ini; sisanya dapat dijalankan bertahap melalui roadmap di atas tanpa mengganggu fungsionalitas yang sudah ada.
