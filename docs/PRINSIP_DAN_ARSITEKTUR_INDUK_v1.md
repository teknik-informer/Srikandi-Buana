# SRIKANDI BUANA — Prinsip dan Arsitektur Induk v1.0

Status: **Dokumen keputusan produk dan arsitektur**  
Tanggal: 10 November 2026  
Pemilik keputusan: Pengelola SRIKANDI BUANA  
Status implementasi: Fondasi baru; belum boleh dianggap selesai sebelum gerbang pengujian terpenuhi.

---

## 1. Keputusan produk

SRIKANDI BUANA adalah **sistem kerja organisasi** untuk mencatat kegiatan dan sumber daya organisasi, menerbitkan informasi, serta menghasilkan laporan yang dapat dipertanggungjawabkan.

Produk ini bukan kumpulan dashboard, bukan aplikasi akuntansi terpisah, dan bukan ERP yang seluruh kerumitannya ditampilkan kepada pengguna.

### Hasil utama yang harus diberikan

1. **Publikasi** — informasi organisasi, berita, kegiatan, dokumentasi, pengumuman, dan halaman publik.
2. **Pelaporan** — laporan kegiatan, program, keanggotaan, aset, dan keuangan yang bersumber dari data operasional yang sama.

Empat area navigasi tetap:

- **Organisasi** — profil, struktur, anggota, program, kegiatan, aset.
- **Publikasi** — berita, pengumuman, dokumentasi, halaman informasi.
- **Pelaporan** — laporan periodik dan laporan berdasarkan kegiatan/program.
- **Administrasi** — pengguna, peran, pengaturan, keamanan, dan audit.

Fitur pendukung tidak menjadi menu utama baru. Fitur ditampilkan berdasarkan tugas dan hak akses.

## 2. Prinsip yang tidak boleh dilanggar

1. **Sederhana di depan, kuat di belakang.** UI hanya menampilkan keputusan dan pekerjaan yang dibutuhkan pengguna.
2. **Satu kali input.** Satu fakta dicatat pada satu tempat dan digunakan ulang oleh semua keluaran.
3. **Satu sumber kebenaran.** Tidak ada tabel bayangan, salinan manual, atau angka laporan yang diketik ulang.
4. **Berorientasi tugas.** Navigasi memakai bahasa organisasi, bukan nama teknis modul atau istilah database.
5. **Keluaran nyata.** Setiap tombol menyimpan, mengubah, mengirim, menerbitkan, atau mengunduh sesuatu yang benar-benar bekerja.
6. **Tidak ada data palsu.** Data contoh hanya ada pada lingkungan demo dan harus diberi label jelas.
7. **Status konsisten.** Status memiliki definisi, transisi, aktor, waktu, dan alasan yang jelas.
8. **Keamanan dari desain.** Hak akses diperiksa di server dan database; menyembunyikan tombol bukan kontrol keamanan.
9. **Riwayat tidak dihapus.** Perubahan penting dicatat. Koreksi transaksi keuangan dilakukan dengan pembalik/koreksi, bukan mengubah sejarah.
10. **Bertahap dan teruji.** Tidak ada modul baru sebelum kebutuhan, relasi, dan uji penerimaannya jelas.

## 3. Pengalaman pengguna

### Beranda

Beranda menjawab empat pertanyaan:
- Apa yang perlu saya kerjakan?
- Apa yang sedang berjalan?
- Apa yang perlu diverifikasi?
- Apa yang sudah diterbitkan atau dilaporkan?

Tidak menampilkan grafik dekoratif atau angka yang tidak dapat ditelusuri ke data.

### Alur kerja utama

**Catat → Periksa → Gunakan → Terbitkan/Laporkan**

Contoh satu kegiatan:
1. Pengurus mencatat kegiatan satu kali.
2. Data kegiatan memuat waktu, lokasi, penanggung jawab, peserta, program, biaya, hasil, dan dokumentasi sesuai kebutuhan.
3. Data yang sama menjadi bahan berita atau pengumuman.
4. Data yang sama menjadi sumber laporan kegiatan dan laporan program.
5. Jika ada transaksi, transaksi ditautkan ke kegiatan dan masuk ke rekap keuangan tanpa input ulang.

