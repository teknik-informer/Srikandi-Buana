# SRIKANDI BUANA Enterprise — v11.3.0 (Staging)

**Basis:** Source asli deployment Vercel v11 → staging v11.1 → patch navigasi v11.2 → standardisasi dan QA v11.3. Ini bukan aplikasi yang dibangun ulang.

## Apa yang sudah dikerjakan

- Standardisasi nama seluruh 7 grup dan 29 menu dashboard sesuai konteks administrasi organisasi, tanpa mengganti ID atau URL.
- Sinkronisasi nama modul data dan teks utama dashboard termasuk tampilan profil serta layanan pengguna.
- Penamaan **Laporan Kas** (bukan akuntansi lengkap) dan **Perencanaan Usaha** (bukan transaksi penjualan yang belum tersedia).
- Menjaga alur otorisasi yang ada, 4 migrasi PostgreSQL, aset asli, modul yang berfungsi, dan seluruh menu publik.
- Perbaikan kompatibilitas ESM untuk `next.config.ts`.
- Unit test terminologi dan kompatibilitas navigasi, serta konfigurasi GitHub Actions untuk build dan pengujian otomatis.

## Instalasi

Prasyarat: Node.js 22.13+ dan lingkungan PostgreSQL staging. **Jangan menguji migrasi di database produksi.**

```bash
npm ci
npm run test:navigation:compat
npm run test:terminology
npm run test:integration:staging
npm run typecheck
npm test
npm run build
```

Untuk menjalankan server lokal, gunakan konfigurasi environment staging yang sah dan `npm run dev`. Berkas `.env` tidak disertakan.

## Status

- **Staging source: selesai dibuat.**
- Tes navigasi dan terminologi: **9/9 lulus.**
- Pengujian keamanan integrasi lokal: **lulus.**
- Parsing seluruh source TS/TSX: **240/240 berkas tanpa kesalahan parsing.**
- Typecheck penuh, semua regression test, build Next.js dan pengujian database sungguhan: **belum lulus/belum terverifikasi** (dependensi npm tidak tersedia di lingkungan pengerjaan).
- Repositori GitHub `teknik-informer/Srikandi-Buana` kini ditemukan dan dapat diakses oleh akun pemilik; source belum otomatis dikirim oleh paket ini. Build dan deployment baru tetap belum diverifikasi.

Lihat `docs/PEDOMAN_TERMINOLOGI.md`, `docs/QA_v11.3.md`, dan `docs/RELEASE_DAN_DEPLOY.md`.

**Jangan promosi ke produksi sampai build, typecheck, migrasi staging, dan uji alur browser berhasil.**


## Publikasi GitHub (Mac)

Repositori tujuan: https://github.com/teknik-informer/Srikandi-Buana (saat diperiksa: kosong, PUBLIC).

1. Ekstrak ZIP dan buka folder sumber.
2. Jalankan `bash Publikasikan_ke_GitHub.command` melalui Terminal.
3. Jika Git meminta kredensial, autentikasikan akun `teknik-informer` menggunakan GitHub Credential Manager/CLI. Jangan menaruh token dalam perintah Git atau percakapan.
4. Verifikasi semua file sumber sudah muncul di cabang `main` GitHub.

**Penting:** Perintah `git add README.md` saja tidak cukup; skrip memakai `git add -A` untuk seluruh proyek kecuali file yang diabaikan `.gitignore`. Skrip juga berhenti jika branch remote sudah berisi commit agar tidak menimpa pekerjaan lain.

## Vercel (Preview dahulu)

Jalankan `bash Deploy_Preview_Vercel.command` setelah GitHub berhasil, atau gunakan Vercel Dashboard untuk menghubungkan repository. Skrip menjalankan tes dan build sebelum membuat **Preview**, bukan rilis produksi. Pemindahan produksi memerlukan hasil pengujian end-to-end, verifikasi database dan peninjauan konfigurasi lingkungan.

## Keamanan

Repo ini publik. Jangan commit `.env`, token, kata sandi, private key, data anggota tidak untuk publik, atau dump database. `public/dokumen/` dan berkas lain yang dahulu termasuk proyek perlu ditinjau sebelum push agar tidak memublikasikan informasi yang tidak seharusnya.
