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

Monitoring membedakan pemeriksaan keterjangkauan API/database dari indikator operasional dan temuan kualitas data. Temuan teratas disajikan sebagai titik mulai yang dapat dibuka ke catatan sumber; temuan adalah petunjuk pemeriksaan, bukan keputusan otomatis bahwa catatan salah.

Halaman Monitoring memiliki analisis grafik khusus, tidak hanya mengandalkan ringkasan grafik umum dashboard:
- Tren enam bulan untuk catatan tugas, laporan program, dan agenda baru berdasarkan timestamp pembuatan record.
- Distribusi tugas berdasarkan status pencatatan (belum dimulai, berjalan, selesai, ditunda).
- Beban tindak lanjut: tenggat terlewat/hari ini, tanpa PIC/tenggat, hasil menunggu verifikasi, hasil perlu perbaikan, serta agenda lewat tanggal.
- Kualitas data per modul dengan pemisahan temuan peringatan dan pengingat.
- Pemantauan per program yang membandingkan jumlah laporan, tugas terbuka, dan sinyal kendala dalam laporan terbaru.

Semua data grafik diturunkan dari record yang lolos izin baca dan penyamaran field sesuai role. Kategori beban tindak lanjut dapat saling tumpang tindih sehingga tidak dijumlahkan sebagai total unik. Jumlah laporan bukan persentase target tercapai; sinyal kendala bukan pengukuran tingkat keparahan. Laporan memandu pengguna memilih bidang, periode, meninjau sumber, lalu mencetak/mengekspor hasil sesuai hak akses.

### Profil pribadi, CV, dan data sensitif

Menu **Akun Saya** membedakan identitas keanggotaan yang telah diverifikasi dari preferensi dan riwayat pribadi akun:
- Nama lengkap resmi tetap mengikuti catatan anggota terverifikasi; koreksi ejaan/identitas harus melalui proses pemeriksaan Sekretariat.
- Nama tampilan dan nama panggilan dicatat terpisah.
- CV mendukung ringkasan diri, alamat domisili berjenjang, kontak, pendidikan, pengalaman kerja, pengalaman organisasi/relawan, keahlian, hobi/minat, bahasa, serta sertifikasi/pelatihan.
- Alamat memilih provinsi, kabupaten/kota, kecamatan, dan desa/kelurahan melalui kode wilayah resmi. Nama wilayah tetap dapat diisi manual saat layanan daftar wilayah tidak tersedia.
- Profil CV tersimpan per akun dan tidak otomatis dipublikasikan. Nomor telepon utama disinkronkan ke kolom kontak pada catatan anggota yang tertaut; bidang CV lain tidak mengubah status verifikasi, jabatan, atau hak akses.
- NIK dan rekening bersifat opsional, memerlukan persetujuan terpisah, dienkripsi dengan AES-256-GCM dan AAD per pemilik/akun, serta API hanya mengembalikan status tersimpan dan tampilan tersamarkan. Tidak boleh ditempatkan pada catatan anggota umum atau diekspor ke laporan rutin.
- Kunci `PROFILE_DATA_ENCRYPTION_KEY` hanya dipasang pada lingkungan Preview untuk pengujian saat ini. Kunci Production harus dibuat dan dipasang secara terpisah sebelum fitur identitas sensitif diaktifkan pada Production; jangan pernah memakai ulang kunci Preview.
- Bila kunci enkripsi server tidak tersedia, penyimpanan NIK/rekening harus gagal tertutup (fail closed); jangan mengganti enkripsi dengan penyimpanan teks biasa. Form CV biasa tetap dapat disimpan tanpa mengirim field sensitif.
- Pengguna dapat mencabut persetujuan untuk menghapus nilai sensitif yang tersimpan. Setiap perubahan profil dicatat dalam audit tanpa menyalin nilai NIK atau rekening ke log.

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


## Sinkronisasi profil akun dan keanggotaan

Data keanggotaan terhubung menjadi sumber identitas resmi: nama lengkap, peran/jabatan, status, dan status verifikasi dibaca dari record anggota. Nama tampilan akun tetap merupakan preferensi antarmuka dan tidak menggantikan nama resmi.

Saat anggota memperbarui profil, nomor telepon, nama panggilan, alamat dusun/jalan, desa/kelurahan, dan snapshot alamat berjenjang diselaraskan ke record keanggotaan yang tertaut. Saat Sekretariat memperbarui nama, peran, status, telepon, dusun, atau desa melalui modul Keanggotaan, perubahan tersebut menjadi nilai yang dibaca kembali oleh profil akun. Metadata alamat yang dikelola melalui profil dipertahankan saat record keanggotaan diedit; bila desa diubah secara manual, kode wilayah dan kode pos lama dikosongkan agar tidak menyisakan hierarki yang keliru.

Perubahan akun juga menjalankan sinkronisasi ke proyeksi data v14. NIK dan rekening tetap berada di penyimpanan privat terenkripsi akun dan tidak disalin ke record keanggotaan. Akun tanpa tautan member_id ditandai belum terhubung dan tidak mengubah data anggota mana pun.


## Dampak profil anggota terhadap operasional

Profil CV menyediakan ringkasan operasional minimal untuk pencocokan program, pelatihan, peran, dan penugasan. Ringkasan tersebut terdiri dari tingkat/bidang pendidikan, keahlian, jabatan/pengalaman, pengalaman relawan, bahasa, sertifikasi, dan minat. Data ini bukan skor atau keputusan otomatis. Data privat seperti NIK dan nomor rekening tidak disalin ke record anggota maupun proyeksi operasional.

Relasi anggota-program sudah disediakan oleh workspace_v14.programme_enrolments; relasi anggota-lahan sudah disediakan oleh workspace_v14.farm_plots. Migrasi additive 010_member_impact_finance.sql menyiapkan relasi deklarasi aset milik anggota, penugasan inventaris kelompok, iuran, tabungan, pinjaman/angsuran, penugasan jasa, kompensasi, dan pembayaran. File migrasi belum diterapkan ke database Preview/Production; penerapan memerlukan rehearsal dan persetujuan terpisah.

Makalah Administrasi KWT yang menjadi dasar mencantumkan iuran dan tabungan anggota, tetapi tidak memberikan aturan gaji, tunjangan, atau pinjaman. Karena itu seluruh kebijakan keuangan lanjutan harus menjadi versi kebijakan organisasi yang disetujui dan memiliki bukti. Transaksi hanya boleh diposting setelah pemeriksaan, otorisasi dan jurnal.
