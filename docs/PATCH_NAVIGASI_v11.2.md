# SRIKANDI BUANA v11.2 — Navigasi Staging

**Basis:** `SRIKANDI_BUANA_Source_Asli_v11_1_Enterprise_Staging.zip`, yang berasal dari seluruh 306 berkas source deployment v11.

**Masukan tambahan:** `SRIKANDI_BUANA_v10.17_patch_navigasi(1).zip` (berisi skrip perubahan label dan README, **bukan source lengkap**).

Patch diterapkan **pada salinan v11.1**, bukan mengganti proyek dengan v10.17 dan bukan deployment produksi. Tidak ada migrasi database.

## Perubahan

Tiga belas nama menu yang ditemukan pada `src/lib/navigation-config.ts` diperbarui tanpa mengganti ID atau URL. Entri fallback `Rencana 30-90 hari` dari patch tidak ditemukan karena source memakai `Rencana 30–90 hari`.

| No. | Label lama | Label baru |
|---:|---|---|
| 1 | Organisasi & anggota | Manajemen Organisasi |
| 2 | Data anggota | Keanggotaan |
| 3 | Verifikasi pengurus | Struktur & Kepengurusan |
| 4 | Persetujuan data | Verifikasi & Persetujuan |
| 5 | Program & kegiatan | Perencanaan & Program |
| 6 | Rencana 30–90 hari | Rencana Tindak Lanjut |
| 7 | Kegiatan & pertemuan | Agenda & Kegiatan |
| 8 | Daftar hadir | Kehadiran |
| 9 | Keuangan & usaha | Keuangan & Akuntansi |
| 10 | Buku kas | Pengelolaan Kas |
| 11 | Laporan kas | Laporan Keuangan |
| 12 | Usaha & KUB | Pengembangan Usaha |
| 13 | Inventaris aset | Aset & Inventaris |

- Judul modul organisasi, keanggotaan, tindak lanjut, kegiatan, keuangan, persetujuan, aset, dan usaha di `src/lib/srikandi.ts` diselaraskan dengan menu.
- Judul laporan dan kehadiran di workspace admin serta anggota diselaraskan.
- Petunjuk antarmuka yang mengarahkan ke menu Keanggotaan dan Agenda & Kegiatan disesuaikan.
- Tidak ada perubahan pada konfigurasi RBAC, API, rute, operasi database, migrasi atau laporan historis.

**Batasan semantik:** `Keuangan & Akuntansi` dan `Laporan Keuangan` pada patch ini adalah **label antarmuka**, bukan bukti bahwa aplikasi sudah memiliki pembukuan double-entry atau laporan akuntansi lengkap. Saat ini data utama modul tersebut masih berbasis kas. Sebelum rilis, tinjau kembali istilah yang paling tepat bagi alur yang benar-benar tersedia.

## Cara menjalankan

```bash
npm ci
npm run test:navigation:compat
npm run typecheck
npm test
npm run build
```

Pengujian `test:navigation:compat` tidak membutuhkan `node_modules`, sedangkan test suite proyek, typecheck dan build membutuhkan dependensi. Jangan gunakan database produksi untuk uji migrasi.

**Status:** staging untuk integrasi. Produksi tetap tidak diubah.
