# Audit Pemetaan Aplikasi Kanonis ke Workspace Legacy

**Tanggal:** 20 November 2026  
**Branch audit:** `reconcile/gentelella-on-master-architecture-2026-11-20`  
**Baseline kode:** `fix/v13-release-safety-gates-2026-11-17`  
**Tujuan:** memeriksa rute dan kepemilikan navigasi sebelum mengubah resolver aplikasi.

## 1. Prinsip pemeriksaan

Enam aplikasi kanonis adalah identitas produk tingkat atas. Enam workspace legacy (`hrm`, `accounting`, `crm`, `projects`, `pos`, `analytics`) tetap dipertahankan sebagai ruang kerja operasional/kompatibilitas. Rute yang tercatat bukan bukti bahwa seluruh workflow aplikasi telah selesai.

Audit ini bersifat statis terhadap registry, catch-all dashboard route, dan katalog kesiapan modul. Tidak ada perubahan route, policy, data, migrasi, atau Production.

## 2. Pemetaan aplikasi kanonis saat ini

| Aplikasi kanonis | Landing route saat ini | Workspace legacy terkait di registry kanonis | Temuan |
|---|---|---|---|
| Platform Core | `/dashboard/module-center` | Tidak ada (layanan fondasi) | Route pusat modul tersedia. Perlu dipisahkan secara konseptual dari aplikasi operasional dan konfigurasi organisasi. |
| Organization | `/dashboard/hrm` | `hrm` | Pemetaan paling langsung. Fitur anggota, pengurus, rapat, presensi, surat dan dokumen tersebar di beberapa feature route. |
| Agriculture | `/dashboard/pertanian` | `projects`, `pos` | Ketidaksesuaian: landing route adalah workspace pertanian khusus, tetapi metadata legacy mencantumkan Projects dan POS. POS adalah proses komersial; kepemilikan harus dibatasi pada referensi lot/pasokan, bukan transaksi jual. |
| Business & Enterprise | `/dashboard/accounting` | `accounting`, `crm`, `pos` | Ketidaksesuaian/overlap: CRM dan POS juga dibutuhkan domain lain. Accounting adalah landing yang ada, tetapi alur komersial harus mencakup procurement, inventory, order, settlement dan jurnal secara bertahap. |
| BI & Analytics | `/dashboard/analytics` | `analytics` | Sesuai sebagai lapisan analitik; kebijakan read-only dan definisi/lineage KPI tetap harus diverifikasi. |
| Public & Partnership | `/dashboard/crm` | `crm` | Overlap langsung dengan Business & Enterprise. CRM legacy saat ini mencampur kemitraan, pesan, akses eksternal, publikasi, galeri dan notifikasi. Ini belum membuktikan pemisahan domain publikasi dan relasi komersial. |

## 3. Perilaku resolver route yang terverifikasi dari source

- Dashboard memakai catch-all route `/dashboard/[[...section]]`.
- Route menerima ID workspace legacy, feature ID, serta sejumlah alias lama; akses login diperiksa sebelum workspace dirender.
- Landing route workspace legacy diambil dari `enterpriseDashboards`.
- Keterlihatan workspace dihitung melalui `getVisibleEnterpriseDashboardsForUser`, yang memeriksa ketersediaan modul dan policy role/feature.
- `/dashboard/pertanian` ditangani sebagai feature route tersendiri dan merender `AgricultureWorkspace`.
- `/dashboard/module-center` ditangani sebagai pusat modul Platform Core untuk admin.
- BI legacy `/dashboard/analytics` merender `BusinessIntelligenceWorkspace`.
- Enam aplikasi kanonis belum memiliki resolver tingkat aplikasi tersendiri pada catch-all route. Registry kanonis saat ini menyediakan kartu/katalog dan landing route, sementara resolver operasional tetap memakai registry legacy.

## 4. Risiko yang tidak boleh diselesaikan dengan tebakan

1. **CRM memiliki dua calon pemilik.** Data relasi komersial (pelanggan, pemasok, pipeline) harus berada di Business & Enterprise; relasi organisasi/mitra, publikasi dan portal eksternal harus berada di Public & Partnership. Jangan memindahkan tabel atau mengubah izin sebelum memeriksa schema, API, dan seluruh konsumen.
2. **POS bukan sumber data pertanian.** Agriculture dapat menerbitkan lot/pasokan sebagai referensi. Pesanan, penjualan, pembayaran dan jurnal tetap milik Business & Enterprise.
3. **Projects bukan satu domain tunggal.** Program organisasi, kegiatan pertanian, dan deliverable mitra memiliki pemilik dan lingkup akses berbeda. Satu workspace legacy dapat menjadi UI kompatibilitas untuk beberapa proses, tetapi bukan alasan untuk menyatukan kepemilikan data.
4. **Module visibility bukan otorisasi data.** Registry dan kartu aplikasi tidak boleh memberi akses CRUD; semua API dan tindakan harus tetap memakai server-side policy dan resource scope.
5. **Platform Core bukan dashboard administrasi organisasi.** Pengaturan teknis platform tidak boleh mengesahkan keputusan organisasi atau mengubah data domain tanpa kewenangan yang sesuai.

## 5. Rekomendasi urutan implementasi

### Tahap A — kunci kontrak pemetaan
- Pertahankan keenam ID aplikasi kanonis dan keenam ID workspace legacy.
- Tambahkan adapter aplikasi hanya setelah landing route, feature route, pemilik domain, dan policy untuk tiap entry point dibuktikan.
- Catat satu pemilik tulis per entitas; tandai overlap CRM, POS, dan Projects sebagai perlu pemisahan, bukan otomatis dialihkan.
- Untuk landing yang belum memiliki dashboard domain yang layak, gunakan halaman overview/status yang jujur; jangan arahkan pengguna ke modul yang hanya mirip namanya.

### Tahap B — uji kompatibilitas
- Uji deep link semua route legacy yang ada sebelum dan sesudah perubahan.
- Uji role, module grant, workspace scope, resource ownership, status record, dan aksi approve/publish pada server.
- Tambahkan negative tests untuk memastikan akses yang tidak berwenang ditolak meskipun pengguna mengetahui URL langsung.
- Verifikasi 360/390/430 px, tablet dan desktop pada preview terautentikasi.

### Tahap C — vertical slice
Implementasikan satu alur nyata per aplikasi beserta data source, validasi server, audit, status kosong/loading/error, dan test:
- Organization: anggota → keanggotaan → struktur → rapat/kehadiran.
- Agriculture: petani referensi → lahan → musim tanam → panen/lot.
- Business: pemasok → pembelian → penerimaan → stok → penjualan → settlement/jurnal.
- BI: definisi KPI → sumber/lineage → agregasi read-only → freshness.
- Public & Partnership: draft → review → approved → published, serta akses mitra berscope.
- Platform Core: identitas → workspace → policy → audit → registri modul.

## 6. Batas penerimaan

Audit statis ini **tidak** menyatakan pemetaan aplikasi telah selesai, tidak membuktikan UAT, dan tidak menyetujui rilis. Tidak ada database/migrasi/Production yang disentuh. PR rekonsiliasi tetap Draft sampai pemeriksaan route, policy, responsive visual, dan UAT selesai.
