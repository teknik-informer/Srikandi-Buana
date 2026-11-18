# Integrasi OpenWA — Srikandi Buana

## Arsitektur

Srikandi Buana berjalan di Vercel. OpenWA adalah gateway WhatsApp yang harus berjalan sebagai layanan Node.js/Docker tersendiri dan terus aktif. Vercel memanggil REST API OpenWA melalui HTTPS; sesi WhatsApp tidak dijalankan di dalam fungsi serverless Vercel.

Situs dan dokumentasi proyek: https://www.open-wa.org/ dan https://docs.open-wa.org/

## Menjalankan gateway

1. Siapkan host yang selalu aktif dan mendukung Docker. Jangan mengandalkan laptop/desktop yang sering dimatikan untuk operasional kelompok.
2. Ikuti Quick Start resmi OpenWA: clone repository OpenWA, lalu jalankan `docker compose -f docker-compose.dev.yml up -d` untuk uji awal. Untuk operasional, gunakan konfigurasi Docker production resmi, volume persisten, HTTPS, firewall, dan restart policy.
3. Buka dashboard OpenWA pada host, buat satu session khusus Srikandi Buana, lalu tautkan nomor WhatsApp organisasi melalui QR/perangkat tertaut.
4. Pastikan session berstatus `ready`. Simpan session ID yang dikembalikan OpenWA.
5. Buat API key operator khusus integrasi Srikandi Buana. Jangan gunakan key admin gateway untuk aplikasi bila key operator dengan izin kirim sudah cukup.
6. Pastikan API gateway hanya dapat diakses melalui HTTPS dan API key tidak pernah dikirim ke browser.

## Environment Vercel — Preview terlebih dahulu

Tambahkan variabel berikut ke environment Preview, kemudian redeploy Preview:

- `OPENWA_BASE_URL`: root URL gateway, misalnya `https://wa-gateway.example.org` (tanpa `/api` juga diterima).
- `OPENWA_API_KEY`: API key operator OpenWA.
- `OPENWA_SESSION_ID`: ID session WhatsApp yang sudah berstatus `ready`.

Jangan menaruh API key di source code, browser, atau repository. Jangan mengirim nilai rahasia melalui percakapan.

## Pengujian di Srikandi Buana

1. Masuk sebagai Administrator Sistem di Preview.
2. Buka Pengguna dan Hak Akses.
3. Tekan **Uji koneksi OpenWA**. Status harus menunjukkan session `ready`.
4. Uji undangan WhatsApp menggunakan akun uji dan nomor yang pemiliknya telah menyetujui pesan.
5. Pastikan pesan diterima, tautan aktivasi dapat dipakai sekali, dan audit tercatat.
6. Ulangi untuk pemulihan akun sebelum mengaktifkan penggunaan operasional.

## Perilaku integrasi

- Aktivasi dan pemulihan WhatsApp mengirim pesan melalui `POST /api/sessions/{sessionId}/messages/send-text`.
- Pengiriman menggunakan `X-API-Key`, format penerima `62xxxxxxxxxx@c.us`, dan `Idempotency-Key`.
- Sistem hanya mengirim setelah Admin mengonfirmasi nomor dan tindakan undangan/pemulihan dimulai.
- Jika gateway tidak tersedia atau session belum `ready`, undangan yang belum terkirim dibatalkan agar tautan tidak beredar tanpa pesan.
- Email tetap melalui Gmail SMTP; OpenWA tidak menggantikan layanan email.

## Catatan operasional

OpenWA adalah proyek independen, bukan WhatsApp Business Platform/Cloud API resmi Meta. Otomatisasi melalui WhatsApp Web memiliki risiko pembatasan akun. Gunakan nomor khusus organisasi, hanya kirim pesan yang diminta/diantisipasi penerima, batasi frekuensi, dan jangan melakukan broadcast dingin. OpenWA gratis dan MIT-licensed menurut situs proyek, tetapi host server, domain, dan pemeliharaan dapat tetap memerlukan biaya.

## Referensi

- https://www.open-wa.org/
- https://docs.open-wa.org/guides/authentication
- https://docs.open-wa.org/guides/sending-messages
- https://docs.open-wa.org/operations/security-and-deployment