Pengguna tidak perlu membuat entri kedua untuk laporan atau publikasi.

### Bahasa antarmuka

Gunakan bahasa Indonesia formal, ringkas, dan konsisten. Status baku:
- Draf
- Menunggu Verifikasi
- Disetujui
- Ditolak
- Diterbitkan
- Selesai
- Diarsipkan

Hindari kalimat tutorial, istilah teknis, jargon ERP, serta ajakan percakapan yang tidak perlu.

## 4. Batas domain dan sumber data

| Domain | Fakta yang disimpan | Keluaran/pemakaian |
|---|---|---|
| Organisasi | identitas, unit, periode kepengurusan | profil, struktur, kop laporan |
| Keanggotaan | orang, keanggotaan, jabatan, status | daftar anggota, statistik, hak akses |
| Program | tujuan, periode, indikator, penanggung jawab | rencana dan evaluasi program |
| Kegiatan | agenda, pelaksanaan, peserta, hasil, bukti | kalender, berita, laporan |
| Publikasi | naskah, status, jadwal, kanal, media | halaman publik dan arsip |
| Keuangan | akun, transaksi, jurnal, bukti | buku kas, rekap, laporan keuangan |
| Aset | aset milik organisasi, lokasi, kondisi, mutasi | daftar dan laporan aset |
| Dokumen | metadata, pemilik, klasifikasi, izin | lampiran dan arsip |
| Administrasi | akun, peran, izin, audit | pengendalian dan jejak perubahan |

Data pribadi sensitif dipisahkan dari profil umum. Nomor identitas, rekening, dan dokumen privat tidak boleh tampil pada publikasi atau ekspor umum. Terapkan enkripsi untuk kolom sensitif, pembatasan akses, dan audit pembacaan/perubahan bila relevan.

## 5. Model data inti

Model awal sengaja dibatasi. Tabel baru hanya boleh ditambahkan jika mewakili fakta/domain yang berbeda dan tidak dapat dimodelkan dengan relasi yang ada.

### Identitas dan organisasi
- `users`: akun login dan identitas autentikasi.
- `people`: data orang yang menjadi subjek organisasi.
- `organizations`: organisasi/tenant.
- `organization_units`: struktur unit dan relasi induk-anak.
- `memberships`: relasi orang dengan organisasi/unit, jabatan, periode, dan status.
- `role_assignments`: peran dan cakupan organisasi/unit.

Akun pengguna bukan anggota. Satu orang dapat memiliki akun atau tidak; satu akun tidak boleh menjadi satu-satunya sumber data keanggotaan.

### Program dan kegiatan
- `programs`: program, tujuan, periode, penanggung jawab, indikator.
- `activities`: kegiatan yang terkait program/unit, jadwal, realisasi, hasil, status.
- `activity_participants`: relasi peserta dengan kegiatan.
- `activity_evidence`: relasi kegiatan dengan dokumen/media pendukung.

### Publikasi dan media
- `publications`: naskah publikasi yang dapat merujuk ke kegiatan/program.
- `media_assets`: metadata file, pemilik, klasifikasi, lokasi penyimpanan, checksum.
- Publikasi tidak menyalin seluruh data kegiatan. Konten mengambil referensi data sumber dan menyimpan hanya narasi/editorial serta snapshot terbit yang diperlukan untuk menjaga rekam publikasi.

### Keuangan dan aset
- `financial_accounts`: bagan akun organisasi.
- `financial_transactions`: transaksi operasional dengan tanggal, nilai Rupiah bulat, pihak, kategori, sumber dana, kegiatan/program opsional, dan bukti.
- `journal_entries` dan `journal_lines`: pencatatan berpasangan untuk laporan akuntansi; total debit harus sama dengan kredit.
- `assets`: aset milik organisasi, nilai/perolehan, lokasi, kondisi, status.
- `asset_movements`: mutasi, penempatan, pemeliharaan, dan penghapusan aset.

Pinjaman, simpanan, iuran, honorarium, dan tunjangan hanya dibangun sebagai subdomain saat aturan organisasi dan persetujuan kebijakannya sudah terdokumentasi. Data tersebut tidak boleh dicampur dengan aset organisasi atau saldo kas.

