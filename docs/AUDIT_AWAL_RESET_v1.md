# Audit Awal dan Keputusan Reset SRIKANDI BUANA

Tanggal audit: 10 November 2026  
Branch audit: `feat/ecosystem-v11-5`  
Branch pembangunan ulang: `rebuild/srikandi-core-v1`

## Ringkasan eksekutif

Audit menemukan bahwa masalah utama bukan sekadar tampilan atau jumlah fitur, melainkan **ketidakselarasan prinsip produk, navigasi, model data, dan dokumentasi**. Dokumen v11.5/v12 sebelumnya memerintahkan pendekatan bertahap tanpa big-bang rewrite, sementara keputusan produk terbaru meminta sistem dibangun ulang dari fondasi sederhana. Karena itu dokumen lama tidak boleh lagi menjadi sumber keputusan untuk pembangunan v1.

## Temuan repositori

- Repositori Next.js App Router, TypeScript, React 19, Next.js 16.
- Pohon repositori yang diperiksa berisi sekitar 515 path.
- Area aplikasi mencakup situs publik, dashboard, API, autentikasi, pengelolaan berkas, program, kegiatan, anggota, kas, aset, perdagangan, laporan, dan administrasi.
- Dashboard menggunakan catch-all route ditambah beberapa route khusus. Ini meningkatkan risiko label/menu dan alur yang berbeda untuk fungsi sejenis.
- `src/lib/srikandi.ts` memuat definisi modul/form dan data program awal dalam satu berkas besar. Ini mencampur katalog formulir, konten, aturan domain, dan data awal.
- `migrations/001_initial.sql` memulai dengan tabel generik `records` berisi payload JSON, lalu migrasi berikutnya menambah tabel domain terstruktur.
- Terdapat migrasi SQL bernomor 001–007.
- Dokumentasi lama membagi aplikasi menjadi lima pilar, sedangkan keputusan produk terbaru menetapkan empat area kerja.
- Dokumen lama menyatakan jangan melakukan big-bang rewrite dan jangan menghapus struktur lama. Ketentuan tersebut digantikan oleh keputusan reset yang tercatat pada dokumen induk v1.

## Temuan database lama

Project Neon:
- Nama: `Srikandi Buana`
- Project ID: `holy-night-99324539`
- Region: `aws-us-east-2`
- Branch utama: `production`
- Audit branch: terdapat 10 branch aktif yang tercatat pada saat pemeriksaan, termasuk QA, rehearsal migrasi, snapshot/restore test, dan safety copy.
- Skema berisi tabel pada `public`, `workspace_v14`, dan `neon_auth`.
- Terdapat tumpang tindih konsep antara tabel generik/legacy, tabel domain operasional, keuangan, perdagangan, dan workspace.

Audit ini memeriksa metadata proyek, daftar branch, dan daftar tabel; tidak melakukan ekspor atau pencadangan isi tabel sesuai keputusan pemilik.

## Risiko dan keputusan

| Temuan | Risiko | Keputusan v1 |
|---|---|---|
| Data generik JSON bercampur tabel domain | aturan dan relasi tidak konsisten | model relasional eksplisit untuk fakta inti |
| Banyak modul/route | navigasi berat dan fitur tumpang tindih | empat area utama, tugas terpusat |
| Form dan data awal tercampur | sulit dirawat dan rawan data contoh | pisahkan domain, konten, dan seed |
| Laporan dan publikasi berpotensi input ulang | angka/narasi tidak sinkron | sumber data bersama dan relasi langsung |
| Hak akses tersebar | risiko akses lintas unit | policy server-side terpusat |
| Dokumen lama bertentangan | keputusan implementasi berubah-ubah | dokumen induk v1 menjadi otoritas tunggal |

## Penanganan kode lama

Kode lama diperlakukan sebagai bahan audit dan referensi kebutuhan, bukan fondasi yang harus dipertahankan. Fitur yang layak dipakai ulang harus melewati:
1. pemeriksaan kebutuhan bisnis;
2. pemeriksaan kualitas dan keamanan;
3. pemetaan ke domain v1;
4. uji penerimaan.

Tidak ada kewajiban mempertahankan route, tabel, komponen, atau pola lama. Namun, jangan menghapus repository GitHub atau histori commit. Repository tetap menjadi jejak sumber dan tempat pembangunan v1.

## Database baru

Project Neon baru telah dibuat dan diverifikasi kosong:

- Nama: `Srikandi Buana Core`
- Project ID: `hidden-surf-18556907`
- Region: `aws-ap-southeast-1` (Singapore)
- PostgreSQL: 18
- Database: `srikandi`
- Branch utama: `production`
- Daftar tabel awal: kosong.

Project lama belum dihapus pada tahap audit ini. Penghapusan dilakukan setelah aplikasi, migrasi v1, dan konfigurasi deployment siap dialihkan ke database baru, agar tidak membuat produksi menunjuk ke database yang sudah tidak tersedia. Penghapusan yang dimaksud hanya project Neon `holy-night-99324539` beserta seluruh branch/database/compute/role di dalamnya.

## Tahap berikutnya

1. Menyusun ERD dan migration baseline v1.
2. Mengganti sumber data generik dengan repository domain yang tervalidasi.
3. Menata ulang aplikasi sebagai modular monolith dengan empat area UI.
4. Mengimplementasikan autentikasi, organisasi, anggota, program, kegiatan.
5. Menghubungkan publikasi dan pelaporan ke sumber data yang sama.
6. Menguji seluruh alur dan Preview dengan database baru.
7. Mengalihkan konfigurasi Production dan menghapus project Neon lama sesuai keputusan pemilik.

## Batas audit

Audit ini adalah pemeriksaan awal metadata, dokumentasi, pohon kode, file skema terpilih, dan konfigurasi proyek. Audit belum merupakan review setiap file, penetration test, pengujian browser terautentikasi, atau audit akuntansi. Tidak ada klaim bahwa semua fitur lama telah diuji.
