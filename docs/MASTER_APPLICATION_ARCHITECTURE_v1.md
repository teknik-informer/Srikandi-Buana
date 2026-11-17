# Master Application Architecture v1.0 — SRIKANDI BUANA

**Status:** Architecture baseline / review draft  
**Tanggal:** 17 November 2026  
**Branch dokumentasi:** `fix/v13-release-safety-gates-2026-11-17`  
**Prinsip:** One Platform · Six Integrated Applications · One Shared Data Foundation

Dokumen ini menetapkan batas tanggung jawab enam aplikasi agar pengembangan, navigasi, data, hak akses, dan pengalaman pengguna tetap konsisten. Dokumen ini adalah baseline arsitektur teknis; bukan pengesahan kebijakan organisasi, struktur kepengurusan, atau keputusan operasional yang belum ditetapkan melalui musyawarah/ketentuan resmi.

---

## 1. Sasaran arsitektur

SRIKANDI BUANA dibangun sebagai satu platform digital dengan enam aplikasi modular. Pengguna memperoleh satu identitas dan pengalaman yang konsisten, tetapi setiap aplikasi memiliki domain, dashboard, menu, alur kerja, dan izin akses yang jelas.

Sasaran utamanya:
- tidak membuat enam website atau enam sistem login yang terpisah;
- tidak mencampur data administrasi organisasi, data budidaya, transaksi usaha, analitik, dan konten publik;
- setiap data mempunyai satu pemilik utama (*system of record*);
- aplikasi dapat dikembangkan bertahap tanpa memutus integrasi;
- data sensitif hanya dapat dilihat sesuai konteks organisasi, ruang kerja, peran, dan izin;
- fitur yang tampil harus benar-benar terhubung ke proses dan data, bukan sekadar kartu visual.

## 2. Enam aplikasi dan mandatnya

| No. | Aplikasi | Mandat utama | Bukan tanggung jawabnya |
|---|---|---|---|
| 1 | **Platform Core** | Identitas, autentikasi, workspace, otorisasi, konfigurasi, audit, notifikasi, integrasi, status layanan | Mengelola transaksi pertanian/keuangan sebagai domain bisnis |
| 2 | **Organization** | Kelembagaan, anggota, struktur, rapat, kehadiran, surat, keputusan, program kerja, inventaris organisasi | Mencatat hasil panen rinci atau jurnal usaha |
| 3 | **Agriculture** | Petani, lahan, komoditas, budidaya, input produksi, panen, penyuluhan, alsintan pertanian, ketertelusuran | Menetapkan keanggotaan organisasi atau membukukan transaksi usaha |
| 4 | **Business & Enterprise** | Unit usaha, produk, pemasok, pembelian, penjualan, persediaan usaha, kas/bank, pembukuan, aset usaha | Menjadi sumber data primer profil anggota atau data budidaya |
| 5 | **BI & Analytics** | KPI, dashboard lintas domain, tren, perbandingan, laporan manajemen dan evaluasi | Menjadi tempat input transaksi atau mengubah data sumber |
| 6 | **Public & Partnership** | Website publik, profil, publikasi, program, kemitraan, laporan dampak yang disetujui, portal mitra | Membuka data internal secara langsung atau menampilkan data privat tanpa persetujuan |

### 2.1 Platform Core — fondasi bersama

Kemampuan bersama:
- login, sesi, pemulihan akun, dan identitas pengguna;
- workspace/organisasi aktif dan konteks keanggotaan;
- role, permission, policy, dan pemeriksaan akses sisi server;
- registrasi/aktivasi modul dan konfigurasi platform;
- audit log, notifikasi, penyimpanan berkas, dan integrasi;
- pengelolaan status layanan, health check, serta administrasi teknis;
- pengelolaan identitas email struktural sebagai identitas sistem, dengan pemisahan tegas dari kewenangan pengangkatan/pemberhentian pejabat organisasi.

Platform Core tidak otomatis memberi administrator teknis kewenangan untuk menyetujui keputusan organisasi. Aksi tata kelola tetap memerlukan pejabat/persetujuan yang sah sesuai aturan organisasi.

### 2.2 Organization — sumber data kelembagaan

Mencakup profil organisasi, unit/wilayah, anggota, status keanggotaan, posisi/jabatan, kepengurusan, rapat, agenda, notulen, daftar hadir, surat masuk/keluar, disposisi, program kerja, dokumen kelembagaan, dan inventaris organisasi.

Organization adalah sumber utama identitas anggota dan struktur organisasi. Perubahan struktur harus memiliki status, dasar dokumen, waktu berlaku, pelaku, serta jejak persetujuan bila diwajibkan.

