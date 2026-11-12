# Rancangan Operasional Awal KWT Srikandi Buana
**Status: RANCANGAN KERJA — belum disahkan oleh kelompok**
**Tujuan:** menjadi dasar sementara untuk menyederhanakan aplikasi selama KWT masih dalam tahap rintisan. Dokumen ini adalah analisis produk/operasional, bukan AD/ART, keputusan rapat, atau kebijakan resmi organisasi.

## 1. Prinsip dasar
1. Mulai dari kebutuhan nyata; jangan membuat prosedur hanya agar aplikasi terlihat lengkap.
2. Catatan yang belum diperiksa harus terlihat sebagai draf/belum diverifikasi, bukan data resmi.
3. Setiap pekerjaan mempunyai penanggung jawab, status, dan langkah berikutnya yang jelas.
4. Data pribadi anggota hanya terlihat oleh pihak yang memang memerlukannya.
5. Saldo keuangan berasal dari transaksi yang tercatat dan dapat ditelusuri; jangan mengetik saldo akhir secara manual.
6. Informasi publik diterbitkan setelah diperiksa. Tidak ada publikasi otomatis dari draf.
7. Pemerintah, Dinas, NGO, dan Yayasan bukan jabatan internal. Akses mereka bersifat terbatas, berbatas tujuan, dan dapat berakhir.

## 2. Empat ruang pengguna
| Ruang | Kegunaan utama | Batas awal |
|---|---|---|
| Pengurus | Mengatur fondasi kelompok, keanggotaan, program, kegiatan, dokumen, dan pertanggungjawaban. | Setiap tindakan mengikuti hak akses dan jejak perubahan. |
| Anggota | Melihat informasi kelompok, agenda, profil sendiri, dan mengajukan koreksi data. | Tidak melihat data pribadi anggota lain atau buku kas internal. |
| Pemerintah/Dinas | Melihat ringkasan data/program yang dibagikan untuk tujuan tertentu. | Tidak mendapat akses otomatis ke data mentah atau data pribadi. |
| NGO/Yayasan/Mitra | Melihat informasi program/kemitraan yang secara khusus dibagikan. | Tidak mendapat akses otomatis ke data keuangan mentah atau seluruh data organisasi. |

## 3. Pembagian kerja sementara
Pembagian ini adalah usulan untuk memudahkan operasional. Nama pemegang jabatan dan keputusan final harus diisi berdasarkan kesepakatan kelompok.

| Peran | Fokus pekerjaan yang disarankan | Batas penting |
|---|---|---|
| Ketua | Menjaga arah, menyetujui keputusan penting, memeriksa laporan, dan memberi persetujuan akhir untuk hal yang ditetapkan kelompok. | Tidak perlu mengerjakan semua input administrasi. |
| Sekretaris | Menata data anggota/pengurus, agenda, notulen, surat, dokumen, dan menyiapkan draf informasi. | Draf belum menjadi keputusan/publikasi sebelum pemeriksaan yang sesuai. |
| Bendahara | Mencatat pemasukan/pengeluaran, bukti transaksi, kas, dan menyiapkan laporan keuangan. | Tidak menghapus jejak transaksi; koreksi dilakukan sebagai catatan koreksi. |
| Koordinator | Menjalankan program yang ditugaskan, mencatat kemajuan, kendala, kebutuhan, dan bukti kegiatan. | Lingkup data dan pekerjaan dibatasi pada program penugasannya. |
| Anggota | Memperbarui informasi sendiri melalui mekanisme yang disediakan, mengikuti kegiatan, dan menyampaikan usulan. | Tidak mengubah catatan anggota lain atau data keuangan organisasi. |
| Administrator sistem | Mengelola akun, konfigurasi, keamanan, dan dukungan teknis. | Administrator teknis bukan pengganti keputusan Ketua/rapat organisasi. |

## 4. Alur kerja minimum
**Catat draf → Periksa → Setujui (bila diperlukan) → Publikasikan / jalankan → Laporkan.**

- Draf: pembuat memasukkan informasi dan lampiran.
- Periksa: pihak yang bertanggung jawab memeriksa kelengkapan, sumber, tanggal, dan bukti.
- Setujui: Ketua atau pihak yang ditunjuk kelompok memberi persetujuan untuk keputusan/publikasi yang memerlukannya.
- Publikasikan/jalankan: hanya informasi yang disetujui dipublikasikan; tugas yang disetujui dapat dijalankan oleh penanggung jawab.
- Laporkan: hasil, kendala, dan bukti disimpan pada catatan asal.

Untuk pekerjaan sederhana yang tidak memerlukan persetujuan formal, aplikasi cukup mencatat siapa yang membuat/memeriksa dan statusnya. Jangan menambah lapisan persetujuan tanpa alasan.

## 5. Urutan memulai kelompok
1. Catat susunan pengurus yang benar-benar sudah disepakati.
2. Mulai daftar anggota berdasarkan persetujuan mereka; tandai yang belum lengkap/belum diverifikasi.
3. Pilih satu sampai tiga program awal yang realistis, bukan langsung mengaktifkan seluruh daftar program.
4. Jadwalkan pertemuan/kegiatan pertama dan catat hasilnya.
5. Setelah aktivitas berjalan, aktifkan pembukuan kas dan laporan berdasarkan transaksi sebenarnya.
6. Buka akses pihak luar hanya ketika ada tujuan, data yang dibagikan, penanggung jawab, dan masa berlaku yang jelas.

## 6. Dokumen, laporan, dan keuangan
- PDF adalah keluaran dokumen yang siap dibaca/dicetak setelah isi diperiksa; status draf harus tetap terlihat sebelum persetujuan.
- Excel adalah ekspor data sesuai hak akses, dengan periode dan waktu ekspor yang jelas. Ekspor tidak boleh memperluas akses pengguna.
- Laporan eksternal hanya memuat ruang lingkup yang disetujui dan data agregat bila identitas pribadi tidak diperlukan.
- Transaksi memiliki tanggal, jenis, nominal, kategori, keterangan, dan bukti bila tersedia. Laporan dihitung dari transaksi; saldo tidak dibuat dari angka perkiraan.
- Riwayat perubahan dan koreksi dipertahankan untuk membantu pemeriksaan.

## 7. Aturan desain aplikasi
- Beranda menampilkan pekerjaan berikutnya, bukan seluruh menu sekaligus.
- Gunakan satu istilah untuk satu fungsi; hindari menu duplikat.
- Formulir dipecah menjadi langkah kecil dan menyimpan kemajuan bila memungkinkan.
- Tampilkan status dengan bahasa sederhana: Draf, Perlu diperiksa, Menunggu persetujuan, Disetujui, Berjalan, Selesai, atau Perlu diperbaiki.
- Setiap layar menjawab tiga pertanyaan: data apa ini, siapa yang bertanggung jawab, dan apa langkah selanjutnya?
- Saat belum ada data, jelaskan apa yang perlu dimulai; jangan menampilkan angka nol seolah-olah sudah ada aktivitas.
- Gunakan tampilan mobile sebagai pengalaman utama bagi anggota/pengurus yang bekerja dari HP.

## 8. Batas penerapan
Rancangan ini tidak mengubah kebijakan organisasi secara otomatis. Penyesuaian struktur jabatan, hak suara, kewenangan hukum, kuorum, persetujuan anggaran, pembukaan rekening, tanda tangan, atau pengesahan laporan harus menunggu keputusan kelompok yang berwenang. Sampai ada keputusan tersebut, aplikasi harus menjaga status sebagai rancangan/draf dan tidak mengarang keputusan organisasi.
