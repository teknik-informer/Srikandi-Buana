# Baseline Tata Kelola dan Modul Operasional KWT Srikandi Buana

**Status:** sumber kebutuhan yang diberikan langsung oleh pengguna pada 11 November 2026  
**Cakupan:** kebutuhan organisasi, RBAC, operasional dashboard, verifikasi, pelaporan, privasi, dan hal yang belum boleh diasumsikan.

Dokumen ini mencatat kebutuhan yang telah diterima untuk implementasi PR #17. Dokumen ini tidak menggantikan AD/ART, SK yang telah ditandatangani, keputusan musyawarah, atau peraturan perundang-undangan. Bila terdapat perbedaan, bukti keputusan organisasi yang sah harus menjadi dasar koreksi.

## 1. Identitas dan kedudukan organisasi

- Nama: Kelompok Wanita Tani (KWT) Srikandi Buana.
- Wilayah: Desa Ngadimulyo, Kecamatan Kedu, Kabupaten Temanggung, Jawa Tengah.
- Wilayah kerja yang disebutkan: Dusun Gintung, Ngleri, Ngliwu, dan Craken.
- Musyawarah pembentukan: 25 Oktober 2026.
- Kedudukan dalam rancangan: kelembagaan petani rintisan yang diarahkan berkembang; jangan menyatakan organisasi sudah menjadi KUB atau koperasi sebelum status dan dokumen legalnya benar-benar terbit.
- Periode pengurus pada draf SK: 2026–2029; tanggal penetapan yang tertulis: 11 November 2026.

## 2. Peran dan batas kewenangan

| Peran | Hak operasional pokok | Batas penting |
| --- | --- | --- |
| Ketua | Akses organisasi tertinggi; meninjau dan mengesahkan laporan; mengesahkan anggaran; persetujuan akhir dan rilis dokumen publik | Persetujuan yang mengikat organisasi harus tercatat atas akun Ketua yang berwenang |
| Sekretaris | CRUD administrasi, anggota, rapat/notulen, persuratan, dokumen legal, register lahan/alsintan, pengawasan dan verifikasi data survei | Keuangan hanya baca; tidak dapat menggantikan persetujuan akhir Ketua |
| Bendahara | CRUD transaksi kas, iuran/tabungan, aset/inventaris, rekonsiliasi dan pelaporan keuangan | Administrasi umum hanya baca; transaksi harus memiliki bukti serta jejak koreksi |
| Koordinator Bidang | Menyusun dan memperbarui rencana serta realisasi teknis pada bidang/program yang ditugaskan | Tidak memiliki akses lintas-bidang, CRUD keuangan, atau kewenangan pengesahan/rilis akhir |
| Anggota | Profil sendiri, agenda, informasi program, iuran/tabungan sendiri | Tidak melihat profil, transaksi, atau dokumen pribadi anggota lain |
| Pemerintah/Dinas | Laporan kelompok, monografi, data agregat lahan/komoditas, bantuan dan dokumen yang dibagikan | Akses berbasis undangan/grant, tujuan, masa berlaku, dan minimisasi data |
| NGO/LSM/Yayasan | Laporan capaian program, milestone, dan alokasi dana program yang dibagikan | Tidak mendapat data pribadi mentah atau akses ke seluruh buku kas tanpa dasar dan persetujuan |
| Administrator Sistem/Developer | Pemeliharaan teknis dan administrasi sistem yang diperlukan | Tidak otomatis menjadi pemegang persetujuan organisasi atau penandatangan dokumen |

### Catatan konflik redaksional sumber

Naskah memuat dua bagian bernomor VI. Pada satu matriks, label Super Admin mencantumkan Ketua dan Sistem Developer; pada uraian lain, Super Admin adalah Ketua. Prinsip yang dapat diterapkan tanpa mengubah kewenangan organisasi: pisahkan role teknis `admin` dari role organisasi `ketua`; developer dapat melakukan operasi teknis sesuai hak sistem, tetapi tindakan approval final, pengesahan anggaran, dan penerbitan yang mewakili organisasi tetap harus diverifikasi sebagai tindakan akun Ketua. Hindari berbagi kredensial antarorang.

