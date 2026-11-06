# SRIKANDI BUANA Enterprise v11.4.0-beta.2 — Ekosistem Digital

Status: **staging / candidate**. Jangan promosikan ke produksi sebelum seluruh pengujian berhasil dan migrasi dilakukan di database staging terpisah.

## Yang sudah diimplementasikan

1. **Notifikasi internal**: lonceng pada header, polling ringan saat tab terlihat, daftar 50 notifikasi terbaru, penghitung belum dibaca, tanda dibaca per notifikasi atau massal. Akses selalu dibatasi oleh `owner` dan `recipient_id` di server. Pemicu pertama: pesanan baru, konfirmasi/penyelesaian pesanan, dan pengajuan operasional baru; belum mencakup semua aktivitas organisasi.
2. **Katalog dan Pemesanan**: produk dengan SKU unik, harga rupiah bulat, stok, draf/publikasi, pemesanan internal bagi anggota terverifikasi, riwayat pesanan, status konfirmasi/selesai/batal oleh administrator. Reservasi stok menggunakan satu SQL atomik, pembatalan mengembalikan stok sekali saja. Tidak tersedia checkout pengunjung tanpa akun, payment gateway, faktur pajak, pelacakan ekspedisi, atau retur barang.
3. **Akuntansi dan Buku Besar**: bagan akun yang dibuat bendahara/admin, pengelompokan aset-liabilitas-ekuitas-pendapatan-beban, jurnal umum minimal dua baris seimbang debit-kredit, penyimpanan transaksi atomik dan tidak dapat disunting melalui API, riwayat 50 jurnal, agregat debit-kredit, serta neraca saldo sebelum penyesuaian. **Belum merupakan laporan keuangan yang patuh SAK EMKM** dan belum direkonsiliasi otomatis dengan Buku Kas historis.
4. **UI**: grup navigasi baru *Ekosistem Digital* tanpa mengubah 29 ID rute lama, halaman responsif dengan empty state yang jujur dan validasi akses, serta notifikasi akun di header.
5. **Keamanan**: otentikasi sesi lama, pemeriksaan Origin untuk mutasi, batas ukuran request, validasi input, pembatasan frekuensi untuk pesanan, perubahan status, dan pembacaan notifikasi, pemisahan akses per organisasi, dan tanpa hardcoded credentials.

## Aktivasi dan rollback

- Gunakan **database staging terisolasi**, jangan salin kredensial produksi ke runner CI atau repo.
- Jalankan `npm ci`, `npm run typecheck`, `npm run test:ecosystem`, `npm test`, `npm run build` dari branch fitur.
- Backup database staging, kemudian jalankan `npm run db:migrate` dengan `DATABASE_URL` staging. Migrasi baru: `migrations/005_ecosystem_foundation.sql` (additive).
- Uji autentikasi tiap role, stok ketika dua pesanan bersaing, notifikasi antar akun, posting jurnal, serta proses batal/konfirmasi pesanan.
- Buat Preview dari branch fitur. Verifikasi database preview mengarah ke staging, **bukan production**.
- Jika tidak sesuai, hentikan rilis; jangan jalankan `DROP` atau rollback destruktif terhadap tabel baru saat data telah digunakan. Nonaktifkan menu melalui rollback aplikasi dan tinjau data.

## Tahap selanjutnya agar menjadi ekosistem penuh

1. **Notifikasi lintas kanal:** email transaksional, preferensi per pengguna, Web Push dengan izin eksplisit, event outbox yang andal, masa retensi, audit pengiriman.
2. **E-commerce:** storefront publik, checkout pelanggan eksternal, alamat, keranjang, invoice, metode pembayaran berizin, webhook terverifikasi, retur, pergudangan dan pengiriman; perlu penetapan penjual legal serta SOP penjualan.
3. **Akuntansi:** chart of accounts disetujui bendahara, periode tutup buku, rekonsiliasi Buku Kas dan pesanan secara idempoten, jurnal koreksi, neraca saldo, laporan posisi keuangan, laba rugi, catatan atas laporan, audit trail dan ekspor PDF/CSV. Standar pelaporan ditentukan sesuai status hukum dan sifat entitas; jangan menyebutnya tersertifikasi sebelum review akuntan.
4. **Employee/Enterprise:** presensi, tugas, pengadaan, persetujuan bertingkat, inventaris gudang, SOP, manajemen dokumen, dashboard KPI operasional. Untuk KWT, bedakan **Anggota**, **Pengurus**, **Staf/Pegawai** sesuai hubungan kerja yang nyata.

## Referensi umum untuk review kepatuhan

- Ikatan Akuntan Indonesia (IAI), publikasi mengenai minimum laporan keuangan SAK EMKM: laporan posisi keuangan, laporan laba rugi, dan catatan atas laporan keuangan.
- UU RI Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi: minimisasi dan pembatasan tujuan, kontrol akses, dan tanggung jawab pengendali data.

**Risiko residual**: build Next.js, database PostgreSQL nyata, dan pengujian browser belum dijalankan pada artefak ini. Implementasi belum cukup untuk klaim siap produksi.
