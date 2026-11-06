# SRIKANDI BUANA — Enterprise Ecosystem v11.5 (Beta Staging)

Source berasal dari website asli SRIKANDI BUANA di Vercel dan menambahkan lapisan ekosistem digital tanpa menghapus modul organisasi lama. **Status: beta staging; belum dinyatakan production-ready.**

## Yang tersedia saat ini

- **Portal Anggota:** autentikasi dan kontrol akses berdasarkan peran yang sudah ada.
- **Pusat Notifikasi:** notifikasi per akun, tanda baca, dan notifikasi alur pesanan/pengajuan.
- **Katalog Publik:** `/produk`, hanya produk terpublikasi dari organisasi aktif. Tidak ada checkout publik atau klaim pembayaran otomatis.
- **Katalog dan Pemesanan:** penambahan serta penyuntingan produk yang mendeteksi perubahan bersamaan, pembatasan stok atomik, bukti pengajuan cetak, status oleh admin, pembatalan dengan pemulihan stok, dan riwayat perubahan stok.
- **Akuntansi dan Buku Besar:** bagan akun, jurnal debit-kredit yang seimbang, neraca saldo sederhana, ekspor CSV aman, jurnal koreksi berpasangan tanpa menghapus riwayat. **Belum ada rekonsiliasi dengan Buku Kas, pembayaran daring, laporan laba rugi/neraca standar, atau faktur pajak.**

Detail arsitektur, pembatasan dan rancangan lanjutan: `docs/ARSITEKTUR_EKOSISTEM_v11.5.md`.

## Jalankan pemeriksaan di VS Code

Perlu Node.js 22.13+ dan terminal pada root proyek. Jangan sertakan rahasia dalam commit.

```bash
npm ci
npm run test:ecosystem
npm run test:navigation:compat
npm run test:terminology
npm run test:integration:staging
npm run typecheck
npm test
npm run build
```

Pembuatan tabel memerlukan migrasi tambahan `005_ecosystem_foundation.sql` dan `006_order_receipts_and_journal_corrections.sql`. **Gunakan Neon staging terisolasi, dengan cadangan sebelum migrasi, jangan gunakan `DATABASE_URL` produksi.** Sesudah memastikan URL staging benar, jalankan `npm run db:migrate`.

**Publikasi:** kerjakan di branch `feat/ecosystem-v11-5`, lalu pull request ke `main` setelah semua test, build, migrasi dan uji browser berhasil. Vercel Preview harus diuji sebelum promosi ke production. Lihat `docs/RELEASE_v11.5.md`.

## Keamanan

Jangan commit `.env.local`, backup database, foto/dokumen privat atau API key ke repositori publik. Aplikasi ini baru memiliki fondasi perdagangan/akuntansi, bukan sistem pembayaran dan perpajakan tersertifikasi.
