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

## 2. Model peran dan batas kewenangan — tanpa Super Admin serba-kuasa

Keputusan arsitektur: **jangan gunakan satu role Super Admin yang menggabungkan akses platform, perubahan data operasional, persetujuan organisasi, dan penerbitan dokumen.** Jabatan organisasi dan kewenangan teknis adalah dua hal berbeda.

| Peran | Wewenang yang tepat | Larangan / batas |
| --- | --- | --- |
| Ketua | Pengawasan seluruh domain, membaca laporan lintas bidang, menetapkan keputusan organisasi, mengesahkan anggaran sesuai keputusan, menyetujui paket laporan, serta mengotorisasi dokumen resmi untuk diterbitkan | Tidak perlu menjadi operator pencatatan harian atau mengedit jurnal keuangan sumber; perubahan data tetap dilakukan pemilik domain dan tercatat |
| Sekretaris | CRUD administrasi, data keanggotaan, rapat/notulen, persuratan, dokumen legal, agenda, daftar hadir, register lahan/alsintan, serta verifikasi administrasi dan data survei | Tidak mengubah transaksi keuangan atau melakukan rekonsiliasi Bendahara |
| Bendahara | CRUD transaksi kas, iuran/tabungan, pembelian/penjualan dan register aset sesuai lingkup keuangan; verifikasi bukti dan rekonsiliasi | Tidak mengubah data induk administrasi atau hasil verifikasi Sekretariat |
| Koordinator Bidang | Membuat dan memperbarui rencana, kegiatan, dan laporan teknis sesuai program/bidang yang ditugaskan | Tidak memiliki akses lintas-bidang, CRUD keuangan, perubahan master data, atau persetujuan final |
| Administrator Sistem/Developer | Konfigurasi platform, keamanan teknis, integrasi, pemeliharaan, monitoring, backup/restore, dan pemulihan layanan | Tidak memiliki kewenangan organisasi, tidak menyetujui transaksi/laporan/dokumen, dan tidak menjadi penandatangan. Akses bantuan ke data bisnis harus berupa akses sementara, beralasan, dibatasi, dan tercatat |
| Anggota | Profil sendiri, agenda, program, serta catatan iuran/tabungan miliknya sendiri | Tidak melihat atau mengubah data pribadi dan transaksi anggota lain |
| Pemerintah/Dinas | Laporan kelompok, monografi, agregat lahan/komoditas, bantuan, dan dokumen yang secara khusus dibagikan | Akses berbasis grant, tujuan, masa berlaku, dan minimisasi data |
| NGO/LSM/Yayasan/Mitra | Laporan capaian dan milestone program serta alokasi dana program yang secara khusus dibagikan | Tidak memperoleh akses bebas ke data pribadi, buku kas lengkap, atau catatan internal yang tidak relevan |

**Tidak ada akun bersama.** Setiap orang yang bertindak atas nama jabatan menggunakan akun pribadi. Hak akses Ketua hanya diberikan kepada orang yang kewenangannya tercantum jelas pada SK final; nama yang belum terverifikasi tidak otomatis diberi role Ketua. Untuk menjaga satu otoritas keputusan final, hanya satu akun aktif per workspace yang boleh memegang role `ketua`. Role tersebut hanya dapat diberikan pada bootstrap Ketua pertama; undangan biasa dan edit role tidak dapat membuat Ketua kedua. Penggantian Ketua harus mengikuti serah-terima resmi berdasarkan SK/keputusan musyawarah dan memerlukan prosedur khusus yang diaudit; alur transfer tersebut belum diaktifkan di UI.

### Pemisahan akun teknis dan keputusan organisasi

Naskah sumber memakai istilah Super Admin secara tidak konsisten: satu bagian menyebut Ketua dan Sistem Developer, sedangkan bagian lain menyebut Ketua. Implementasi profesional tidak mempertahankan ambiguitas tersebut sebagai satu role.

