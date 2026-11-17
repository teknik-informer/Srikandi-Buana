# Paket Laporan Resmi — Fondasi dan Kontrak Alur

**Status verifikasi per 15 November 2026:** Migrasi `009_report_packages.sql` dan `010_report_package_source_scope.sql` telah diverifikasi pada cabang Neon QA `srikandi-v12-sanitized-qa` (`br-mute-meadow-b4rhx1mn`), proyek `holy-night-99324539`, database `neondb`. Pemeriksaan read-only menemukan tabel `report_packages`, `report_package_events`, `report_package_counters`, kolom `report_packages.source_scope` bertipe JSONB, constraint `report_packages_source_scope_shape`, dan trigger `srikandi_report_package_snapshot_immutable`. Ketiga tabel paket saat pemeriksaan berisi 0 baris; tabel counter juga 0 baris. Pemeriksaan akun aktif menemukan hanya satu akun Administrator Sistem; belum ada akun Ketua, Sekretaris, Bendahara, atau Koordinator yang dapat dipakai untuk UAT lintas peran. Karena itu, integrasi HTTP terautentikasi, verifikasi domain, persetujuan Ketua, uji konkurensi end-to-end, dan UAT Preview masih belum dibuktikan. CI Run #2256 pada commit `f923794b5025cbe080fae02a0329bac23da86bd2` lulus untuk security gates, regression tests, TypeScript, dan build; hasil CI bukan pengganti UAT. Tidak ada perubahan atau migrasi Production. Riwayat uji fixture sebelumnya tidak dianggap sebagai bukti UAT API.

## Tujuan

Memisahkan rekap operasional yang bisa berubah dari paket laporan yang telah diperiksa dan disahkan. CSV dari layar laporan tetap merupakan alat kerja internal, bukan dokumen final yang otomatis sah untuk diserahkan kepada Dinas atau mitra.

## Alur status

1. **Draft** — penyusun domain membuat paket dari data yang dapat diaksesnya. Sistem menyimpan snapshot, manifest sumber, rentang periode, versi, dan hash.
2. **Verified** — pemilik domain memeriksa kecocokan snapshot dengan catatan sumber dan memberi catatan verifikasi. Verifikasi tidak mengubah data sumber.
3. **Approved** — Ketua menyetujui snapshot yang sama persis. Persetujuan tidak boleh sekaligus mengubah isi paket.
4. **Rejected** — Ketua menolak dengan alasan; paket tetap disimpan sebagai jejak audit.
5. **Superseded** — paket lama ditandai tidak berlaku ketika sumber berubah atau versi baru dibuat. Paket lama tidak dihapus.

Perubahan isi sumber setelah paket dibuat harus membuat paket tidak layak disahkan. Sebelum persetujuan, server membandingkan ID, jenis, waktu pembaruan, dan fingerprint setiap sumber dalam manifest, lalu memeriksa apakah ada sumber baru yang memenuhi jenis, periode, dan ruang lingkup paket tetapi belum tercantum dalam manifest. Paket yang dibuat Koordinator menyimpan daftar program yang menjadi ruang lingkup akses saat snapshot dibuat; pemeriksaan persetujuan tidak boleh memperluasnya menjadi seluruh program kelompok. Paket lama yang belum memiliki `source_scope` harus dibuat ulang sebelum dapat disahkan. Pemeriksaan dilakukan dalam pernyataan persetujuan yang sama dengan perubahan status dan pencatatan peristiwa. Ini merupakan pemeriksaan konsistensi pada snapshot transaksi PostgreSQL; pengujian konkurensi dan perubahan sumber bersamaan tetap wajib dilakukan di QA. Jangan mengandalkan tombol UI atau status yang dikirim browser.

## Pembagian kewenangan

