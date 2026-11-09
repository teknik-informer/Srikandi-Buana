# SRIKANDI BUANA v14 - Integrasi Data Anggota dan Dampak Operasional

## 1. Tujuan

Menyatukan Buku Induk Anggota dan profil CV menjadi sumber referensi yang dapat dipakai secara tertib oleh Administrasi, Manajemen Program, Keuangan, dan pengelolaan aset. Data anggota tidak lagi berhenti sebagai biodata; data tersebut menghubungkan kegiatan, kebutuhan, aset, dukungan program, simpanan, kewajiban, jasa/kompensasi, dan pembayaran.

Prinsip utama: **satu identitas anggota, banyak catatan operasional yang terhubung, tidak ada penggandaan identitas ataupun transaksi.**

## 2. Dasar dari makalah Administrasi KWT

Makalah sumber membagi administrasi menjadi administrasi kegiatan dan administrasi keuangan. Administrasi kegiatan mencakup Buku Induk Anggota, Buku Kegiatan, Buku Tamu, Notulen, Produktivitas dan Hasil Produksi, Surat, Ekspedisi, Kepemilikan Sarana/Prasarana Anggota, Luas Lahan Garapan, Pengurus, dan Daftar Hadir. Administrasi keuangan mencakup Buku Kas, Iuran Anggota, Buku Tabungan Anggota, Inventaris, Penjualan, dan Pembelian.

Makalah juga menyebut perangkat perencanaan seperti RDK, RDKK dan RUA serta biodata anggota, monografi, dan peta wilayah. KWT dijelaskan sebagai kelas belajar, unit produksi usahatani, dan wahana kerja sama. Dengan demikian, hubungan profil anggota dengan program, lahan, sarana, produksi, dan keuangan merupakan penguatan langsung dari administrasi yang disarankan.

**Batas sumber:** makalah tidak menetapkan aturan gaji, tunjangan, pinjaman, biaya pinjaman, jadwal angsuran, atau kriteria penerima manfaat. Semua hal tersebut adalah rancangan pengembangan aplikasi dan hanya boleh diaktifkan setelah kebijakan dan keputusan musyawarah disahkan kelompok.

## 3. Model data anggota terpadu

### 3.1 Identitas dan profil

- Identitas resmi, nomor anggota, status, verifikasi, dan jabatan berasal dari modul Keanggotaan.
- Profil akun menyimpan preferensi nama panggilan dan CV: pendidikan, pengalaman kerja/organisasi, keahlian, bahasa, sertifikat, serta minat.
- Alamat berjenjang memiliki kode wilayah dan riwayat pembaruan. Alamat yang berubah tidak boleh mengubah alamat pada kuitansi atau transaksi masa lalu.
- NIK dan detail rekening tetap pada penyimpanan privat terenkripsi yang terpisah. Modul operasional hanya menerima referensi akun/token dan nilai tersamar saat diperlukan.

### 3.2 Snapshot operasional yang aman

Aplikasi menyinkronkan snapshot minimal dari CV ke record anggota untuk penggunaan oleh proses yang berizin: nama panggilan, tingkat/bidang pendidikan, keterampilan, ringkasan jabatan/pengalaman, pengalaman relawan, bahasa, sertifikasi, dan minat. Snapshot ini tidak memuat NIK, nomor rekening, tanggal lahir, gender, email pribadi, nomor telepon alternatif, tautan pribadi, atau narasi bebas CV.

Snapshot digunakan sebagai **bahan pencocokan dan persiapan pemeriksaan**, bukan sebagai keputusan otomatis. Perubahan CV memperbarui data terkini; catatan transaksi dan keputusan terdahulu tetap menyimpan snapshot saat transaksi disetujui.

## 4. Peta dampak lintas modul