Daftar Ketua memuat tiga nama, sementara blok penandatanganan draf SK mencantumkan satu nama sebagai Ketua. Jangan mengubah atau mengarang titel wakil/ketua bidang. Setiap orang yang diberi akun `ketua` harus ditetapkan oleh SK final dan memiliki akun pribadi; catatan persetujuan harus menyimpan identitas akun yang benar-benar menyetujui.

## 3. Alur verifikasi dan persetujuan

Alur target:

1. **Draf:** Koordinator bidang atau petugas enumerasi yang ditugaskan menginput data awal.
2. **Verifikasi domain:** Sekretaris memeriksa anggota, administrasi, rapat, persuratan, hasil survei, dan data kegiatan; Bendahara memeriksa transaksi, bukti kas, iuran/tabungan, aset, dan rekonsiliasi keuangan.
3. **Perbaikan:** data yang tidak lengkap dikembalikan kepada pengaju dengan catatan; versi sebelumnya dan alasan perubahan tetap tersimpan.
4. **Menunggu Ketua:** setelah verifikasi domain selesai, data/laporan diajukan kepada Ketua.
5. **Persetujuan akhir:** Ketua menyetujui atau menolak dengan catatan. Persetujuan harus melekat pada snapshot versi data yang ditinjau, bukan sekadar status yang dapat diganti melalui form.
6. **Generator:** hanya snapshot yang disetujui Ketua yang boleh dikonversi menjadi PDF/Excel final. Draf, data revisi, dan laporan yang belum disahkan harus tetap diberi tanda draf.
7. **Distribusi:** dokumen final dapat dibagikan kepada dashboard Pemerintah atau NGO sesuai lingkup, tujuan, dan masa berlaku grant akses.

Setiap tahap perlu mencatat aktor, waktu, tindakan, status sebelum/sesudah, catatan, versi data, dan hash/snapshot dokumen. Pengubahan data setelah persetujuan harus membatalkan status final versi lama dan memulai siklus verifikasi yang baru.

## 4. Modul dan keluaran yang diperlukan

### Administrasi kelompok
Buku induk anggota; buku tamu; notulen; agenda surat masuk/keluar; ekspedisi; daftar hadir; susunan pengurus; kepemilikan sarana-prasarana/alsintan; register lahan garapan; produktivitas komoditas; legalitas dan arsip organisasi.

### Keuangan
Kas masuk/keluar; iuran wajib/sukarela; tabungan per anggota; pembelian/penjualan; inventaris; kategori akun; rekonsiliasi dan pertukaran data Manager.io. Setiap transaksi memerlukan tanggal, nilai, akun, sumber dana, uraian, bukti, pembuat, pemeriksa, dan koreksi/reversal bila ada.

### Pelaporan
RDK, RDKK, monografi, realisasi bantuan, laporan keuangan, laporan program, laporan pertanggungjawaban tahunan, serta paket ekspor PDF/Excel. Generator tidak boleh menciptakan angka, status legal, capaian, sumber pendanaan, atau tanda tangan yang tidak didukung data sah.

### Survei lapangan
Persiapan instrumen dan zona; penugasan surveyor/enumerator; pengumpulan; pemeriksaan kelengkapan; data cleaning; rekonsiliasi; verifikasi Sekretaris; pengunggahan hasil yang terverifikasi. Register instrumen survei harus dipisahkan dari dataset jawaban responden. NIK dan data sensitif tidak boleh disimpan sebagai teks terbuka atau ikut diekspor ke laporan eksternal.

## 5. Prinsip akses dan privasi

- Terapkan least privilege pada API, halaman, ekspor, file, pencarian, dan unduhan; menyembunyikan menu saja bukan kontrol keamanan.
- Eksternal menerima data agregat atau dokumen yang secara eksplisit dibagikan, bukan seluruh record mentah.
- Anggota hanya melihat data miliknya dan informasi kelompok yang memang diumumkan.
- NIK, nomor telepon, data lokasi lahan, foto, dan data keuangan personal perlu klasifikasi akses, dasar pemrosesan, masa simpan, koreksi, dan mekanisme penarikan/pembatasan sesuai kebijakan PDP.
- Geotag bidang lahan tidak boleh otomatis menjadi data publik. Simpan koordinat presisi dengan akses terbatas; gunakan ringkasan atau generalisasi pada laporan publik.
- Persetujuan penggunaan foto dan persetujuan pendataan adalah tujuan berbeda dan harus dicatat terpisah.
- Daftar nama dan nomor kontak 50 anggota yang diberikan sebagai lampiran **tidak dimasukkan ke repository Git atau data publik**. Entri ke database produksi menunggu verifikasi keaslian, tujuan pemrosesan, serta pemberitahuan/persetujuan yang diperlukan.

