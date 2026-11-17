# v13 Release Gate — SRIKANDI BUANA

Dokumen ini adalah prosedur rilis untuk fondasi modular v13. Status dokumen bukan persetujuan untuk mengubah Production.

## Status dan batas lingkungan

- Preview terbaru v13 harus dibangun dari branch yang ditinjau dan memakai `PREVIEW_DATABASE_URL` khusus QA.
- Database QA harus terisolasi dan disanitasi. Untuk target QA, gunakan `MIGRATION_TARGET=qa` dan `DATABASE_TARGET_LABEL` yang menyebut QA/staging/sanitized.
- Production menggunakan `DATABASE_URL` Production. Jangan menjalankan migrasi Production sebelum backup, rekonsiliasi ledger, preflight data, UAT terautentikasi, persetujuan rilis, dan rencana rollback disetujui.

## Gerbang eksekusi migrasi

Runner `npm run db:migrate` sekarang menolak eksekusi tanpa target eksplisit.

### Local
```bash
MIGRATION_TARGET=local npm run db:migrate
```

### QA / staging terisolasi
```bash
MIGRATION_TARGET=qa DATABASE_TARGET_LABEL=srikandi-sanitized-qa npm run db:migrate
```
Pastikan `DATABASE_URL` mengarah ke database QA yang benar sebelum menjalankan perintah.

### Vercel Preview
Set environment `VERCEL_ENV=preview` dan `PREVIEW_DATABASE_URL` ke database Preview/QA yang terisolasi, kemudian jalankan dengan `MIGRATION_TARGET=preview`. Preview tidak boleh memakai fallback ke `DATABASE_URL` Production.

### Production — dilarang sebelum persetujuan rilis
Runner mensyaratkan seluruh hal berikut:
- `MIGRATION_TARGET=production`
- `PRODUCTION_MIGRATION_APPROVAL=SRIKANDI_BUANA_PRODUCTION_MIGRATION_APPROVED`
- `PRODUCTION_MIGRATION_FILES` harus sama persis, berurutan, dengan daftar file repository-only yang dihasilkan dari ledger Production.
- `DATABASE_URL` harus diverifikasi sebagai endpoint Production yang benar.

Nilai konfirmasi di atas adalah pengaman operasional eksplisit, bukan pengganti persetujuan organisasi, backup, review, atau kontrol akses Vercel/Neon. Jangan menyimpan kredensial database di Git.

## Rekonsiliasi ledger Production saat audit 17 November 2026

Production mencatat 21 migrasi; QA mencatat 28. Tujuh file repository berikut belum tercatat di ledger Production:

1. `008_single_chair_guard.sql`
2. `009_report_packages.sql`
3. `010_report_package_source_scope.sql`
4. `011_verified_email_change.sql`
5. `012_whatsapp_login_identity.sql`
6. `013_multi_officer_positions.sql`
7. `020_platform_module_access.sql`

Daftar ini harus dihitung ulang dari database saat rilis; jangan menyalin daftar statis ini ke `PRODUCTION_MIGRATION_FILES` tanpa audit terbaru.

## Preflight data wajib

Pemeriksaan baca-saja pada Production tanggal 17 November 2026 menemukan:
- Tidak ada workspace dengan lebih dari satu akun Ketua aktif.
- Tidak ada email duplikat setelah normalisasi huruf kecil.
- Tidak ada workspace dengan lebih dari satu undangan aktivasi Ketua yang masih pending.

Tetap ulangi pemeriksaan sebelum rilis. Migrasi 008 membuat indeks unik satu Ketua aktif dan satu undangan Ketua pending, sedangkan migrasi 013 kemudian menghapus kedua indeks itu untuk mendukung beberapa pemegang posisi. Urutan ini perlu ditinjau sebagai satu rangkaian.

Migrasi 011 membuat indeks unik `lower(email)`; preflight email duplikat harus lulus. Migrasi 012 membuat indeks unik `users(login_phone)`; periksa konflik nomor setelah kolom dan data telepon tersedia pada target migrasi. Migrasi 020 menambahkan registry modul, pengaturan per workspace, grant peluncuran aplikasi, serta audit append-only.

## Kriteria sebelum promosi

- CI, typecheck, regresi, dan Next.js production build lulus pada commit yang sama dengan Preview.
- Review kode dan keamanan tidak menyisakan P1/P2.
- UAT terautentikasi untuk Ketua, Sekretaris, Bendahara, Koordinator, Anggota, Administrator Sistem, dan akses eksternal yang relevan.
- Uji API langsung untuk akses yang diizinkan/ditolak, termasuk lampiran bukti, ekspor, BI, dan perubahan status modul.
- Migration ledger Production telah direkonsiliasi; preflight data dan backup diverifikasi.
- Rencana rollback aplikasi dan database ditulis dan diuji pada lingkungan non-Production.
- Promosi Production hanya dilakukan setelah persetujuan eksplisit pemilik sistem.

**Status pada saat dokumen dibuat:** Preview dan CI v13 tersedia; UAT terautentikasi belum selesai; tujuh migrasi belum diterapkan ke Production; Production belum dirilis.
