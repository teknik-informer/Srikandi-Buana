# SRIKANDI BUANA v14 — Integrasi ERP Keuangan

## Tujuan

Mengadopsi alur kerja praktis Manager.io ke dalam SRIKANDI BUANA tanpa menjalankan aplikasi akuntansi terpisah. Buku Induk Anggota, program, kegiatan, aset, usaha, transaksi kas, jurnal, dan laporan tetap berada dalam satu sumber data organisasi.

Prinsip integrasi: **satu transaksi operasional, satu sumber pencatatan, satu jejak audit**. Data yang sama tidak boleh diketik ulang sebagai transaksi keuangan di modul lain.

## Yang sudah diimplementasikan pada branch v14

1. **Bagan akun awal per organisasi** dengan kategori aset, kewajiban, modal, pendapatan, dan beban. Akun awal hanya dibuat bila kode belum dipakai; nama/kategori akun yang bentrok menghentikan inisialisasi agar data lama tidak tertimpa.
2. **Buku Kas → Jurnal Buku Besar**. Transaksi kas baru menyertakan akun lawan. Sistem memvalidasi akun itu milik organisasi yang sama, masih aktif, dan kategorinya sesuai dengan arus masuk/keluar.
3. **Simpanan dan modal tidak otomatis diakui sebagai pendapatan**. Penerimaan dapat dipetakan ke aset, kewajiban, modal, atau pendapatan. Pengeluaran dapat dipetakan ke aset, kewajiban, modal, atau beban.
4. **Posting atomik**. Catatan Buku Kas, audit, sinkronisasi V14 yang relevan, dan baris jurnal disimpan dalam satu batch transaksi database.
5. **Pencegahan duplikasi**. Referensi jurnal dari Buku Kas deterministik berdasarkan ID sumber. Pengiriman ulang yang identik tidak membuat jurnal kedua.
6. **Jurnal multi-baris**. Jurnal umum mendukung 2–50 baris akun, setiap akun maksimal satu kali per jurnal, dan total debit harus sama dengan total kredit.
7. **Koreksi tanpa menghapus sejarah**. Jurnal yang diposting tidak diedit atau dihapus. Koreksi dilakukan dengan jurnal pembalik dan jejak audit.
8. **Laporan**. Neraca saldo, aktivitas keuangan, posisi aset/kewajiban/modal, surplus/defisit, dan ekspor CSV dihitung dari saldo jurnal yang sudah diposting.
9. **Pengendalian akses**. Membaca laporan dibatasi kepada admin, ketua, dan bendahara; penulisan akun/jurnal dibatasi admin dan bendahara.

## Bagan akun awal

| Kode | Akun | Kategori |
|---|---|---|
| 110001 | Kas Organisasi | Aset |
| 110002 | Kas Program | Aset |
| 110003 | Kas Usaha | Aset |
| 120001 | Piutang Simpan Pinjam Anggota | Aset |
| 130001 | Persediaan Usaha | Aset |
| 140001 | Peralatan dan Aset Tetap | Aset |
| 210001 | Simpanan Anggota | Kewajiban |
| 210002 | Dana Titipan Program | Kewajiban |
| 210003 | Utang Usaha | Kewajiban |
| 310001 | Modal Kelompok | Modal |
| 410001–410003 | Pendapatan Organisasi, Program, dan Penjualan Usaha | Pendapatan |
| 510001–510004 | Beban Organisasi, Program, Usaha, dan Operasional Produksi | Beban |

Kode awal bukan pengganti keputusan kelompok. Organisasi boleh menambah akun sesuai kebutuhan dan kebijakan yang telah disetujui. Kode sistem awal yang bentrok tidak akan ditimpa otomatis.

## Alur pencatatan Buku Kas

1. Pilih Pemasukan atau Pengeluaran, tanggal, nominal, dan pos dana: Organisasi, Program, atau Usaha.
2. Pilih akun lawan berdasarkan substansi ekonomi, bukan hanya nama transaksi.
3. Lampirkan bukti dan tulis referensi/dasar persetujuan.
4. Simpan. Catatan sumber dan jurnal berpasangan terbentuk dalam satu transaksi database.
5. Periksa jurnal pada Akuntansi dan Buku Besar.

