# WhatsApp Srikandi Buana — kebijakan dan aktivasi bertahap

## Keputusan operasional saat ini

Integrasi WhatsApp **dinonaktifkan secara default**. Gmail tetap menjadi kanal aktif untuk verifikasi akun, undangan, perubahan email, dan pemulihan akses.

Belum ada gateway OpenWA, server persisten, atau anggaran operasional yang disetujui. Karena itu:
- Jangan memasang OpenWA pada komputer kerja/laptop pengurus.
- Jangan menambahkan URL gateway, API key, atau session ID ke Vercel.
- Jangan mengaktifkan pengiriman WhatsApp sebelum ada host yang dikelola dan disetujui.
- Tombol uji koneksi OpenWA tidak ditampilkan sebagai layanan aktif; pilihan aktivasi WhatsApp ditandai belum diaktifkan.
- Kegagalan/ketiadaan gateway tidak boleh mengganggu pengiriman Gmail.

## Lingkup WhatsApp yang direncanakan

Jika kelak diaktifkan, WhatsApp hanya digunakan untuk:
1. Menautkan nomor khusus organisasi melalui QR pairing pada gateway yang dikelola.
2. Mengirim notifikasi dan pengumuman keluar kepada penerima yang relevan dan telah menyetujui pesan.
3. Mencatat status permintaan/pengiriman dan hasil yang benar-benar dikonfirmasi gateway.

Di luar lingkup:
- Tidak menerima, membaca, menyimpan, atau memproses pesan masuk.
- Tidak membuat chatbot atau layanan balas otomatis.
- Aktivasi dan pemulihan akun melalui WhatsApp tetap dinonaktifkan; Gmail menjadi jalur operasional utama.
- Tidak melakukan broadcast massal tanpa persetujuan penerima.

QR pairing OpenWA adalah proses menautkan perangkat WhatsApp ke gateway; QR itu bukan QR untuk mengirim broadcast. Pembuatan QR pairing tetap memerlukan gateway OpenWA yang sedang berjalan. Aplikasi tidak dapat menghasilkan QR pairing WhatsApp secara mandiri tanpa sesi gateway.

## Arsitektur jika anggaran tersedia

Srikandi Buana tetap berjalan di Vercel. OpenWA berjalan pada layanan cloud/VPS persisten yang mendukung Docker dan penyimpanan sesi. Vercel hanya memanggil API gateway melalui HTTPS.

Persyaratan minimum:
- Host persisten dengan restart policy dan volume penyimpanan sesi.
- HTTPS, firewall, pembatasan akses API, dan API key khusus pengiriman.
- Nomor WhatsApp khusus organisasi, bukan nomor pribadi pengurus.
- Konfigurasi gateway tanpa webhook/listener pesan masuk; hanya endpoint status/pairing dan pengiriman keluar yang dibutuhkan.
- Pengujian Preview dengan nomor penerima yang menyetujui pesan sebelum operasional.

OpenWA adalah proyek self-hosted dan bukan WhatsApp Business Platform resmi Meta. Otomatisasi WhatsApp Web memiliki risiko pembatasan akun. Untuk notifikasi organisasi yang kritis atau skala besar, evaluasi WhatsApp Business Platform/Cloud API resmi Meta sebagai alternatif yang lebih sesuai kebijakan, dengan konsekuensi biaya dan template messaging.

## Gerbang aktivasi teknis

Aktivasi hanya dilakukan setelah ada persetujuan anggaran dan host:
1. Siapkan host persisten yang mendukung Docker dan volume.
2. Ikuti dokumentasi resmi OpenWA untuk deployment production dan pairing QR.
3. Buat session khusus Srikandi Buana dan pastikan statusnya siap.
4. Buat API key terbatas untuk aplikasi.
5. Tambahkan environment berikut pada Preview saja, lalu redeploy:
   - `OPENWA_OUTBOUND_ENABLED=true`
   - `OPENWA_BASE_URL`
   - `OPENWA_API_KEY`
   - `OPENWA_SESSION_ID`
6. Uji status session, satu notifikasi opt-in, deduplikasi, audit, dan kegagalan jaringan.
7. Pastikan tidak ada handler pesan masuk/webhook yang diaktifkan.
8. Setelah UAT dan persetujuan terpisah, baru pertimbangkan konfigurasi Production.

Jangan menaruh API key di source code, browser, atau repository. Jangan mengirim nilai rahasia melalui percakapan.

## Referensi resmi

- https://www.open-wa.org/
- https://docs.open-wa.org/
- https://docs.open-wa.org/guides/authentication
- https://docs.open-wa.org/guides/sending-messages
- https://docs.open-wa.org/operations/security-and-deployment
