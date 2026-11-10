# Hasil Pemeriksaan — SRIKANDI BUANA v11.5.0-beta.2

Tanggal: 6 November 2026. Basis: source asli Vercel v11, disempurnakan melalui v11.3 dan v11.4.

| Pemeriksaan lokal | Hasil |
| --- | --- |
| `npm run test:navigation:compat` | Lulus: 4/4 |
| `npm run test:terminology` | Lulus: 5/5 |
| `npm run test:integration:staging` | Lulus: 7 skenario keluaran PASS (pemeriksaan terbatas, tanpa PostgreSQL nyata) |
| `npm run test:ecosystem` | Lulus: 18/18 (mayoritas kontrak kode dan fungsi validasi, bukan transaksi E2E nyata) |
| Parsing TypeScript/TSX | 257 berkas, 0 error sintaks |
| Perilaku migrator SQL | Lulus pada parser fungsi PL/pgSQL (tanpa migrasi database sesungguhnya) |
| Sanitasi berkas | Tidak ditemukan `.env` atau pola token yang dipindai di paket source |
| ZIP integrity | Divalidasi dengan `ZipFile.testzip()` dan checksum SHA256 |
| `npm ci` offline | Gagal: artefak npm `zod-validation-error@4.0.2` tidak ada dalam cache |
| `npm run typecheck` | Belum terverifikasi karena dependensi lengkap tidak tersedia |
| `npm test` regresi menyeluruh | Belum terverifikasi karena dependensi lengkap tidak tersedia |
| `npm run build` | Belum terverifikasi karena dependensi lengkap tidak tersedia |
| PostgreSQL/Neon staging | Belum dijalankan; migrasi 005/006 belum diterapkan |
| Browser end-to-end | Belum dijalankan |
| GitHub Actions untuk source v11.5 | Belum berjalan: berkas belum di-push ke branch fitur |
| Vercel Preview v11.5 | Belum di-deploy |

## Penilaian risiko

- **Stok:** perubahan jumlah dari pemesanan memperbarui `updated` untuk menolak penyuntingan dari data lama; belum ada uji beban konkurensi database nyata.
- **Pesanan:** bukti pengajuan jelas menyatakan bukan bukti bayar/faktur; tidak ada transaksi payment gateway.
- **Akuntansi:** jurnal debit/kredit dan koreksi berpasangan; belum tersambung langsung dengan Buku Kas lama, belum siap untuk laporan keuangan akhir/standar.
- **Migrasi:** menggunakan `schema_migrations`; uji di Neon staging terpisah, ambil backup dan review terlebih dahulu.
- **Kualitas antarmuka:** komponennya dirancang responsif, tetapi belum diverifikasi melalui pengujian browser/screen reader nyata.

**Kesimpulan:** ini kandidat beta staging, bukan rilis production-ready atau sistem akuntansi/e-commerce tersertifikasi. Jangan promosi ke production sebelum CI, build, database staging dan skenario pengguna lulus.