- `ketua` adalah otoritas organisasi untuk persetujuan dan rilis.
- `admin` adalah administrator teknis/platform, bukan pejabat organisasi.
- Administrator teknis tidak boleh memakai endpoint atau sesi teknis untuk menyetujui keputusan organisasi.
- Akses darurat/bantuan teknis ke data bisnis, bila suatu saat diperlukan, harus menggunakan mekanisme *break-glass* dengan justifikasi, persetujuan yang sesuai, durasi singkat, pembatasan record, dan audit yang tidak dapat dihapus.
- Hak akses di atas harus ditegakkan di API dan layanan data, bukan hanya dengan menyembunyikan menu.

Daftar Ketua memuat tiga nama, sementara blok penandatanganan draf SK mencantumkan satu nama. Struktur wakil/ketua harian dan pihak yang sah menandatangani harus mengikuti SK final; sistem tidak boleh mengarang jabatan atau menganggap semua tiga nama otomatis mempunyai kewenangan tanda tangan yang sama.

## 3. Alur verifikasi dan persetujuan — efisien, berbasis domain, berbasis paket

**Jangan menerapkan persetujuan Ketua pada setiap edit kecil atau setiap baris transaksi.** Model seperti itu membuat antrean macet, mendorong persetujuan formalitas, dan mengalihkan waktu Ketua dari keputusan strategis. Namun, tidak ada data yang boleh langsung dianggap valid hanya karena sudah disimpan.

Alur yang disarankan:

1. **Pencatatan harian:** Koordinator, enumerator yang ditugaskan, Sekretaris, dan Bendahara memasukkan data sesuai peran. Status awal jelas sebagai draf/belum diverifikasi.
2. **Validasi domain:** Sekretaris memeriksa data administrasi, anggota, rapat, surat, kegiatan, dan hasil survei. Bendahara memeriksa transaksi, bukti kas, iuran/tabungan, aset, dan rekonsiliasi. Tiap verifikasi mencatat pemeriksa, waktu, hasil, dan catatan.
3. **Perbaikan:** data yang tidak lengkap dikembalikan kepada penginput. Riwayat dan alasan perubahan dipertahankan.
4. **Penyusunan paket laporan:** backend menyusun snapshot periode/jenis laporan dari entri yang telah lolos pemeriksaan domain. Paket berisi daftar sumber, versi, tanggal batas, ringkasan validasi, dan hash integritas.
5. **Pengesahan Ketua:** Ketua meninjau paket yang sudah siap, melihat anomali dan ringkasan keputusan, lalu menyetujui, meminta revisi, atau menolak. Persetujuan mengikat pada snapshot paket yang spesifik.
6. **Generator dokumen:** hanya paket yang disetujui Ketua menghasilkan dokumen final PDF/Excel. Perubahan sumber setelah snapshot membuat paket lama kedaluwarsa dan memerlukan pembentukan/pemeriksaan ulang.
7. **Distribusi:** dokumen final tersedia bagi Pemerintah/NGO hanya sesuai grant, tujuan, periode akses, dan klasifikasi datanya.

### Jenis tindakan yang memerlukan persetujuan tersendiri

- Pengesahan paket laporan eksternal, laporan pertanggungjawaban, monografi yang akan diserahkan, dan dokumen legal resmi.
- Penerbitan surat yang memerlukan tanda tangan Ketua.
- Pengeluaran atau pembelian aset yang memenuhi ambang otorisasi tertulis.
- Pinjaman, utang, atau komitmen finansial pihak ketiga, mengikuti keputusan Musyawarah Anggota dan Pengurus Harian.
- Pembagian dataset sensitif atau lokasi presisi kepada pihak luar, setelah dasar dan kewenangannya diperiksa.

Dengan cara ini, seluruh entri tetap diverifikasi oleh penanggung jawab domain, sedangkan Ketua mengesahkan keluaran dan keputusan yang benar-benar memerlukan otoritas organisasi. Sistem generator tidak boleh menjadi *black box*: pengguna berwenang harus dapat melihat sumber, periode, validasi, versi, dan alasan dokumen diterbitkan.