| Sumber profil/keanggotaan | Modul yang memakai | Dampak aplikasi | Kontrol |
|---|---|---|---|
| Status aktif, verifikasi, persetujuan pendataan | Semua modul anggota | Memastikan data anggota dapat dipakai pada proses baru | Status dan persetujuan diperiksa ulang; riwayat tetap ada |
| Desa, kecamatan, kabupaten | Program, lahan, distribusi bantuan | Filter cakupan wilayah dan calon peserta yang perlu ditinjau | Kode wilayah dan verifikasi domisili |
| Pendidikan, keahlian, pengalaman, bahasa, sertifikat | Program, pelatihan, penugasan | Pencocokan pelatihan, peran, fasilitator, kebutuhan peningkatan kapasitas | Kriteria program versi tertentu; pemeriksaan koordinator |
| Lahan dan komoditas yang diusahakan | Program, kegiatan, produksi | Buku luas lahan, rencana usaha anggota, pemetaan komoditas | Data lapangan dan persetujuan pemetaan |
| Sarana/prasarana milik anggota | Aset, kebutuhan alat, program | Buku kepemilikan sarana/prasarana anggota dan analisis kesenjangan | Pisahkan milik anggota dari inventaris kelompok |
| Penggunaan aset milik kelompok | Aset, operasional, kegiatan | Penanggung jawab, peminjaman, serah terima, pengembalian | Persetujuan pengurus, kondisi, bukti dan riwayat |
| Keputusan/iuran yang disahkan | Keuangan | Tagihan iuran dan penerimaan anggota | Aturan musyawarah, periode, bukti, kuitansi |
| Tabungan dan pinjaman yang tercatat | Simpan Pinjam | Saldo dari transaksi, pokok pinjaman, jadwal angsuran, tunggakan | Perjanjian, pemeriksaan manusia, jurnal, bukti |
| Penugasan jasa/pekerjaan dan periode | Honorarium/gaji/tunjangan | Menghitung hak berdasarkan keputusan, tarif, periode dan bukti pekerjaan | Penugasan, verifikasi hasil, otorisasi ganda |
| Persetujuan rekening dan referensi rekening privat | Pembayaran | Memilih kanal pencairan tanpa menyalin nomor rekening | Consent terpisah, masking, audit, verifikasi penerima |

## 5. Rantai proses yang harus tersedia

### 5.1 Aset anggota dan aset kelompok

Dua buku harus dipisahkan:
1. **Sarana/prasarana milik anggota** - deklarasi anggota, jenis, kuantitas, kondisi, dan verifikasi.
2. **Inventaris milik kelompok** - aset organisasi dengan kode inventaris dan mutasi. Jika dipinjam/ditugaskan kepada anggota, catat assignment, tanggal serah terima, kondisi, penanggung jawab, dan tanggal pengembalian.

Aset milik anggota tidak boleh dicampur menjadi aset organisasi. Aset yang dipinjamkan kelompok tidak boleh dicatat sebagai milik pribadi anggota.

### 5.2 Program dan pemberdayaan

Data wilayah, keahlian, pendidikan, pengalaman, minat, komoditas, lahan, dan kebutuhan menjadi filter awal untuk menyiapkan daftar calon peserta. Sistem menyajikan alasan kecocokan dan data yang belum lengkap. Koordinator memeriksa persyaratan program, ketersediaan, persetujuan, dan bukti sebelum menetapkan status. Keputusan akhir tetap melalui persetujuan koordinator/pengurus yang berwenang; sistem hanya membantu menyiapkan bahan pemeriksaan. Programme enrolments yang sudah tersedia menjadi relasi keanggotaan-program.

### 5.3 Penugasan anggota dan tindak lanjut

- Tugas dapat dihubungkan ke satu ID anggota dari Buku Induk, bukan hanya mengetik nama pelaksana.
- Pilihan penugasan hanya menampilkan anggota berstatus aktif; API memeriksa ulang bahwa ID anggota benar-benar berada pada kelompok yang sama dan masih aktif.
- Nama pelaksana disimpan sebagai snapshot untuk keterbacaan catatan, sedangkan ID anggota menjadi referensi relasional. Koordinator/penanggung jawab umum tetap dapat dicatat terpisah.
- Penugasan tidak otomatis menghasilkan honorarium atau hak pembayaran. Hasil pekerjaan tetap memerlukan bukti dan verifikasi sesuai kewenangan.
- Penugasan lama yang belum memiliki ID anggota tetap dapat dibaca dan tidak dipaksa dikonversi.

### 5.4 Iuran, tabungan, simpan-pinjam

- Iuran adalah kewajiban sesuai keputusan musyawarah dan versi kebijakan.
- Tabungan memiliki akun dan mutasi deposit/penarikan/koreksi. Saldo dihitung dari transaksi yang sudah diposting, bukan angka yang diedit manual.
- Pinjaman melewati permohonan, kelengkapan, telaah, persetujuan, perjanjian, pencairan, jadwal angsuran, penerimaan angsuran, dan penutupan.
- Biaya administrasi atau bentuk imbal jasa tidak boleh diasumsikan. Hanya nilai dari kebijakan yang disahkan dan tercantum pada perjanjian yang boleh dipakai.
- Setiap transaksi keuangan harus mempunyai nomor referensi, bukti, status, petugas, dan tautan jurnal.

### 5.5 Gaji, honorarium, tunjangan, insentif