### 2.3 Agriculture — sumber data pertanian

Mencakup profil petani yang terhubung ke anggota (tanpa menggandakan identitas), lahan dan geometri/peta, komoditas, musim tanam, kegiatan budidaya, sarana/input, penyuluhan, produktivitas, panen, pascapanen, alsintan pertanian, serta data ketertelusuran.

Data lahan dan produksi bersifat terbatas. Geotag, koordinat, identitas petani, dan data pemasok tidak boleh otomatis dipublikasikan.

### 2.4 Business & Enterprise — sumber data komersial

Mencakup unit usaha, katalog internal, produk, layanan, pelanggan, pemasok, offtaker, penawaran, pesanan, pembelian, penjualan, stok, kas/bank, jurnal, piutang/utang, aset, biaya, dan laporan usaha.

Transaksi keuangan harus memiliki status dan jejak perubahan. Koreksi dilakukan melalui mekanisme koreksi/ pembalikan yang dapat diaudit, bukan menghapus riwayat. Integrasi akuntansi tidak boleh menganggap data panen sebagai transaksi penjualan sampai transaksi komersial benar-benar terjadi.

### 2.5 BI & Analytics — lapisan baca dan evaluasi

Menyajikan indikator lintas aplikasi seperti keanggotaan, aktivitas, luas lahan, produktivitas, realisasi program, persediaan, penjualan, arus kas, dan capaian kemitraan sesuai izin pengguna.

BI membaca data dari domain sumber melalui query terkontrol, view, atau tabel agregasi/materialisasi. BI tidak boleh menjadi jalur alternatif untuk mengubah data sumber. Setiap metrik harus mempunyai definisi, satuan, periode, sumber, aturan agregasi, waktu pembaruan, dan batasan interpretasi.

### 2.6 Public & Partnership — publikasi terkurasi

Mengelola halaman publik, profil, berita, dokumentasi kegiatan, program, mitra, publikasi, formulir kontak, dan laporan dampak. Portal mitra dapat menampilkan deliverable atau indikator khusus berdasarkan perjanjian dan hak akses.

Publikasi wajib melalui status editorial: **Draft → Review → Approved → Published → Archived**. Hanya data yang telah disetujui dan aman untuk publik yang boleh disajikan. Data anggota, kontak pribadi, koordinat lahan, dokumen internal, dan transaksi tidak boleh terekspos secara default.

---

## 3. Kepemilikan data dan sumber kebenaran

| Entitas/data | Pemilik utama | Konsumen yang diizinkan |
|---|---|---|
| Akun, sesi, role, permission, workspace, audit | Platform Core | Semua aplikasi sesuai kebutuhan |
| Profil organisasi, anggota, jabatan, rapat, surat, keputusan | Organization | Agriculture, Business, BI, Public (terbatas/terkurasi) |
| Petani-terhubung, lahan, komoditas, budidaya, panen | Agriculture | Business (referensi pasokan), BI, Public (agregat disetujui) |
| Produk usaha, pemasok, pesanan, stok usaha, jurnal dan kas | Business & Enterprise | BI, Public (ringkasan disetujui) |
| Definisi KPI, snapshot, agregat dan laporan analitik | BI & Analytics | Dashboard sesuai izin |
| Halaman, publikasi, kampanye dan konten mitra | Public & Partnership | Publik atau mitra sesuai status dan akses |

**Aturan wajib:** satu entitas mempunyai satu pemilik tulis utama. Aplikasi lain menggunakan ID referensi dan kontrak data; hindari duplikasi tabel master yang dapat berubah sendiri-sendiri. Jika suatu domain belum tersedia, tampilkan status belum tersedia atau data belum tercatat—jangan membuat angka contoh seolah-olah data nyata.

## 4. Pola integrasi

Alur konseptual:

1. Pengguna masuk melalui Platform Core.
2. Platform Core memvalidasi identitas, workspace, status akun, dan izin.
3. Aplikasi domain memproses perintah sesuai kepemilikannya.
4. Perubahan penting dicatat pada audit log dan menghasilkan event/notifikasi bila diperlukan.
5. Aplikasi konsumen membaca data melalui service/query/view yang diizinkan.
6. BI mengolah data menjadi indikator; Public & Partnership hanya menerima subset yang lolos persetujuan publikasi.

Gunakan kontrak eksplisit: ID stabil, skema terversi bila diperlukan, validasi input server-side, aturan idempotensi untuk operasi yang dapat diulang, serta penanganan kegagalan yang dapat dipahami pengguna. Hindari akses lintas domain yang menulis langsung ke tabel milik aplikasi lain.

## 5. Model akses dan tata kelola

