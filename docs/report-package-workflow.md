# Paket Laporan Resmi — Fondasi dan Kontrak Alur

**Status per 14 November 2026:** API GET/POST/PATCH dan UI awal telah ditambahkan pada PR #17. Migrasi `009_report_packages.sql` telah diterapkan hanya pada cabang Neon QA `srikandi-v12-sanitized-qa-20261106` (`br-mute-meadow-b4rhx1mn`). Uji trigger imutabilitas database dengan fixture sementara yang di-rollback berhasil. CI 14/14 dan Preview Vercel untuk commit `cb2142c328fe418f09d705bdd8ded7620ea81b43` berhasil. UAT alur API terautentikasi, generator PDF/Excel, distribusi eksternal, dan persetujuan Production masih belum selesai. UAT lintas peran saat ini terblokir karena cabang QA hanya memiliki satu akun Administrator Sistem; belum ada akun Ketua, Sekretariat, Bendahara, atau Koordinator. Terdapat satu record anggota Aktif dan Terverifikasi yang belum terhubung ke akun; identitas/jabatannya belum diverifikasi untuk bootstrap Ketua. Tidak ada migrasi Production.

## Tujuan

Memisahkan rekap operasional yang bisa berubah dari paket laporan yang telah diperiksa dan disahkan. CSV dari layar laporan tetap merupakan alat kerja internal, bukan dokumen final yang otomatis sah untuk diserahkan kepada Dinas atau mitra.

## Alur status

1. **Draft** — penyusun domain membuat paket dari data yang dapat diaksesnya. Sistem menyimpan snapshot, manifest sumber, rentang periode, versi, dan hash.
2. **Verified** — pemilik domain memeriksa kecocokan snapshot dengan catatan sumber dan memberi catatan verifikasi. Verifikasi tidak mengubah data sumber.
3. **Approved** — Ketua menyetujui snapshot yang sama persis. Persetujuan tidak boleh sekaligus mengubah isi paket.
4. **Rejected** — Ketua menolak dengan alasan; paket tetap disimpan sebagai jejak audit.
5. **Superseded** — paket lama ditandai tidak berlaku ketika sumber berubah atau versi baru dibuat. Paket lama tidak dihapus.

Perubahan isi sumber setelah paket dibuat harus membuat paket tidak layak disahkan. Sebelum persetujuan, server wajib membaca ulang setiap sumber dalam manifest dan membandingkan ID, jenis, waktu pembaruan, serta hash data dengan snapshot. Bila satu saja berbeda atau sumber tidak lagi dapat diakses, server menolak persetujuan dan meminta pembuatan versi baru. Jangan mengandalkan tombol UI atau status yang dikirim browser.

## Pembagian kewenangan

- Sekretaris menyusun, memverifikasi, dan membaca paket operasional, keanggotaan, administrasi, dan publikasi; tidak membaca paket keuangan/usaha.
- Bendahara menyusun, memverifikasi, dan membaca paket keuangan dan usaha/aset; tidak membaca paket sekretariat.
- Ketua dapat membaca paket lintas domain untuk keputusan organisasi. Koordinator hanya membaca paket operasional yang dibuat oleh akunnya sendiri.
- Tampilan paket lintas domain untuk Ketua menerapkan proyeksi privasi: jenis sumber yang berpotensi memuat identitas atau dokumen privat hanya menampilkan metadata terbatas; snapshot tersimpan tetap utuh untuk integritas dan verifikasi internal.
- Koordinator hanya dapat menyusun paket operasional dari program yang ditugaskan; Sekretariat memeriksa kelengkapan administrasi sebelum diajukan kepada Ketua.
- Ketua hanya menyetujui paket yang sudah diverifikasi, bukan mengedit baris sumber atau mengesahkan paket buatannya sendiri.
- Administrator Sistem tidak membaca, menyusun, memverifikasi, atau menyetujui paket bisnis.
- Pihak eksternal tidak mendapat akses ke paket internal secara otomatis. Distribusi memerlukan grant terpisah yang menyebut penerima, tujuan, ruang lingkup, masa berlaku, dan pencabutan.

## Kontrak penyimpanan

Migrasi menambahkan dua tabel:

- `report_packages`: metadata paket, manifest sumber, snapshot, hash, versi, status, serta identitas/waktu verifikasi dan persetujuan.
- `report_package_events`: jejak perubahan status append-only.

Database menolak perubahan atau penghapusan snapshot, manifest, hash, identitas sumber, dan versi. Untuk koreksi, buat paket versi baru. Event historis tidak dapat diubah atau dihapus.

## Aturan privasi dan kualitas

- Paket keanggotaan hanya memuat agregat status; jangan menyimpan nama, alamat, nomor telepon, NIK, atau daftar anggota dalam snapshot ekspor.
- Kehadiran disimpan sebagai jumlah agregat untuk laporan lintas organisasi, bukan daftar identitas.
- Laporan keuangan harus menggunakan ledger yang telah diposting dan seimbang; jangan menjumlahkan Buku Kas dan Buku Besar yang belum direkonsiliasi.
- Setiap sumber harus memiliki ID, jenis, waktu pembaruan, dan fingerprint konten yang benar-benar digunakan. API awal memakai MD5 atas representasi JSONB bersama timestamp untuk mendeteksi perubahan sumber; MD5 ini hanya fingerprint perubahan, bukan bukti keamanan atau tanda tangan. Hash snapshot paket tetap SHA-256.
- Hash snapshot adalah checksum integritas, bukan tanda tangan elektronik atau bukti identitas pejabat.
- Persetujuan Ketua belum menggantikan nomor surat resmi, tanda tangan basah/elektronik, atau prosedur pengesahan yang ditetapkan organisasi.

## Kriteria selesai sebelum produksi

1. API awal tersedia untuk membuat, membaca, memverifikasi, menyetujui, dan menolak paket sesuai role; UAT API terautentikasi pada Preview/QA masih diperlukan.
2. Verifikasi domain serta persetujuan Ketua terikat pada hash yang sama dan mencegah persetujuan sendiri; perlu dibuktikan melalui akun uji tiap role.
3. Pemeriksaan sumber saat persetujuan mendeteksi data yang berubah atau dihapus; uji perubahan sumber, pencabutan akses, dan kondisi konkurensi masih perlu dibuktikan pada QA.
4. Regression test statis membatasi pembacaan paket per domain; UAT harus membuktikan Administrator Sistem dan akun eksternal tidak dapat membaca paket internal.
5. Generator PDF/Excel hanya membaca paket berstatus approved dan mencantumkan versi, periode, hash, waktu, serta identitas pengesah.
6. Distribusi eksternal menggunakan grant yang dapat dicabut dan tidak membocorkan data pribadi.
7. Migrasi telah diterapkan dan diverifikasi pada database QA yang disanitasi; belum ada izin untuk menerapkannya ke Neon produksi. Tidak ada migrasi otomatis yang dijalankan oleh endpoint API.