Contoh pemetaan (bukan aturan tarif atau kebijakan pinjaman):

- Setoran tabungan anggota: Debit Kas, Kredit Simpanan Anggota (kewajiban).
- Penerimaan penjualan yang memang sudah menjadi hak kelompok: Debit Kas, Kredit Pendapatan Penjualan.
- Pelunasan piutang: Debit Kas, Kredit Piutang.
- Pembelian peralatan yang memenuhi kebijakan kapitalisasi: Debit Peralatan, Kredit Kas.
- Beban operasional yang disetujui: Debit Beban, Kredit Kas.

Jurnal tidak menebak akun dari uraian. Bendahara memilih akun lawan dan bertanggung jawab memeriksa bukti serta substansinya.

## Saldo awal dan catatan historis

- Bagan akun tanpa jurnal tidak berarti laporan posisi keuangan sudah seimbang atau final.
- Saldo awal harus dimasukkan melalui Jurnal Umum berdasarkan tanggal cut-off dan daftar saldo yang telah diperiksa/ditandatangani.
- Jurnal pembukaan mengakui saldo aset, kewajiban, serta modal yang benar; saldo awal bukan pendapatan baru.
- Catatan Buku Kas lama tidak dibukukan otomatis. Catatan historis harus ditinjau satu per satu, tentukan akun lawan dari bukti, lalu simpan kembali untuk membuat jurnal sumber. Jangan mengubah nominal/tanggal hanya untuk memaksa rekonsiliasi.
- Laporan saat ini hanya mencakup jurnal yang telah diposting. Periode sebelum tanggal cut-off, rekonsiliasi bank, dan saldo awal yang belum dimasukkan tidak boleh ditampilkan seolah-olah telah lengkap.

## Batas integrasi perdagangan

- Pesanan katalog saat ini mencatat permintaan, reservasi stok, dan status proses. Status pesanan **bukan bukti pembayaran**.
- Pengakuan pendapatan, piutang pelanggan, retur, harga pokok penjualan, pembelian pemasok, dan utang usaha memerlukan dokumen/integrasi subledger tersendiri sebelum dijalankan otomatis.
- Stok produk dagang saat ini memiliki riwayat perubahan, tetapi belum menjadi nilai persediaan akuntansi. Jangan menganggap kuantitas stok sebagai nilai rupiah persediaan.
- Penerimaan kas yang terkait pesanan harus didukung bukti dan dipetakan ke akun yang tepat; pesanan tidak boleh otomatis diklaim lunas.

## Fitur yang belum boleh dianggap aktif

- Buku tabungan anggota dengan saldo berjalan dan mutasi per anggota.
- Simpan-pinjam dengan pengajuan, persetujuan, akad, pencairan, angsuran, denda/bunga, dan pelunasan.
- Tagihan pemasok, pesanan pembelian, faktur penjualan, piutang pelanggan, utang usaha, pajak, serta harga pokok persediaan.
- Gaji, honorarium, tunjangan, dan pembagian hasil usaha.
- Rekonsiliasi bank, arus kas formal, laporan periode tutup buku, dan kontrol tutup periode.

Aktivasi memerlukan skema subledger, dokumen sumber, otorisasi, pengujian rekonsiliasi, dan kebijakan tertulis. Jangan mengarang bunga, batas pinjaman, jadwal angsuran, nominal gaji, tunjangan, atau hak kompensasi. Nilai-nilai tersebut belum ditetapkan oleh makalah maupun konfigurasi yang ada.

## QA dan batas rilis

- Pengujian kode dan build dijalankan di GitHub Actions pada branch v14.
- Preview harus diverifikasi pada target database QA yang sesuai sebelum uji transaksi terautentikasi.
- Migrasi basis data dan migrasi catatan historis tidak dilakukan oleh implementasi UI ini.
- Production v11.5, alias Production, dan data Production tetap tidak disentuh.
- PR #5 tetap Draft sampai tinjauan fungsional, finansial, keamanan, dan persetujuan pemilik selesai.