Aplikasi membedakan:
- gaji/kompensasi berkala berdasarkan perikatan kerja yang benar-benar ada;
- honorarium atas kegiatan atau pekerjaan tertentu;
- tunjangan yang disetujui kelompok/program;
- insentif berdasarkan indikator/hasil yang ditentukan sebelumnya;
- penggantian biaya berdasarkan bukti.

CV dan keahlian hanya membantu pencocokan kompetensi/penugasan. Hak bayar tidak muncul hanya karena seseorang mempunyai pendidikan, jabatan, atau sertifikat; harus ada penugasan, periode, dasar tarif, verifikasi pekerjaan, dan persetujuan.

### 5.6 Pembayaran

Pembayaran menjadi proses terpisah dari pengajuan hak. Tahapan: draft, diajukan, diperiksa, disetujui, diposting, dibayar, direkonsiliasi. Koreksi memakai transaksi pembalik, bukan mengubah bukti yang telah dibayar. Data rekening penuh tidak dikirim ke tabel transaksi; pembayaran memakai referensi privat dan hanya menampilkan nilai tersamar.

## 6. Struktur domain dan relasi

- member_profiles adalah identitas relasional anggota.
- programme_enrolments dan farm_plots yang sudah ada tetap menjadi relasi anggota-program dan anggota-lahan.
- member_asset_declarations menyimpan sarana milik anggota.
- member_asset_assignments menghubungkan inventaris kelompok dengan anggota pemegang/peminjam.
- Modul Inventaris Aset lama membedakan kepemilikan "Milik anggota" dan "Milik kelompok". Aset milik anggota wajib menunjuk pemilik pada Buku Induk; aset lama tanpa informasi yang cukup tetap diberi status "Belum diklasifikasi", tidak diasumsikan sebagai milik kelompok.
- Peminjaman internal hanya berlaku untuk aset kelompok. Formulir mencatat anggota aktif penerima, tanggal serah-terima, rencana pengembalian, tanggal kembali aktual, kondisi, dan bukti arsip. API memeriksa ulang ID anggota dan urutan tanggal.
- Catatan serah-terima pada tahap ini masih berupa status dan tanggal pada record inventaris lama; belum merupakan buku mutasi append-only. Implementasi transaksi peminjaman/pengembalian yang menyimpan setiap peristiwa secara permanen harus menggunakan member_asset_assignments setelah pemetaan inventory_items dan member_profiles lintas sistem selesai.
- member_financial_policies menyimpan versi kebijakan yang disahkan.
- member_contributions menyimpan kewajiban iuran.
- member_savings_accounts dan member_savings_transactions menyimpan tabungan dan mutasi.
- member_loans dan member_loan_installments menyimpan pinjaman dan jadwal pembayaran.
- member_service_engagements serta member_compensation_items menyimpan penugasan dan perhitungan kompensasi.
- member_payments menjadi catatan pembayaran lintas tujuan yang tertaut ke jurnal serta anggota.

Seluruh relasi operasional memakai organization_id dan composite foreign key agar data lintas kelompok tidak dapat tertaut secara keliru.

## 7. Hak akses, privasi, dan pencegahan penyalahgunaan

- Anggota dapat melihat profilnya dan status transaksi miliknya.
- Sekretariat mengelola identitas, dokumen, dan verifikasi keanggotaan.
- Koordinator melihat data minimum yang diperlukan untuk program yang ditugaskan.
- Bendahara mengelola transaksi dan rekonsiliasi tanpa membuka CV lengkap atau NIK.
- Ketua/administrator menyetujui sesuai kewenangan; perubahan hak akses tetap dibatasi.
- NIK dan rekening disimpan terpisah, terenkripsi, dengan persetujuan eksplisit dan dapat ditarik.
- Profil tidak boleh menjadi skor kredit otomatis, pemutus bantuan otomatis, atau dasar diskriminasi.
- Riwayat keputusan, jurnal, dan pembayaran tidak boleh hilang ketika profil diperbarui atau anggota keluar.

## 8. Dashboard dan indikator dampak

Dashboard harus menampilkan angka dari catatan aktual:
- kelengkapan profil dan status verifikasi;
- anggota dengan profil keterampilan terisi;
- peserta program aktif dan selesai;
- jumlah lahan terverifikasi dan komoditas;
- aset kelompok tersedia, dipinjam, terlambat, rusak;
- iuran wajib, dibayar, dan belum dibayar per periode;
- saldo tabungan dari transaksi posted;
- pinjaman outstanding, angsuran jatuh tempo, dan pembayaran terlambat;
- honorarium/tunjangan disetujui, dibayar, dan direkonsiliasi;
- kualitas data: alamat tidak cocok, bukti belum ada, consent belum ada, relasi tanpa anggota.

