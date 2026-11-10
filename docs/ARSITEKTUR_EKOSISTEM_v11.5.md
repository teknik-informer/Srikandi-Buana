# Arsitektur Ekosistem SRIKANDI BUANA — v11.5

## Orientasi produk

Satu identitas pengguna untuk website publik, Portal Anggota, administrasi organisasi, pengelolaan katalog, operasional dan pencatatan keuangan. Terminologi ditulis dalam bahasa Indonesia profesional dengan istilah akuntansi standar.

## Sumber kebenaran data

| Domain | Tabel | Aturan utama |
| --- | --- | --- |
| Notifikasi | `ecosystem_notifications` | Scoped by `owner` dan `recipient_id`; unread per akun. |
| Katalog | `commerce_products` | SKU unik per organisasi, harga dalam Rupiah bulat, stok tidak boleh negatif, status publikasi eksplisit. |
| Pemesanan | `commerce_orders` | Status pengajuan bukan status pembayaran. Stok dipesan atomik saat pengajuan, dipulihkan satu kali bila dibatalkan. |
| Audit stok | `commerce_stock_history` | Trigger database menyimpan stok sebelum, sesudah dan delta. Data sebelum migrasi tidak dapat direkonstruksi otomatis. |
| Buku besar | `ledger_accounts`, `ledger_entries`, `ledger_lines` | Pengelompokan akun, jurnal debit=kredit, akses bendahara/admin untuk posting. |
| Koreksi jurnal | `ledger_reversals` | Jurnal asal tidak dihapus; koreksi membalik debit/kredit dan ditautkan permanen. |

## Perilaku UI

- Produk publik ditampilkan tanpa foto palsu: kartu produk menggunakan ikon fallback selama media produk belum tersedia.
- Pemesanan saat ini hanya tersedia untuk pengguna terautentikasi, dan **bukan bukti pembayaran**.
- Administrator dapat menyunting data produk. UI/API memakai `expectedUpdated`; perubahan stok saat ada pesanan juga memperbarui timestamp versi. Bila konflik, pengguna diminta memuat ulang.
- Notifikasi dalam aplikasi memakai polling saat tab aktif. Belum tersedia push notification perangkat, email, atau WhatsApp.
- Neraca Saldo adalah rekap saldo dari jurnal aplikasi; **tidak menggabungkan transaksi Buku Kas lama** dan belum bisa dipakai sebagai laporan keuangan final.

## Masih diperlukan untuk rilis matang

1. Pengujian migrasi nyata terhadap database staging dan evaluasi data lama.
2. E2E untuk login/role, stok dalam pesanan paralel, koreksi jurnal dan akses lampiran.
3. Media produk, checkout publik, alamat, pengiriman, verifikasi pembayaran/webhook provider dan refund yang aman.
4. Rekonsiliasi Buku Kas dengan buku besar; laporan arus kas, neraca, laba rugi, periode tutup buku, ekspor laporan resmi.
5. Observabilitas, peringatan kegagalan transaksi, dashboard analitik dari data nyata.

## Tata kelola rilis

Jangan jalankan migrasi v11.5 pada database produksi tanpa cadangan dan review SQL. Lakukan uji Preview Vercel dahulu. Publikasikan hanya setelah pemeriksaan keamanan, akses, integrasi dan build lulus.
