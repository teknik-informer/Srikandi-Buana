# Changelog — SRIKANDI BUANA v11.1 Staging

- `src/lib/multipart-limit.ts` — helper pembaca multipart berbatas maksimum 4 MiB secara streaming. Memeriksa `Content-Type`, header ukuran, serta total byte aktual.
- `src/app/api/files/route.ts` — mengaktifkan batas ukuran body aktual pada upload, menolak unduhan file `deleted_at IS NOT NULL`, dan membatasi konten respons dengan CSP.
- `src/app/api/account/avatar/route.ts` — menerapkan pembacaan multipart berbatas pada unggahan avatar.
- `src/app/api/operations/proof/route.ts` — menerapkan pembacaan multipart berbatas pada unggahan bukti operasional.
- `src/app/dashboard/cetak-notulen/[id]/page.tsx` — tampilan cetak A4 catatan musyawarah; menggunakan sesi, pembatasan record, dan database asli; tidak menghasilkan pengesahan elektronik atau nomor resmi.
- `src/app/_components/workspace.tsx` dan `src/app/_components/access/role-workspace.tsx` — tombol cetak notulen pada masing-masing daftar musyawarah sesuai akses.
- `scripts/verify-seo.mjs` — menyesuaikan path logo test dengan aset yang tersedia.
- `package.json` dan `package-lock.json` — label versi staging dan perintah `npm run test:integration:staging`.
- `tests/integration-security.mjs` — tes multipart, keamanan berkas yang dihapus, serta kontrak cetak notulen.

**Bukan implementasi lengkap v0.4:** migrasi persetujuan notulen, dokumen, template surat, struktur jabatan, dan penyimpanan privat v0.4 belum digabung. Sebagian fitur ini memerlukan migrasi dan UAT terpisah.