Keputusan akses tidak boleh hanya berdasarkan nama role. Evaluasi minimal mempertimbangkan:
- **Identity:** akun aktif dan terverifikasi sesuai kebijakan;
- **Workspace:** organisasi/ruang kerja yang sedang dipilih;
- **Role:** fungsi pengguna dalam konteks workspace;
- **Permission:** aksi spesifik seperti view, create, update, delete, approve, publish, export, administer;
- **Resource scope:** seluruh workspace, unit, data milik sendiri, atau record tertentu;
- **State/policy:** status record, masa jabatan, persetujuan, dan aturan khusus.

Contoh kemampuan (bukan penetapan jabatan organisasi):

| Kapabilitas | Pengurus berwenang | Petugas pencatat | Anggota | Pemerintah/mitra |
|---|---|---|---|---|
| Melihat ringkasan internal | Sesuai mandat | Terbatas | Data yang diizinkan | Data yang dibagikan |
| Membuat/memperbarui data | Sesuai domain | Draft pada lingkup tugas | Data diri/pengajuan | Tidak, kecuali portal khusus |
| Menyetujui keputusan organisasi | Pejabat berwenang | Tidak otomatis | Tidak otomatis | Tidak |
| Menyetujui transaksi keuangan | Pemegang otorisasi keuangan | Tidak otomatis | Tidak | Tidak |
| Mengakses analitik | Sesuai izin | Terbatas | Ringkasan yang diizinkan | Ringkasan yang dibagikan |
| Mempublikasikan konten | Editor/penerbit yang ditunjuk | Draft | Tidak otomatis | Tidak otomatis |

Administrator sistem dapat mengelola konfigurasi teknis dan pemulihan akses sesuai kontrol keamanan, tetapi tidak otomatis dapat mengesahkan keputusan organisasi, transaksi, atau publikasi atas nama pejabat.

## 6. Standar pengalaman pengguna

Semua aplikasi memakai satu design system:
- satu identitas visual, tipografi, warna, ikonografi, komponen, dan pola interaksi;
- satu shell aplikasi: header, pemilih aplikasi/workspace, navigasi, profil, notifikasi;
- dashboard tiap aplikasi menampilkan ringkasan sesuai mandat, bukan menyalin semua KPI;
- navigasi global memisahkan **Aplikasi**, **Ruang Kerja**, dan **Administrasi**;
- menu dan tindakan hanya ditampilkan jika relevan, tetapi server tetap wajib memvalidasi izin;
- halaman harus responsif dan dapat digunakan pada perangkat desktop maupun ponsel.

Setiap halaman data harus mempunyai state **loading, empty, error, success**, validasi, konfirmasi untuk tindakan berisiko, umpan balik operasi, serta pagination/filter ketika volume data bertambah. Optimistic update hanya digunakan untuk operasi yang aman dan harus dapat dipulihkan bila server menolak perubahan.

## 7. Navigasi dan identitas aplikasi

Rute konseptual (sesuaikan dengan pola routing aktual sebelum implementasi):

| Aplikasi | Prefix konseptual | Area utama |
|---|---|---|
| Platform Core | `/platform` | Overview, users, access, workspaces, modules, integrations, audit, settings |
| Organization | `/organization` | Overview, members, structure, meetings, attendance, correspondence, programs, assets |
| Agriculture | `/agriculture` | Overview, farmers, land, commodities, cultivation, harvest, extension, traceability |
| Business & Enterprise | `/business` | Overview, units, products, procurement, sales, inventory, finance, accounting |
| BI & Analytics | `/analytics` | Executive overview, indicators, trends, comparisons, reports, data quality |
| Public & Partnership | `/public` dan portal publik | Website, publications, programs, partners, impact, partner access |

Prefix adalah rancangan target, bukan instruksi untuk mengganti rute lama secara massal. Implementasi harus mempertahankan kompatibilitas rute yang masih digunakan, menggunakan redirect/alias terencana, dan menguji semua tautan.

## 8. Prinsip data dan keamanan

- Semua tabel domain yang dimiliki workspace harus memiliki relasi workspace/tenant yang tervalidasi.
- Terapkan prinsip least privilege dan pemeriksaan akses di server/API, bukan hanya menyembunyikan menu.
- Validasi dan normalisasi data dilakukan di server; jangan mempercayai nilai dari browser.
- Rahasia, token, kredensial database, dan data pribadi tidak boleh masuk ke Git, log publik, atau respons API yang tidak berwenang.
- Audit perubahan penting: aktor, aksi, resource, waktu, hasil, dan metadata relevan; jangan merekam rahasia.
- File privat menggunakan akses terkontrol; URL publik hanya untuk berkas yang memang dipublikasikan.
- Backup, retensi, pemulihan, dan penghapusan data mengikuti kebijakan yang disahkan.
- Data analitik dan publikasi menerapkan minimisasi data serta agregasi bila identitas tidak diperlukan.