Nilai kosong ditampilkan sebagai belum tersedia, bukan nol. Rasio dan tren hanya dihitung dari periode, status, dan denominator yang jelas.

## 9. Tahapan implementasi

1. **Tahap 1 - Master data dan privasi:** profil CV tersinkron dengan ringkasan operasional minimal; NIK/rekening tetap privat.
2. **Tahap 2 - Operasional anggota:** deklarasi aset anggota, penugasan inventaris kelompok, lahan, dan relasi program.
3. **Tahap 3 - Keuangan anggota:** kebijakan, iuran, tabungan, pembayaran dan bukti.
4. **Tahap 4 - Simpan pinjam:** permohonan, pemeriksaan, persetujuan, perjanjian, angsuran dan rekonsiliasi.
5. **Tahap 5 - Kompensasi:** penugasan, gaji/honorarium/tunjangan/insentif, verifikasi hasil, dan pembayaran.
6. **Tahap 6 - Monitoring dampak:** dashboard berbasis transaksi aktual, audit, dan evaluasi.

Migrasi 010_member_impact_finance.sql disiapkan secara additive. Pembuatan file migrasi tidak berarti migrasi sudah diterapkan pada database. Penerapan wajib melalui rehearsal Preview, pemeriksaan backup dan rekonsiliasi, serta persetujuan terpisah sebelum menyentuh lingkungan lain.

## 10. Keputusan organisasi yang wajib ditetapkan

Sebelum fitur finansial diaktifkan, kelompok perlu menetapkan:
- jenis iuran, nominal, periode, pengecualian dan prosedur koreksi;
- jenis tabungan, hak penarikan, otorisasi dan bukti;
- sumber dana, batas pinjaman, syarat, biaya/imbal jasa bila ada, jadwal dan prosedur gagal bayar;
- posisi/pekerjaan yang dibayar, dasar tarif, periode, bukti pekerjaan dan persetujuan;
- jenis tunjangan/insentif dan sumber dananya;
- siapa yang mengajukan, memeriksa, menyetujui, membayar dan merekonsiliasi.

Tanpa keputusan tersebut, modul hanya boleh menyimpan rancangan/draft dan tidak boleh menghasilkan kewajiban atau pembayaran otomatis.

## 11. Kesimpulan

Profil anggota harus menjadi sumber referensi operasional, bukan daftar biodata terpisah. Dampak aplikasi tercapai saat setiap program, aset, kewajiban, tabungan, pinjaman, penugasan, kompensasi, dan pembayaran terhubung kepada ID anggota yang sama, mempunyai bukti, kebijakan, otorisasi, dan jejak audit. Dengan pendekatan ini, administrasi KWT menjadi alat untuk memperkuat kelas belajar, unit produksi, kerja sama, dan kesejahteraan anggota tanpa mengorbankan privasi maupun akuntabilitas.

## Riwayat pergerakan aset kelompok (migration 011)

Aset berstatus **Milik kelompok** diproyeksikan ke `workspace_v14.inventory_items` dengan tautan sumber `source_legacy_asset_id`. Aset **Milik anggota** tidak masuk inventaris kelompok. Perubahan status pinjam/pengembalian disinkronkan bersama perubahan record terlindungi dalam satu batch database.

- `member_asset_assignments` menyimpan status penugasan/peminjaman terkini.
- `member_asset_movement_events` menyimpan peristiwa serah-terima/pengembalian sebagai riwayat append-only; koreksi dilakukan dengan peristiwa baru, bukan mengubah/menghapus peristiwa lama.
- Peristiwa menyimpan status asal/tujuan, waktu, aktor, anggota pemegang, catatan, dan referensi bukti yang tersedia.
- Peminjaman hanya dapat dinormalisasi jika profil anggota tujuan sudah tersinkron pada organisasi yang sama. Jika relasi belum ada, sinkronisasi tidak membuat assignment palsu.
- Migration 011 diterapkan hanya pada branch QA tersanitasi `srikandi-v12-sanitized-qa-20261106`; belum ada migrasi atau perubahan data di Production.
- Riwayat lama tidak direkonstruksi sebagai peristiwa historis karena tanggal dan bukti historis belum tentu tersedia. Peristiwa mulai dicatat ketika perubahan aset baru disimpan setelah fitur aktif.

Status QA: tabel, dua indeks timeline, dan trigger immutable telah diverifikasi. Target DATABASE_URL Preview belum dibuktikan menunjuk branch QA, sehingga belum boleh mengklaim fitur database sudah teruji melalui deployment Preview.