- Sekretaris menyusun, memverifikasi, dan membaca paket operasional, keanggotaan, administrasi, dan publikasi; tidak membaca paket keuangan/usaha.
- Bendahara menyusun, memverifikasi, dan membaca paket keuangan dan usaha/aset; tidak membaca paket sekretariat.
- Ketua dapat membaca paket lintas domain untuk keputusan organisasi. Koordinator hanya membaca paket operasional yang dibuat oleh akunnya sendiri.
- Tampilan paket lintas domain untuk Ketua menerapkan proyeksi privasi: jenis sumber yang berpotensi memuat identitas atau dokumen privat hanya menampilkan metadata terbatas; snapshot tersimpan tetap utuh untuk integritas dan verifikasi internal.
- Koordinator hanya dapat menyusun paket operasional dari program yang ditugaskan; Sekretariat memeriksa kelengkapan administrasi sebelum diajukan kepada Ketua.
- Ketua hanya menyetujui paket yang sudah diverifikasi, bukan mengedit baris sumber atau mengesahkan paket buatannya sendiri.
- Administrator Sistem memiliki akses lintas domain untuk membaca, menyusun, memverifikasi, menyetujui, menolak, dan mengekspor paket. Administrator Sistem tetap tidak dapat memverifikasi atau menyetujui paket yang dibuat oleh akunnya sendiri. Keputusan sistem dicatat sebagai tindakan Administrator Sistem; Ketua tetap menjadi pengesah normal dalam tata kelola organisasi.
- Pihak eksternal tidak mendapat akses ke paket internal secara otomatis. Distribusi memerlukan grant terpisah yang menyebut penerima, tujuan, ruang lingkup, masa berlaku, dan pencabutan.

## Kontrak penyimpanan

Migrasi menambahkan dua tabel:

- `report_packages`: metadata paket, manifest sumber, ruang lingkup sumber (`source_scope`), snapshot, hash, versi, status, serta identitas/waktu verifikasi dan persetujuan.
- `report_package_events`: jejak perubahan status append-only.
- `report_package_counters`: penghitung versi per pemilik, domain, dan periode. Alokasi nomor versi, supersede paket sebelumnya, pembuatan snapshot, dan pencatatan event dijalankan dalam transaksi serializable; konflik transaksi harus digagalkan, bukan menghasilkan nomor versi ganda.

Database menolak perubahan atau penghapusan snapshot, manifest, ruang lingkup sumber, hash, identitas sumber, dan versi. Untuk koreksi, buat paket versi baru. Event historis tidak dapat diubah atau dihapus.

## Aturan privasi dan kualitas

- Paket keanggotaan hanya memuat agregat status; jangan menyimpan nama, alamat, nomor telepon, NIK, atau daftar anggota dalam snapshot ekspor.
- Kehadiran disimpan sebagai jumlah agregat untuk laporan lintas organisasi, bukan daftar identitas.
- Laporan keuangan harus menggunakan ledger yang telah diposting dan seimbang; jangan menjumlahkan Buku Kas dan Buku Besar yang belum direkonsiliasi.
- Setiap sumber harus memiliki ID, jenis, waktu pembaruan, dan fingerprint konten yang benar-benar digunakan. API awal memakai MD5 atas representasi JSONB bersama timestamp untuk mendeteksi perubahan sumber; MD5 ini hanya fingerprint perubahan, bukan bukti keamanan atau tanda tangan. Hash snapshot paket tetap SHA-256.
- Hash snapshot adalah checksum integritas, bukan tanda tangan elektronik atau bukti identitas pejabat.
- Persetujuan Ketua belum menggantikan nomor surat resmi, tanda tangan basah/elektronik, atau prosedur pengesahan yang ditetapkan organisasi.

## Ekspor paket yang telah disetujui

