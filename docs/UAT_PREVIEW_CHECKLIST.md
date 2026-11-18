# UAT Preview — SRIKANDI BUANA

Dokumen ini memandu UAT pada deployment Vercel Preview. Jalankan hanya dengan akun QA tersanitasi; jangan gunakan akun atau data Production. Catat hasil dan bukti tanpa menyalin email, nomor telepon, token, ID akun, atau informasi pribadi.

## Informasi sesi

- Deployment: https://admin-dashboard-ha3aunbql-teknik-informer.vercel.app
- Branch: `feat/qa-preview-test-center-access-2026-11-18`
- Head yang menjadi acuan sebelumnya: `1dafd83547030d4e27d80afde27535ed5fb5ecf9`
- Database: branch QA tersanitasi, bukan Production.
- Tanggal dan penguji: isi saat UAT.
- Browser/perangkat: isi saat UAT.

## Aturan pelaksanaan

1. Pastikan alamat deployment merupakan Preview dan halaman dapat dibuka melalui SSO tim.
2. Gunakan akun QA untuk peran yang sedang diuji. Logout sebelum berganti peran.
3. Untuk setiap skenario, catat Lulus/Gagal/Tidak dapat diuji, langkah reproduksi, dan tangkapan layar yang sudah disamarkan.
4. Jangan membuat perubahan massal, menghapus data, mengubah konfigurasi modul, atau mengirim pesan/undangan ke kontak nyata.
5. Hentikan skenario jika terlihat data lintas workspace, data pribadi yang tidak relevan, atau tindakan yang melampaui kewenangan peran.

## Skenario lintas peran

| ID | Pemeriksaan | Hasil yang diharapkan |
|---|---|---|
| UAT-01 | Login dan logout | Login berhasil; sesi berakhir setelah logout; halaman terlindungi meminta autentikasi ulang. |
| UAT-02 | Header global | Pencarian tetap berupa ikon; tidak ada input pencarian kedua yang menduplikasi fungsi. |
| UAT-03 | Mega Menu | Logo Srikandi Buana tajam, proporsi benar, tidak pudar atau terdistorsi. |
| UAT-04 | Navigasi | Menu sesuai peran; tidak ada tautan menuju halaman yang ditolak server. |
| UAT-05 | Pusat Aplikasi | Hanya aplikasi yang sesuai kewenangan tampil; registri teknis tidak muncul untuk pengguna umum. |
| UAT-06 | Responsif | Sidebar, header, tabel, dialog dan formulir dapat digunakan pada lebar desktop dan mobile. |
| UAT-07 | Status jaringan | Loading, kosong, gagal, dan sukses ditampilkan dengan jelas; kegagalan tidak menghapus input pengguna. |

## Matriks peran

### Administrator Sistem
- Buka Pusat Modul / Platform Core.
- Periksa registri modul, status kesiapan, pengaturan workspace, override akses dan riwayat audit.
- Pastikan halaman/API Pusat Modul menolak peran selain Administrator Sistem.
- Jangan mengubah status modul atau memberikan override selama UAT visual ini.

### Ketua
- Periksa ringkasan organisasi, anggota, pengurus, kegiatan, program, laporan dan BI & Analitik.
- Pastikan informasi anggota yang bersifat pribadi tidak terbuka tanpa kebutuhan kewenangan.
- Pastikan keputusan publikasi mengikuti alur yang disediakan.
- Pastikan Pusat Modul tidak tersedia.

### Sekretaris
- Periksa buku anggota, struktur, rapat, presensi, surat, dokumen dan publikasi.
- Uji pembuatan atau penyimpanan draft hanya pada data sintetis jika skenario tulis telah disetujui.
- Pastikan data keuangan bersifat baca-saja.
- Pastikan Pusat Modul tidak tersedia.

### Bendahara
- Periksa buku kas, akun, jurnal, aset dan laporan keuangan.
- Pastikan tindakan tulis hanya tersedia pada ruang lingkup keuangan.
- Pastikan surat dan administrasi non-keuangan bersifat baca-saja.
- Pastikan Pusat Modul tidak tersedia.

### Koordinator Bidang
- Periksa program, kegiatan, tindak lanjut, dan penugasan bidang.
- Pastikan data dibatasi pada program yang ditugaskan.
- Pastikan tidak dapat mengubah data keuangan atau menerbitkan keputusan di luar kewenangan.
- Pastikan Pusat Modul tidak tersedia.

### Anggota
- Periksa profil sendiri, informasi anggota yang boleh dilihat, kegiatan dan informasi publik.
- Pastikan tidak dapat membaca data anggota lain, keuangan, catatan internal, atau data program terbatas.
- Pastikan tindakan tulis terbatas pada fitur yang memang disediakan untuk anggota.
- Pastikan Pusat Modul tidak tersedia.

## Pemeriksaan penolakan akses

Untuk setiap peran non-admin, uji navigasi dan permintaan langsung ke rute Pusat Modul. Hasil yang diharapkan adalah penolakan akses di sisi server, bukan sekadar menu disembunyikan. Bila tersedia alat pengujian API internal yang aman, verifikasi juga endpoint platform modules dengan sesi non-admin; jangan menyalin cookie atau token ke bukti UAT.

## Catatan hasil

Gunakan format berikut untuk setiap skenario:

- ID:
- Peran:
- Status: Lulus / Gagal / Tidak dapat diuji
- Langkah:
- Hasil aktual:
- Hasil yang diharapkan:
- Bukti: nama tangkapan layar tersamarkan
- Tingkat dampak: P0 / P1 / P2 / P3
- Catatan:

## Kriteria selesai

- Semua enam peran telah diuji melalui sesi autentikasi aktual.
- Tidak ada akses lintas peran/workspace yang tidak sah.
- Pusat Modul hanya dapat diakses Administrator Sistem pada UI dan API.
- Logo Mega Menu dan pencarian header sesuai keputusan desain.
- Tidak ada temuan P0/P1 terbuka.
- Hasil UAT disetujui pemilik sistem sebelum PR digabung atau Production dipromosikan.

**Batas rilis:** UAT Preview bukan persetujuan migrasi atau deployment Production. Database Production tidak boleh diubah sebagai bagian dari checklist ini.