### Dokumen dan tata kelola
- `documents`: metadata dokumen dan relasi pemilik.
- `audit_events`: siapa melakukan apa, terhadap objek apa, kapan, dan hasilnya.
- `idempotency_keys`: perlindungan dari transaksi ganda pada operasi kritis.
- `schema_migrations`: versi skema yang sudah diterapkan.

Semua tabel operasional memiliki ID stabil, organisasi pemilik, waktu dibuat/diubah, dan pencipta/pengubah jika sesuai. Relasi lintas organisasi dilarang kecuali dinyatakan eksplisit.

## 6. Aturan integritas dan status

- Semua data operasional memiliki `organization_id` dan pemeriksaan cakupan tenant.
- Relasi menggunakan foreign key; indeks dibuat untuk kolom relasi, pencarian, dan filter laporan.
- Nominal uang disimpan sebagai integer Rupiah, bukan floating point.
- Tanggal transaksi dan periode laporan disimpan secara eksplisit; tampilan mengikuti zona waktu organisasi.
- Transaksi keuangan yang sudah diposting tidak boleh dihapus atau diedit langsung. Koreksi melalui pembatalan/koreksi berpasangan dengan alasan.
- Saldo dan laporan dihitung dari transaksi sumber; nilai ringkasan tersimpan hanya sebagai cache yang dapat dibangun ulang.
- Operasi multi-tabel kritis dilakukan dalam transaksi database.
- Operasi pengiriman/publikasi/transaksi memakai idempotency key untuk mencegah duplikasi.
- Status hanya berubah melalui transisi yang diizinkan dan tercatat pada audit.

## 7. Arsitektur aplikasi

- **Aplikasi:** Next.js App Router dan TypeScript; server-first, client component hanya saat interaksi diperlukan.
- **Database:** PostgreSQL di Neon sebagai sumber data utama.
- **Akses data:** satu lapisan repository/service; UI tidak membuat query database langsung.
- **Validasi:** skema input terpusat di server; validasi server wajib untuk semua mutasi.
- **Autentikasi:** sesi aman, cookie HttpOnly/Secure/SameSite, rotasi dan pencabutan sesi.
- **Otorisasi:** role + permission + scope organisasi/unit, ditegakkan di server.
- **Penyimpanan berkas:** object storage privat untuk dokumen; akses melalui URL bertanda tangan dan kebijakan retensi.
- **Publikasi publik:** hanya konten berstatus Diterbitkan dan memang ditandai publik.
- **Observabilitas:** log terstruktur, korelasi request, pencatatan kegagalan, dan health check tanpa membocorkan rahasia.

Hindari membuat layanan terpisah sebelum skala atau batas keamanan benar-benar membutuhkannya. Mulai dari modular monolith yang batas domainnya jelas.

## 8. Navigasi dan tampilan

- Sidebar ringkas dengan empat area utama.
- Maksimal satu tingkat submenu yang terlihat sekaligus.
- Satu halaman memiliki satu tujuan utama dan satu aksi primer.
- Formulir dibagi berdasarkan tugas, bukan struktur tabel.
- Kolom opsional tidak memenuhi layar awal.
- Tabel memiliki pencarian, filter, sortir, pagination, dan ekspor yang sesuai izin.
- Tampilan responsif, aksesibel, keyboard-friendly, kontras memadai.
- Tidak menggunakan animasi dekoratif yang mengganggu atau dashboard penuh kartu metrik.
- Tema terang/gelap mengikuti preferensi sistem dengan satu pengaturan.

## 9. Laporan

Laporan merupakan tampilan/hasil query dari data sumber, bukan entri data kedua.

Setiap laporan harus menyatakan:
- organisasi dan unit cakupan;
- periode dan tanggal pembentukan;
- sumber data dan kriteria;
- penyusun dan status verifikasi;
- lampiran/bukti bila diperlukan.

Jenis keluaran awal:
1. Profil dan struktur organisasi.
2. Daftar dan rekap keanggotaan.
3. Rencana, realisasi, dan evaluasi program.
4. Laporan kegiatan.
5. Rekap publikasi.
6. Daftar dan mutasi aset.
7. Buku kas dan laporan keuangan dari transaksi/jurnal.

