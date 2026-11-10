# SRIKANDI BUANA v14 — Arsitektur Ruang Kerja

**Status dokumen:** baseline implementasi beta / Vercel Preview. Bukan persetujuan rilis produksi.

## Prinsip utama

1. Satu sumber kebenaran untuk setiap domain. Dashboard hanya merangkum dan mengarahkan ke modul pemilik data.
2. Hak akses diperiksa di server/API dan pada tingkat record; penyembunyian menu bukan kontrol keamanan.
3. Data organisasi bersifat non-komersial. Fitur usaha/pemesanan hanya digunakan sesuai mandat dan kebijakan internal kelompok.
4. Tidak membuat angka, transaksi, status pembayaran, anggota, atau bukti contoh pada lingkungan nyata.
5. Perubahan data harus mempertahankan identitas pencatat, waktu, versi, sumber, serta jejak koreksi.
6. Migrasi dilakukan bertahap di staging dengan backup, validasi relasi, dan rencana pemulihan.

## Tujuh dashboard

| Dashboard | Domain pemilik data | Hasil kerja yang diharapkan |
| --- | --- | --- |
| Ekosistem | Portal anggota, akun pribadi, notifikasi | Anggota mengakses informasi dan menyampaikan kebutuhan melalui jalur resmi |
| Manajemen | Program, agenda, musyawarah, tugas, tindak lanjut | Keputusan berubah menjadi tugas dengan PIC, tenggat, hasil dan verifikasi |
| Administrasi | Keanggotaan, struktur, surat, register, arsip, persetujuan | Dokumen dan data organisasi tertib, terlacak dan dapat diperiksa |
| Keuangan | Buku kas, jurnal, aset | Transaksi berbukti, koreksi terlacak, saldo tidak ditampilkan jika tidak aman |
| Usaha & Rantai Pasok | Katalog, pesanan, lot, rencana usaha, kemitraan | Aktivitas usaha tercatat terpisah dari keuangan organisasi dan memiliki kontrol |
| Publikasi & Komunikasi | Konten, galeri, pesan masuk | Informasi publik melewati pemeriksaan izin dan status publikasi |
| Sistem | Akun, peran, profil, konfigurasi | Akses sesuai tugas, perubahan konfigurasi dapat diaudit |

## Alur pusat bantuan dan formulir

- Pusat Bantuan adalah lokasi dokumentasi penggunaan, rancangan template, definisi kolom, prasyarat dan contoh alur.
- Pusat Bantuan bukan tempat menyimpan pengajuan operasional.
- Tombol dari dokumentasi template membuka modul pemilik data.
- Formulir tetap menjadi bagian dari modul operasional yang sudah dikenal pengguna; jangan membuat form duplikat di Pusat Bantuan.
- Field mapping yang belum selesai harus ditandai belum tersedia. Jangan mengklaim nilai template tersimpan sebelum API, schema, validasi, akses dan uji penyimpanan selesai.
- Template hanya boleh mengisi nilai awal yang aman; data sensitif tidak boleh dipreskripsikan.

## Monitoring dan laporan

- Monitoring dibangun dari record yang dapat dibaca pengguna saat itu, bukan dari angka statis.
- Setiap metrik memiliki definisi, domain sumber, filter waktu dan aturan status yang konsisten.
- Tugas terbuka, terlambat, tanpa PIC, tanpa tenggat, menunggu verifikasi, dan perlu perbaikan dihitung secara terpisah.
- Laporan harus menunjukkan periode, cakupan data, tanggal pembaruan, dan keterbatasan sumber.
- Ekspor harus mengikuti izin yang sama dengan layar. Data pribadi anggota tidak boleh masuk ekspor agregat tanpa dasar dan kebutuhan yang sah.
- Kegagalan pemuatan data harus terlihat dan dapat dicoba ulang; jangan menggantinya dengan angka nol.

## Keuangan dan pemisahan tugas

- Buku Kas dan Buku Besar tidak boleh dianggap sudah rekonsiliasi hanya karena keduanya tersedia.
- Saldo hanya boleh ditampilkan jika sumber lengkap dan valid.
- Jurnal yang sudah diposting tidak dihapus; koreksi memakai pembalikan/penyesuaian dengan referensi.
- Persetujuan, pencatatan, dan verifikasi transaksi dipisahkan sesuai kewenangan.
- Tidak ada klaim sertifikasi akuntansi, pajak, atau pembayaran daring.

## Migrasi dan kompatibilitas

- Identifikasi seluruh tabel, indeks, foreign key, owner/workspace scope, file references, enum status, dan audit history.
- Ambil backup sebelum migrasi; verifikasi restore pada staging.
- Jalankan migrasi secara additive dan idempotent bila memungkinkan.
- Rekonsiliasi jumlah record, relasi orphan, duplikasi ID, file yang hilang, dan akses per role sebelum cutover.
- Simpan mapping ID lama-baru dan log migrasi. Jangan menghapus sumber lama sebelum verifikasi dan masa retensi disetujui.
- Uji rollback aplikasi dan strategi pemulihan data; rollback schema tidak boleh diasumsikan otomatis aman.

## UI dan aksesibilitas

- Satu shell bersama untuk header, sidebar, breadcrumb, lebar konten, padding dan jarak antarkomponen.
- Menu hanya menampilkan tujuan yang berbeda dan relevan; hindari duplikasi antar kelompok.
- Desktop, tablet dan mobile menggunakan hierarki informasi yang sama.
- Semua kontrol dapat diakses keyboard, memiliki focus state dan label; tabel punya header yang jelas.
- Loading, empty, error, forbidden dan success merupakan state eksplisit.
- Animasi dekoratif tidak boleh menghambat navigasi atau mengurangi keterbacaan.

## Batas rilis

v14 adalah beta sampai seluruh release gate di `RELEASE_v14.md` terpenuhi. Preview READY hanya membuktikan deployment build selesai; bukan bukti bahwa seluruh alur, migrasi, akses, dan pengalaman browser telah lulus.