Endpoint `GET /api/report-packages/export?id=...&format=csv` menghasilkan CSV UTF-8 dengan BOM agar dapat dibuka di Excel. Format `print` menghasilkan lembar HTML siap cetak; pengguna dapat memilih **Simpan sebagai PDF** pada dialog cetak browser. Keduanya hanya melayani paket berstatus `approved`, memeriksa ulang peran/domain/pemilik paket di server, dan menggunakan `Cache-Control: private, no-store`. Ekspor Ketua menerapkan proyeksi privasi sebelum data ditampilkan. CSV bukan berkas XLSX asli dan format cetak bukan PDF yang dibuat server. Nilai teks CSV yang diawali karakter formula spreadsheet (=, +, -, @, atau whitespace kontrol terkait) dinetralkan dengan awalan apostrof untuk mengurangi risiko formula injection saat dibuka di Excel. Regression test menjalankan endpoint ekspor dengan fixture data pribadi, memeriksa masking Ketua, akses Sekretariat, penolakan role/domain yang tidak berwenang, status approved, serta formula injection. Pengujian CI memeriksa kontrak keamanan dan build; UAT unduhan dengan akun organisasi yang sah tetap wajib sebelum rilis.

## Kriteria selesai sebelum produksi

1. API awal tersedia untuk membuat, membaca, memverifikasi, menyetujui, dan menolak paket sesuai role; UAT API terautentikasi pada Preview/QA masih diperlukan.
2. Verifikasi domain serta persetujuan Ketua terikat pada hash yang sama dan mencegah persetujuan sendiri; perlu dibuktikan melalui akun uji tiap role.
3. Pemeriksaan sumber saat persetujuan mendeteksi sumber yang berubah, dihapus, maupun baru ditambahkan dalam periode dan ruang lingkup yang sama. Ruang lingkup program Koordinator tersimpan secara immutable; uji perubahan sumber, sumber baru, pencabutan akses, dan kondisi konkurensi masih perlu dibuktikan pada QA.
4. Regression test statis membatasi pembacaan paket per domain; UAT harus membuktikan Administrator Sistem dapat mengelola paket lintas domain dalam workspace sendiri, tidak dapat mengesahkan paket buatannya sendiri, dan akun eksternal tidak dapat membaca paket internal.
5. Generator PDF/Excel hanya membaca paket berstatus approved dan mencantumkan versi, periode, hash, waktu, serta identitas pengesah.
6. Distribusi eksternal menggunakan grant yang dapat dicabut dan tidak membocorkan data pribadi.
7. Migrasi telah diterapkan dan diverifikasi pada database QA yang disanitasi; belum ada izin untuk menerapkannya ke Neon produksi. Tidak ada migrasi otomatis yang dijalankan oleh endpoint API.



## Audit privasi ekspor organisasi — 15 November 2026

Endpoint ekspor JSON terbatas untuk Ketua (GET /api/export) diperkeras agar hanya menghasilkan ringkasan non-identifying untuk pesan masuk dan pengajuan operasional:

- Pesan masuk hanya dihitung per status; kolom nama, kontak, topik, isi pesan, hash IP, dan metadata persetujuan tidak dibaca ke dalam arsip.
- Pengajuan operasional diringkas per kategori/status; histori diringkas per jenis tindakan. Nama pengaju/pelaksana, deskripsi bebas, nama bukti, dan catatan bebas tidak diekspor.
- Nama file lampiran pada metadata ekspor digeneralisasi menjadi "Lampiran".
- Format ekspor dinaikkan ke versi 5. Endpoint tetap memerlukan sesi Ketua dan mencatat aktivitas ekspor sebelum mengirimkan data.
- Regression test menjalankan endpoint dengan fixture sensitif dan memeriksa SQL yang digunakan, sehingga pengembalian query mentah akan membuat tes gagal.

GitHub Actions Run #2284 pada commit 43a481db69723436a4c88fd229801449a9420952 SUCCESS: seluruh security gates, regression tests, TypeScript, dan Next.js production build lulus. Ini membuktikan pemeriksaan kode otomatis, bukan UAT terautentikasi. Tidak ada migrasi atau perubahan database Production.