Laporan resmi dapat dibekukan sebagai snapshot saat disahkan; snapshot harus menunjuk versi sumber dan tidak menggantikan data operasional.

## 10. Tahapan implementasi dan gerbang mutu

### Fase 0 — Fondasi
Dokumen induk, inventaris fitur, batas domain, ERD, standar kode, threat model, dan strategi migrasi.

**Gerbang:** semua keputusan inti disetujui; tidak ada dua sumber data untuk satu fakta.

### Fase 1 — Identitas dan organisasi
Autentikasi, organisasi, unit, orang, keanggotaan, peran, audit.

**Gerbang:** isolasi tenant, hak akses, siklus login, dan pengujian akses negatif lulus.

### Fase 2 — Program dan kegiatan
Program, kegiatan, peserta, bukti, alur verifikasi.

**Gerbang:** satu kegiatan dapat menghasilkan data operasional lengkap dan dapat dilacak.

### Fase 3 — Publikasi dan pelaporan
Editor publikasi, penerbitan, laporan dinamis, snapshot, ekspor.

**Gerbang:** satu sumber kegiatan menghasilkan publikasi dan laporan tanpa input ulang.

### Fase 4 — Keuangan dan aset
Transaksi, jurnal, aset, mutasi, laporan; kemudian kebijakan simpan pinjam dan kesejahteraan anggota.

**Gerbang:** rekonsiliasi, integritas debit-kredit, audit, dan uji hak akses lulus.

### Fase 5 — Pemantapan
Aksesibilitas, performa, keamanan, backup/restore operasional, monitoring, dokumentasi pengguna.

**Gerbang rilis:** CI, typecheck, build, uji integrasi, uji browser terautentikasi, uji izin, dan smoke test produksi lulus.

## 11. Standar penerimaan

Fitur dinyatakan selesai hanya bila:
- ada kebutuhan dan pemilik proses yang jelas;
- skema data dan relasinya terdokumentasi;
- validasi dan otorisasi berjalan di server;
- alur berhasil dan gagal diuji;
- tidak ada tombol atau menu mati;
- tidak ada data demo di produksi;
- hasil laporan dapat ditelusuri ke sumber;
- tidak ada duplikasi input;
- perubahan skema memiliki migrasi dan uji;
- dokumentasi diperbarui.

## 12. Keputusan database ulang

Database lama proyek Neon **Srikandi Buana** dinyatakan sebagai sistem lama yang tidak akan menjadi fondasi skema baru. Penghapusan proyek lama dilakukan setelah proyek baru dan konfigurasi aplikasi baru siap dipakai, untuk mencegah aplikasi produksi menunjuk ke database yang sudah tidak ada.

Proyek lama yang diaudit:
- Project ID: `holy-night-99324539`
- Nama: `Srikandi Buana`
- Region: `aws-us-east-2`
- Branch utama: `production`
- Memiliki beberapa branch QA, migrasi, dan salinan pengujian.
- Memiliki skema campuran `public`, `workspace_v14`, dan `neon_auth`, dengan banyak tabel domain yang tumpang tindih.

Penghapusan proyek Neon menghapus seluruh branch, database, compute, dan role di dalam proyek. Tidak termasuk repository GitHub, deployment Vercel, file object storage, atau layanan lain. Penghapusan proyek Neon memiliki masa pemulihan terbatas sesuai kebijakan Neon, tetapi pembangunan ulang tidak bergantung pada pemulihan itu.

**Tidak boleh ada penghapusan database lain di luar project ID di atas.**

## 13. Larangan

- Jangan menambah menu hanya karena modul tersedia.
- Jangan menampilkan istilah internal seperti ledger, tenant, migration, webhook, atau idempotency kepada pengguna umum.
- Jangan membuat data dummy untuk mengisi dashboard produksi.
- Jangan menyimpan data pribadi sensitif dalam log atau ekspor umum.
- Jangan menggunakan localStorage sebagai sumber kebenaran data.
- Jangan menyimpan saldo hasil hitung sebagai sumber utama.
- Jangan mengeksekusi migrasi produksi tanpa verifikasi environment.
- Jangan menyatakan fitur selesai berdasarkan build saja.