## 9. Standar BI dan kualitas metrik

Setiap KPI wajib mendokumentasikan:
1. nama dan tujuan indikator;
2. definisi operasional dan rumus;
3. tabel/domain sumber dan pemilik data;
4. satuan, periode, filter, dan dimensi;
5. waktu sinkronisasi atau freshness;
6. penanganan data kosong, duplikat, dan koreksi;
7. batasan interpretasi.

Dashboard harus membedakan **nol**, **belum ada data**, **belum disinkronkan**, dan **tidak memiliki akses**. Angka agregat harus dapat ditelusuri ke sumber sesuai izin. Jangan menyimpulkan kinerja organisasi dari data yang belum lengkap.

## 10. Tahapan implementasi

### Tahap A — Baseline dan inventaris
- petakan rute, tabel, API, role, dan fitur yang sudah benar-benar ada;
- tandai fitur aktif, parsial, mock, deprecated, atau belum tersedia;
- tetapkan pemilik data dan dependensi setiap modul.

### Tahap B — Platform Core
- stabilkan autentikasi, workspace, policy, audit, modul, dan notifikasi;
- uji akses lintas workspace dan akses tanpa izin;
- pastikan administrasi teknis terpisah dari persetujuan tata kelola.

### Tahap C — Organization dan Agriculture
- tetapkan identitas anggota sebagai referensi bersama;
- implementasikan data kelembagaan dan pertanian dengan batas domain;
- uji alur anggota–petani–lahan–produksi tanpa duplikasi identitas.

### Tahap D — Business & Enterprise
- implementasikan alur produk, pembelian, penjualan, stok, kas, dan jurnal;
- uji integritas transaksi, koreksi, dan audit;
- jangan mengklaim akuntansi lengkap sebelum ruang lingkup dan rekonsiliasinya terpenuhi.

### Tahap E — BI & Analytics
- definisikan katalog KPI dan sumber data;
- buat agregasi terkontrol dan dashboard per audiens;
- uji rekonsiliasi angka dengan data domain.

### Tahap F — Public & Partnership
- implementasikan workflow editorial dan persetujuan publikasi;
- buat data projection khusus publik/mitra;
- uji kebocoran data dan akses portal mitra.

### Tahap G — Release
- CI, typecheck, test, build, migrasi QA, browser regression, UAT terautentikasi, backup, preflight, persetujuan rilis, dan rollback plan;
- Preview dan Production harus menggunakan konfigurasi serta database yang benar-benar terpisah;
- tidak ada migrasi atau promosi Production hanya karena build berhasil.

## 11. Kriteria penerimaan arsitektur

Arsitektur dinyatakan terimplementasi secara memadai apabila:
- enam aplikasi terlihat sebagai enam area yang berbeda namun berada dalam satu platform;
- setiap menu menuju halaman dan proses yang nyata, atau secara jujur ditandai belum tersedia;
- setiap domain mempunyai pemilik data yang jelas;
- login dan workspace konsisten di semua aplikasi;
- akses diuji di sisi server untuk role, workspace, resource, dan aksi;
- operasi CRUD memiliki validasi, state, audit yang sesuai, dan persistensi;
- BI hanya membaca/mengagregasi data sumber dan metrik dapat ditelusuri;
- konten publik hanya berasal dari data yang disetujui;
- navigasi lama yang masih digunakan tidak rusak;
- seluruh pemeriksaan build, test, keamanan, dan UAT yang relevan lulus.

## 12. Keputusan yang masih memerlukan konfirmasi organisasi

Dokumen ini sengaja tidak mengarang keputusan yang belum disahkan. Hal-hal berikut perlu ditetapkan oleh organisasi sebelum dijadikan aturan produksi:
- struktur final dan masa berlaku jabatan;
- siapa yang berwenang menyetujui anggota, surat, program, pengeluaran, dan publikasi;
- aturan iuran, kas, pembelian, penjualan, dan batas persetujuan;
- klasifikasi data yang boleh dibagikan kepada pemerintah, mitra, dan publik;
- retensi dokumen, persetujuan penggunaan data, dan mekanisme koreksi.

---

**Kesimpulan:** enam aplikasi harus tetap menjadi satu platform, tetapi tidak boleh menjadi satu keranjang data tanpa batas. Integrasi dilakukan melalui identitas, workspace, kontrak, dan referensi bersama; kepemilikan domain tetap tegas. Dokumen ini menjadi acuan untuk audit implementasi dan rencana kerja teknis berikutnya.
