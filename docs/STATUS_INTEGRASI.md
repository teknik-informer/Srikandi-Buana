# SRIKANDI BUANA — Audit Source v11 dan Integrasi Aman v11.1 (staging)

**Dasar:** ZIP source Vercel `SRIKANDI_BUANA_VERCEL_FULL_SOURCE_v11.zip` yang diberikan pemilik.
**Deployment sumber:** `dpl_89CEwSmYguaqeync5U6MoyJCTbmn` pada proyek `admin-dashboard` dan alias `srikandibuana.vercel.app`.
**Status:** PATCH PADA COPY STAGING; **tidak mengubah Vercel produksi** dan **tidak menggunakan database produksi**.

## Verifikasi ekstraksi
- Arsip input dapat dibaca, checksum seluruh entry ZIP valid (`testzip() = None`).
- `EXPORT_REPORT.json` mencantumkan 306 berkas sumber yang diharapkan; tersedia tepat 306 entri di direktori `source/`, tidak termasuk metadata.
- Struktur sumber meliputi `src/app`, `src/components`, `src/lib`, `migrations`, `public`, `scripts`, `package.json`, `package-lock.json` dan `next.config.ts`.
- Sebanyak 127 entry `lambda` pada pohon deployment Vercel bukan source utama dan tidak termasuk ZIP. Repositori Git, riwayat commit, environment variables, database, dan dependensi `node_modules` tidak termasuk ekspor ini.
- Fork ini dibuat dari 306 berkas tanpa menghapus berkas sumber.

## Penemuan saat audit kode

1. **Tidak aman menyalin migrasi staging v0.4 mentah.** v11 memiliki `records` (kategori `musyawarah`, `pengurus`, `kegiatan`, `kehadiran`, `tindaklanjut`, `register`), `users`, `sessions`, `files`, `settings`, `audit`, dan `operational_requests`. Di sisi lain v0.4 mendefinisikan tabel tersendiri `members`, `meetings`, `meeting_attendance`, `documents`, `financial_transactions`. Menjalankan migrasi keduanya tanpa pemetaan bisa mengakibatkan duplikasi dan konflik identitas. **Tidak ada migrasi v0.4 yang dijalankan.**
2. **Unguhaan multipart:** endpoint `/api/files`, `/api/account/avatar`, `/api/operations/proof` sebelumnya hanya memeriksa `Content-Length`, lalu memanggil `request.formData()`. Jika header ukuran tidak ada, pembacaan tubuh request tidak dibatasi sebelum parser multipart; telah ditambahkan `readLimitedMultipart` dengan maksimum 4 MiB pada level stream. Validasi file maksimum 3 MiB tetap berlaku.
3. **Berkas ditandai terhapus:** endpoint GET `/api/files` sebelumnya mengambil file tanpa filter `deleted_at`; ditambahkan filter agar berkas yang dihapus tidak lagi dapat diambil melalui endpoint unduh. Ini tidak menghapus isi object storage. Pemulihan berkas tetap menggunakan alur lama.
4. **Notulen:** data sudah ada dalam `records` dengan `kind='musyawarah'`, sehingga ditambahkan route cetak aman yang hanya membaca catatan sah dalam workspace, tanpa menambah tabel paralel. Halaman disediakan kepada akun yang memang berhak melihat catatan itu.
5. **Aset pengujian SEO:** test lama menunjuk `public/brand/source/wordmark.png` yang tidak tersedia dalam source, sementara `public/brand/wordmark.png` tersedia. Jalur test diperbaiki.

## Integrasi v0.4 ke v11 — matriks keputusan

| Domain staging v0.4 | Yang sudah ada di v11 | Keputusan v11.1 |
|---|---|---|
| Rapat/notulen | `records.kind='musyawarah'`, kegiatan, presensi | **Sebagian:** cetak notulen menggunakan record v11. Workflow persetujuan khusus v0.4 belum diport. |
| Daftar hadir | `records.kind='kehadiran'` + `/api/attendance` | **Dipertahankan**, tidak ditimpa tabel meeting_attendance baru. |
| Persuratan/dokumen | `register` + arsip file + pengajuan administrasi | **Dipertahankan**; fitur nomor surat, templat, versi dan approval v0.4 belum digabung karena belum ada pemetaan semantik lengkap. |
| Organisasi & pengurus | `anggota`, `pengurus`, akun dan peran | **Dipertahankan**, tidak menggandakan basis data member. |
| Keuangan dan aset | `kas`, `aset`, workflow `operational_requests` | **Dipertahankan**, tidak menyalin tabel finance/inventory staging. |
| Upload file | `/api/files`, `/api/account/avatar`, `/api/operations/proof` | **Diperkuat** dengan pembatasan streaming dan status soft delete. |
| Identitas, CMS & branding | Next.js public, settings, media | **Dipertahankan** tanpa perubahan desain besar. |

## Perubahan berkas
Lihat `CHANGELOG_v11.1.md` dan `SOURCE_CHECKSUMS.json`. Semua perubahan dibuat pada copy staging.

## Kriteria pengujian yang belum tercapai
- `npm ci` pada lingkungan saat ini gagal dengan `Exit handler never called!`; `node_modules` tidak lengkap. Karena itu build Next.js, lint, dan pemeriksaan tipe proyek penuh **belum terverifikasi**.
- Tidak ada `DATABASE_URL` staging yang dipasang atau migrasi PostgreSQL yang dieksekusi.
- Route cetak notulen belum diuji dalam browser nyata dengan akun/DB staging.
- Pengujian integrasi dengan Srikandi v0.4 dan tes regresi akun/role/inventaris/keuangan belum dilakukan menyeluruh.

## Rekomendasi tahap lanjut
1. Buat branch Git pada repo sumber ini, simpan ZIP v11 sebagai backup yang tidak berubah.
2. Gunakan PostgreSQL/Neon khusus staging, impor snapshot yang aman dan tersanitasi sesuai kebijakan privasi (bukan koneksi langsung produksi).
3. Jalankan `npm ci`, `npm run typecheck`, `npm run build`, `npm test`, dan uji login/berkas/notulen secara end-to-end; perbaiki regresi sebelum preview.
4. Pemetaan resmi skema jabatan, dokumen, rapat, dan keuangan v0.4 → v11 sebelum implementasi migrasi baru.
5. Deploy preview baru saja setelah langkah 3 berhasil. Domain produksi tidak boleh diubah tanpa persetujuan terpisah.