## 6. Keuangan dan batas otorisasi yang belum ditentukan

Naskah menyebut pengeluaran rutin di bawah suatu batas nominal, pembelian aset di atas batas nominal, dan persetujuan Ketua untuk pengeluaran di atas batas nominal, tetapi tidak memberikan angka, periode akumulasi, definisi nilai bruto/neto, maupun cara menangani transaksi terpecah.

Sampai keputusan tertulis tersedia:
- jangan mengarang angka ambang batas;
- jangan menganggap pengeluaran atau pembelian otomatis disetujui;
- semua transaksi tetap perlu dicatat dan diperiksa Bendahara;
- pengajuan yang membutuhkan otorisasi harus tetap berstatus menunggu keputusan Ketua;
- pinjaman/utang atau komitmen finansial pihak ketiga diblokir sampai ada keputusan Musyawarah Anggota tertulis dan persetujuan Pengurus Harian sebagaimana sumber.

## 7. Kemitraan dan kepatuhan komoditas

CARE Indonesia Peduli, Sucafina, dan Rainforest Alliance ditulis sebagai penjajakan/arah kemitraan. Sistem harus menampilkan status yang benar seperti referensi, rencana penjajakan, komunikasi awal, pembahasan, atau disepakati; jangan menyajikannya sebagai mitra aktif, pendanaan diterima, sertifikasi, atau MoU sebelum ada bukti.

EUDR relevan terhadap komoditas dan pelaku usaha tertentu dalam rantai pasok yang menempatkan produk terkait di pasar Uni Eropa. Fitur awal sebaiknya menyiapkan keterlacakan lot, pemasok, asal lahan, geolokasi, dan bukti; jangan menyatakan KWT otomatis telah patuh atau tersertifikasi. Tanggal penerapan yang perlu dipantau pada sumber resmi Komisi Eropa: 30 Desember 2026 bagi operator/perusahaan menengah-besar (serta kategori tertentu terkait EUTR) dan 30 Juni 2027 bagi sebagian besar operator mikro-kecil. Tanggal dan cakupan harus ditinjau ulang sebelum menjadi aturan otomatis sistem.

## 8. Belum boleh diputuskan oleh implementasi

1. Nominal ambang pengeluaran rutin, pembelian aset, dan persetujuan Ketua.
2. Definisi siapa dari tiga nama pada bagian Ketua yang dapat bertindak sebagai Ketua penandatangan/persetujuan, sesuai SK final.
3. Role/penugasan dan ruang lingkup akun surveyor/enumerator, masa tugas, zona, serta siapa yang dapat mengunggah jawaban survei.
4. Chart of Accounts, aturan saldo awal, metode koreksi, dan pola rekonsiliasi Manager.io.
5. Nomor surat final, pejabat penandatangan per jenis surat, dan apakah tanda tangan elektronik/QR akan menggunakan penyedia atau mekanisme yang sah.
6. Paket laporan yang benar-benar boleh diakses setiap instansi/mitra, termasuk masa berlaku, dasar pembagian, serta tingkat agregasi lokasi dan anggota.
7. Data 50 anggota, nomor kontak, luas lahan, dan koordinat harus diverifikasi terpisah sebelum dianggap sebagai master data produksi.

## 9. Status implementasi pada saat baseline dicatat

PR #17 pada branch `feat/governance-rbac-v1` tetap Draft. Fondasi role-scoped access, register administrasi/survei, dan studio surat resmi berstatus draf telah dibuat. Universal approval workflow, snapshot persetujuan, generator PDF/Excel final, pembagian eksternal berdasarkan persetujuan, serta pemetaan lengkap dataset survei masih merupakan pekerjaan lanjutan. Tidak ada perubahan database Neon produksi, branch utama, atau deployment Vercel sebagai akibat pencatatan baseline ini.