Setiap keputusan pengesahan harus mencatat aktor, waktu, tindakan, status sebelum/sesudah, catatan, versi, dan hash snapshot. Persetujuan tidak boleh dapat dipindahkan ke versi data lain.

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
- Ketua mendapat ringkasan pengawasan anggota dan status persetujuan, bukan nomor kontak, catatan kebutuhan pribadi, atau rincian tujuan persetujuan secara default. Sekretariat menjadi pemegang register identitas dan satu-satunya role internal yang dapat mengunduh paket sumber lengkap yang memuat identitas pribadi. Administrator Sistem dan Ketua hanya menerima metadata nonpribadi dari endpoint sumber.

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

## 9. Status implementasi setelah refaktor least-privilege

PR #17 pada branch `feat/governance-rbac-v1` tetap Draft dan belum digabung atau diterapkan ke produksi. Pemisahan kewenangan utama telah diterapkan pada policy server, halaman, dan endpoint utama:

- `admin` adalah Administrator Sistem: konfigurasi platform, pemeliharaan, integrasi, dan penyiapan Ketua pertama satu kali. Tidak dapat membaca/mengubah record bisnis, kas, jurnal, antrean operasi, dokumen pribadi, atau file arsip organisasi. Endpoint bootstrap hanya menunjukkan ketersediaan; tidak mengembalikan roster/nama anggota. Administrator memasukkan satu ID record yang diberikan Sekretariat setelah dicocokkan dengan SK final; server hanya memeriksa record itu aktif dan terverifikasi, lalu mengirim undangan privat tanpa mengungkap nama ke akun teknis.
- `ketua` memiliki pengawasan lintas domain dan keputusan organisasi, tetapi tidak mendapat CRUD rutin sumber. Data anggota yang ditampilkan kepadanya diminimalkan; nomor kontak, catatan kebutuhan pribadi, rincian tujuan persetujuan, dan dokumen sumber personal tidak diberikan secara default.
- Hanya satu akun aktif per workspace yang boleh memegang role `ketua`. Bootstrap teknis hanya untuk penetapan pertama; undangan/ubah role biasa tidak dapat membuat atau mengaktifkan Ketua pengganti. API juga menolak bootstrap ulang bila pernah ada akun dengan role Ketua, termasuk akun nonaktif. Migrasi `008_single_chair_guard.sql` menegakkan satu Ketua aktif dan satu undangan Ketua pertama tertunda melalui indeks unik; sebelum migrasi diterapkan di lingkungan mana pun, wajib lakukan preflight terhadap akun Ketua aktif/nonaktif dan undangan bootstrap tertunda, cocokkan dengan SK final, lalu selesaikan duplikasi secara manual dan teraudit. Tidak ada pembersihan otomatis.
- `sekretaris` mengelola domain administrasi, register, persuratan, rapat/daftar hadir, instrumen survei, serta verifikasi administrasi dan hasil tugas. Sekretariat merupakan satu-satunya role internal yang dapat membuka dokumen sumber lengkap yang mengandung identitas pribadi.
- `bendahara` mengelola transaksi, bukti, aset, buku besar, rekonsiliasi, katalog/stok, dan realisasi pesanan sesuai kewenangan.
- `koordinator` dibatasi pada program yang ditugaskan; `anggota` hanya mengakses profil dan informasi kelompok yang dibuka untuknya.
- Ketua dapat menerbitkan draf publikasi yang disiapkan Sekretariat tanpa mengubah isi. Pengelolaan dan pemulihan berkas dibatasi kepada pengunggah; Ketua dapat membaca berkas yang terhubung dengan record yang berhak ia baca.
- Ekspor JSON dasar terbatas hanya dapat dilakukan Ketua, tercatat di `access_audit`, dan mengirim header `private, no-store`. Ekspor memuat record yang telah dimasking, metadata berkas yang diizinkan, pesan, pengaturan, serta histori pengajuan operasional; tidak mencakup seluruh tabel terstruktur atau isi biner lampiran. Ini bukan backup penuh atau paket laporan eksternal yang disahkan.
- API pengajuan operasional menolak Administrator Sistem untuk membaca daftar, membuat, mengubah, atau mengakses bukti pengajuan. Persetujuan tetap Ketua; realisasi domain dilakukan Sekretariat/Bendahara.

