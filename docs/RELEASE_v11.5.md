# Panduan Rilis Aman — v11.5 Staging

**Asal kode:** main `teknik-informer/Srikandi-Buana` pada baseline `9bbd05b...`, plus perubahan ekosistem kumulatif sejak v11.4.

**Branch kerja:** `feat/ecosystem-v11-5`. Branch telah disiapkan; berkas belum otomatis dikirim oleh paket ZIP ini.

## Pemeriksaan CI

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

## Pengujian migrasi

1. Pisahkan database staging dari production dan verifikasi `DATABASE_URL` tanpa mengirim kredensial.
2. Ambil backup staging. Review `005_...sql` dan `006_...sql`.
3. Jalankan `npm run db:migrate` hanya di staging, periksa `schema_migrations`.
4. Uji penambahan/sunting produk, stok paralel, pembatalan satu kali, hak akses pembeli, notifikasi per akun, jurnal koreksi dan ekspor CSV.
5. Pastikan Vercel Preview menggunakan environment staging, bukan URL database production.

## Promosi ke production

Tunggu seluruh pemeriksaan CI hijau dan verifikasi manual oleh administrator. Rencanakan backup database production dan migrasi terjadwal sebelum release. Karena skema database ditambah, kode baru tidak boleh dipromosikan sebelum skema siap. Lakukan smoke test dan sediakan rollback kode/migrasi yang direncanakan.

**Tidak ada sertifikasi akuntansi, pembayaran, fiskal atau keamanan dari dokumen ini.**
