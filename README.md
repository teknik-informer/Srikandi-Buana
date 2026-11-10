# SRIKANDI BUANA — Core v1

**Arah produk:** sederhana, bersih, dan kuat untuk mengelola organisasi, menerbitkan informasi, serta menghasilkan laporan yang dapat dipertanggungjawabkan.

Status: **pembangunan ulang fondasi**. Branch kerja: `rebuild/srikandi-core-v1`.

## Empat area kerja

- **Organisasi** — profil, struktur, anggota, program, kegiatan, aset.
- **Publikasi** — berita, pengumuman, dokumentasi, halaman informasi.
- **Pelaporan** — laporan kegiatan, program, anggota, aset, dan keuangan.
- **Administrasi** — pengguna, hak akses, pengaturan, keamanan, audit.

Prinsip utama: satu kali input, satu sumber data, tanpa entri ulang untuk publikasi atau laporan.

## Dokumen keputusan

- [Prinsip dan Arsitektur Induk v1](docs/PRINSIP_DAN_ARSITEKTUR_INDUK_v1.md)
- [Audit Awal dan Keputusan Reset](docs/AUDIT_AWAL_RESET_v1.md)

Dokumen v11.5/v12 adalah catatan historis, bukan acuan pembangunan v1.

## Teknologi

- Next.js App Router, React, TypeScript.
- PostgreSQL di Neon sebagai satu sumber data utama.
- Modular monolith; tidak membuat microservices tanpa kebutuhan terukur.
- Validasi, autentikasi, dan otorisasi wajib ditegakkan di server.
- Penyimpanan dokumen privat dengan pemeriksaan izin pada setiap akses.

## Database

Database v1 berada di project Neon **Srikandi Buana Core** pada region Singapore. Migrasi aktif v1 berada di `migrations/v1/`; migrasi lama pada direktori `migrations/` tidak dijalankan oleh migrator v1.

Set environment `DATABASE_URL` ke database v1 sebelum menjalankan:

```bash
npm ci
npm run db:migrate
npm run typecheck
npm run build
```

Jangan menaruh connection string, password, token, dokumen privat, atau data anggota ke repository.

## Gerbang penerimaan

Fitur hanya dinyatakan selesai setelah alur pengguna, hak akses negatif, integritas database, pengujian integrasi, pengujian browser terautentikasi, dan hasil build lulus. Build saja bukan bukti bahwa fitur berfungsi.