**Validasi terakhir:** GitHub Actions workflow quality **Run #2085 — SUCCESS** (pull request) dan **Run #2084 — SUCCESS** (push), keduanya pada commit `79b314625b04994fe78c5ce12a6d999dd469b312`, 13 November 2026. Security gates dependensi, navigasi/terminologi, regresi enterprise, akses eksternal, privasi pertanian, integrasi keamanan, TypeScript, seluruh regresi proyek, dan Next.js production build lulus. Suite role juga menguji bootstrap Ketua pertama, redaksi data pribadi sumber untuk non-Sekretariat, pemisahan hak edit/publikasi, retensi anggota yang terkait akun, pengunggah-only file management, pengelolaan akun Ketua, pencabutan undangan, reset password, dan penonaktifan akun. Keberhasilan CI hanya memvalidasi commit tersebut; perubahan kode setelahnya harus diuji ulang.

### Pekerjaan yang masih belum selesai

1. Persetujuan paket laporan immutable (manifest sumber, snapshot, versi, hash, keputusan Ketua yang terikat pada snapshot) belum dibangun.
2. Generator PDF/Excel final yang hanya membaca paket disetujui, beserta invalidasi snapshot saat data sumber berubah, belum dibangun.
3. Distribusi eksternal masih memerlukan uji ujung-ke-ujung atas tujuan, cakupan, masa berlaku, pencabutan, agregasi, dan minimisasi data.
4. Modul enumerator/surveyor dengan penugasan per zona, masa tugas, dan kewenangan pengumpulan/unggah terpisah belum lengkap.
5. Ambang pengeluaran/pembelian aset, Chart of Accounts final, aturan nomor surat, dan pejabat penandatangan harus menunggu keputusan tertulis.
6. Identitas Ketua pertama dan kewenangan penandatangan harus diverifikasi terhadap SK final. Administrator Sistem tidak melihat daftar anggota; Sekretariat menyampaikan satu ID record anggota yang sudah dicocokkan. Bootstrap hanya tersedia setelah record itu Aktif dan Terverifikasi serta email pribadi dikonfirmasi. Server tidak memilih anggota dari roster atau mengaktifkan anggota otomatis melalui impor sumber.

Prototipe persetujuan universal per-record telah dibatalkan. Model yang dipertahankan adalah verifikasi oleh pemilik domain dan pengesahan paket/keputusan yang memang memerlukan otoritas Ketua. Tidak ada migrasi approval eksperimental yang diterapkan. Tidak ada perubahan database Neon produksi, branch utama, merge, atau deployment Vercel.
## 10. Penyelarasan tambahan terhadap pengajuan operasional yang sudah ada

Modul pengajuan operasional yang telah ada (pengadaan, penggantian biaya, peminjaman aset, layanan administrasi, dan izin kegiatan) adalah alur tersendiri, bukan pengganti workflow pengesahan laporan universal.

Pemisahan kewenangan yang telah diselaraskan pada PR:
- Ketua dapat meninjau, meminta revisi, menolak, dan menyetujui pengajuan pada antrean keputusan organisasi.
- Administrator Sistem/Developer tidak memiliki akses ke antrean atau rincian pengajuan operasional. Ketua memegang pengawasan dan keputusan organisasi; Bendahara atau Sekretariat hanya melihat dan mengeksekusi kategori yang menjadi domainnya.
- Bendahara mengeksekusi realisasi pengajuan keuangan/peminjaman aset pada tahap yang diizinkan setelah persetujuan.
- Sekretaris mengeksekusi realisasi layanan administrasi/non-keuangan sesuai lingkup yang diizinkan.
- Pengaju tidak dapat menyetujui atau merealisasikan pengajuannya sendiri.

Notifikasi pengajuan baru dikirim kepada akun Ketua aktif. Keputusan dan transisi pengajuan tetap menggunakan versi dan event audit yang tersedia pada modul operasional. Kebijakan ini tidak menyelesaikan seluruh otorisasi pembelian aset atau ambang nominal yang belum ditetapkan dalam keputusan tertulis.
