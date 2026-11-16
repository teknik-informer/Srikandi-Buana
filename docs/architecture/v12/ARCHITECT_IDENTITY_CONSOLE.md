# Arsitek Sistem — Manajemen Identitas dan Akun Struktural

## Tujuan

Arsitek Sistem adalah pemegang kendali konfigurasi teknis Srikandi Buana. Melalui Dashboard **Pengguna dan Hak Akses**, Arsitek dapat menyiapkan email login, mengirim undangan aktivasi, menetapkan peran aplikasi, memulihkan akses, menonaktifkan akun, dan memeriksa riwayat keamanan akun kepengurusan.

Pengaturan akun ini tidak menetapkan atau mengubah keputusan organisasi. Nama jabatan tetap dicatat terpisah dari peran aplikasi dan harus mengikuti keputusan organisasi yang sah.

## Kewenangan Arsitek Sistem

- Melihat daftar akun dalam workspace dan daftar anggota dalam bentuk minimum: ID record, nama, status, dan status verifikasi.
- Menyiapkan undangan untuk akun Sekretaris, Bendahara, Koordinator, dan Anggota dengan memasukkan email yang dikendalikan organisasi.
- Mengundang Ketua pertama hanya bila belum ada akun Ketua maupun undangan Ketua yang masih berlaku.
- Mengubah peran aplikasi, jabatan, penugasan program, dan status aktif akun non-Administrator Sistem/non-Ketua.
- Membuat tautan pemulihan akun non-Administrator Sistem/non-Ketua dan mencabut undangan yang belum digunakan.
- Melihat riwayat perubahan akses dan undangan.

## Batas kewenangan

- Arsitek Sistem tidak memperoleh akses baca/tulis ke catatan bisnis, data kas, anggota secara penuh, laporan organisasi, atau paket laporan hanya karena mengelola akun.
- Arsitek tidak dapat mengubah, menonaktifkan, atau mengganti akun Ketua melalui pengelolaan akun biasa.
- Hanya satu akun Ketua aktif yang diperbolehkan. Penggantian Ketua tetap memerlukan prosedur serah-terima organisasi dan proses khusus yang diaudit.
- Arsitek tidak dapat menetapkan dirinya sebagai Ketua melalui perubahan peran.
- Pengelolaan akun tidak memberikan hak menyetujui laporan atau bertindak sebagai pengurus organisasi.

## Alur aktivasi dan keamanan

1. Arsitek memilih anggota yang statusnya **Aktif** dan **Terverifikasi**.
2. Arsitek memasukkan email struktural yang akan dipakai untuk login, lalu memilih peran aplikasi dan jabatan sesuai keputusan organisasi.
3. Sistem membuat tautan aktivasi satu kali. Tautan ditampilkan hanya saat dibuat, berlaku 48 jam, dan harus dikirim secara pribadi kepada penerima yang benar.
4. Penerima memverifikasi email dan menetapkan kata sandi sendiri. Kata sandi tidak dikirim atau disimpan oleh Arsitek.
5. Pemulihan akun menghasilkan tautan satu kali yang berlaku satu jam.
6. Perubahan peran atau penonaktifan mencabut sesi login dan undangan lama pengguna terkait.
7. Setiap tindakan dicatat dalam riwayat keamanan.

## Privasi data

Roster yang diberikan kepada Arsitek hanya memuat identitas minimum yang diperlukan untuk menghubungkan akun dengan anggota. Nomor telepon, alamat, catatan pribadi, kebutuhan rumah tangga, dan rincian operasional tidak disertakan. API data bisnis tetap menolak akses untuk peran teknis.

## Catatan cakupan

Email baru ditetapkan saat membuat undangan akun. Untuk akun yang sudah aktif, Arsitek dapat meminta perubahan email melalui tautan verifikasi satu kali yang dikirimkan secara pribadi kepada pemilik alamat baru. Alamat lama tetap berlaku sampai tautan diverifikasi. Token hanya terikat pada akun sasaran, workspace, dan alamat email baru; proses memeriksa konflik alamat, kedaluwarsa, pencabutan, dan penggunaan ulang secara atomik. Setelah berhasil, sesi login lama dicabut dan pengguna masuk kembali menggunakan email baru. Ketua, Administrator Sistem, dan akun Arsitek sendiri tidak dapat diubah melalui alur biasa. Password tidak diminta atau diubah dalam proses ini. Tautan perubahan email berlaku satu jam dan hanya ditampilkan saat dibuat.

 
## Pengiriman email transaksional

Undangan aktivasi, pemulihan akses, dan verifikasi perubahan email dikirim otomatis menggunakan Nodemailer melalui akun Gmail resmi `kwt.srikandibuana@gmail.com`. Kredensial menggunakan Google App Password yang disimpan sebagai variabel rahasia lingkungan server, bukan di repositori atau browser. Variabel yang diperlukan: `GMAIL_USER` dan `GMAIL_APP_PASSWORD`. Pengiriman email gagal menyebabkan undangan yang baru dibuat langsung dicabut dan dicatat dalam audit, sehingga tautan yang tidak terkirim tidak dibiarkan aktif. API tidak mengembalikan token atau tautan privat ke dashboard.
