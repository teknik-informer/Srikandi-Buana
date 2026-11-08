# Pengalaman Produk v14: komunikatif, informatif, inovatif, produktif

## Tujuan

SRIKANDI BUANA harus terasa seperti ruang kerja organisasi yang aktif membantu pengurus dan anggota menyelesaikan pekerjaan. Dashboard tidak boleh berhenti sebagai kumpulan angka, kartu, dan tautan. Setiap ruang harus menjelaskan kondisi, menunjukkan prioritas, dan memandu tindakan berikutnya tanpa mengarang data.

## Prinsip pengalaman

1. **Komunikatif.** Gunakan bahasa Indonesia yang langsung, ramah, dan berorientasi tindakan. Istilah teknis dijelaskan saat muncul. Setiap status menjawab apa yang terjadi dan apa langkah pengguna.
2. **Informatif.** KPI menyatakan arti, ruang lingkup, dan sumbernya. Nilai yang tidak tersedia tidak ditampilkan sebagai nol. Rekomendasi menyertakan alasan dan tujuan modul.
3. **Inovatif, tanpa klaim palsu.** Rekomendasi v14 berasal dari aturan deterministik di atas data aktual. Jangan menyebutnya AI atau prediksi. Fitur AI hanya boleh ditambahkan bila layanan, persetujuan, batas data, dan cara verifikasinya sudah nyata.
4. **Produktif.** Jalur tindakan langsung menuju modul sumber. Pengguna tidak perlu mencari lagi di seluruh menu. Penulisan dan perubahan data tetap di modul pemiliknya agar validasi, jejak audit, dan batas peran tetap berlaku.
5. **Menarik, tidak melelahkan.** Variasikan ikon berdasarkan fungsi, gunakan aksen status yang bermakna, beri ruang kosong yang cukup, dan gunakan transisi ringan hanya untuk umpan balik. Hindari animasi dekoratif, notifikasi yang memaksa, grafik tanpa makna, serta kartu berulang.

## Pola pengalaman yang diterapkan

### Ringkasan tindakan per ruang kerja

Semua tujuh dashboard menampilkan ringkasan tindakan kontekstual:
- Ekosistem: verifikasi anggota, persetujuan data, dan komunikasi pemberitahuan.
- Manajemen: tugas melewati tenggat, hasil menunggu verifikasi, PIC, dan tenggat.
- Administrasi: data anggota, pemeriksaan dokumen, serta kelengkapan lampiran.
- Keuangan: validitas transaksi, bukti transaksi, dan rekonsiliasi saldo.
- E-Commerce & Rantai Pasok: lot yang ditahan serta kondisi aset bila berada dalam lingkup akses.
- Publikasi & Komunikasi: izin publikasi media dan konten draf.
- Sistem: temuan kualitas data serta pemeriksaan akses dan konfigurasi.

Tindakan dibatasi ke modul yang terlihat pada dashboard role pengguna. Saat tidak ada data yang boleh digunakan sebagai dasar rekomendasi, UI menjelaskan batas tersebut alih-alih menyatakan tidak ada masalah.

### Umpan aktivitas dan kendali pembaruan

Setiap ringkasan dashboard menampilkan beberapa catatan terbaru yang dapat dibuka ke modul sumber. Pengurutan menggunakan waktu pembaruan/pencatatan dari record yang tersedia, bukan membuat peristiwa sintetis. Pengguna dapat meminta pemuatan ulang secara manual; tidak ada polling agresif yang mengganggu pekerjaan.

### Grafik perkembangan dan equalizer

Setiap dashboard menampilkan tren enam bulan catatan baru dan catatan yang diperbarui, serta perbandingan jumlah catatan menurut modul yang terlihat oleh role. Grafik menggunakan timestamp `created` dan `updated` dari API catatan yang sudah menerapkan penyaringan kepemilikan dan kebijakan akses. Equalizer adalah animasi visual yang menghormati `prefers-reduced-motion`; angka selalu ditampilkan dan grafik memiliki kondisi kosong. Tren ini mengukur ritme pencatatan, bukan keberhasilan program, dampak sosial, atau tingkat penyelesaian. Dashboard Manajemen juga membandingkan jumlah laporan tercatat, tugas terbuka, dan program terkendala per program berdasarkan evaluasi yang sudah dibatasi hak akses. Indikator outcome/target-capaian tetap harus dibangun terpisah dari nilai sumber dan bukti yang terdefinisi.

### Monitoring dan Laporan

Monitoring membedakan pemeriksaan keterjangkauan API/database dari indikator operasional dan temuan kualitas data. Temuan teratas disajikan sebagai titik mulai yang dapat dibuka ke catatan sumber; temuan adalah petunjuk pemeriksaan, bukan keputusan otomatis bahwa catatan salah. Laporan memandu pengguna memilih bidang, periode, meninjau sumber, lalu mencetak/mengekspor hasil sesuai hak akses.

### Pusat Bantuan

Pusat Bantuan adalah pusat dokumentasi, bukan menu input. Pencarian template mencakup nama, deskripsi, kategori, serta nama kolom; setiap panduan tetap menunjuk ke modul pemilik data. Panduan dapat dibuka dari header seluruh halaman dashboard.

### Status dan bahasa

- Gunakan label yang eksplisit seperti “Menunggu verifikasi”, “Perlu perbaikan”, dan “Data belum tersedia”.
- Bedakan “tidak ada temuan” dari “data tidak dapat diakses” dan “data belum dimuat”.
- Setiap tombol atau tautan memakai tujuan yang jelas, fokus keyboard yang terlihat, dan target sentuh yang nyaman.
- Hormati reduced-motion; jangan menjadikan animasi syarat untuk memahami status.

## Batasan dan keselamatan

- Tidak menambahkan data contoh, angka palsu, pesan sukses palsu, maupun tren tanpa data historis yang memadai.
- Rekomendasi bukan keputusan organisasi. PIC, tenggat, persetujuan, dan penerbitan tetap ditetapkan manusia berwenang.
- Tidak membocorkan ringkasan keuangan, data anggota, atau tindakan yang dilarang kepada role lain.
- Tidak mengubah data dari dashboard ringkasan. Semua mutasi dilakukan di modul pemilik data dengan validasi dan jejak audit.
- Tidak menjalankan migrasi atau mengubah data Production sebagai bagian dari peningkatan pengalaman ini.

## Kriteria QA penerimaan

1. Ketujuh dashboard memiliki pesan dan tindakan yang relevan dengan domainnya.
2. Semua rekomendasi memakai metrik aktual dan tidak menggunakan mock/faker/random data.
3. Semua tautan rekomendasi dibatasi ke modul yang tampak pada role pengguna.
4. Status data kosong, tidak tersedia, gagal dimuat, dan butuh tindak lanjut dibedakan.
5. Pusat Bantuan bisa dicari dengan nama template dan nama kolom.
6. Pusat Bantuan bisa dijangkau dari setiap halaman dashboard.
7. Tata letak tetap terbaca pada lebar ponsel, tablet, dan desktop; keyboard, screen reader, kontras, serta reduced-motion diperiksa langsung.
8. Build, typecheck, ESLint, regression, dan security gate lulus sebelum perubahan dipromosikan.
9. QA browser dengan role uji yang sah tetap wajib; test statis atau HTTP 200 tidak menggantikannya.
10. ESLint dijalankan pada komponen v14 yang berubah. Lint seluruh repositori masih memiliki temuan historis di area lain; temuan tersebut tidak boleh disembunyikan dan harus diselesaikan bertahap melalui backlog terpisah.
