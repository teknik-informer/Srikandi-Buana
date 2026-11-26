# Blueprint-to-Production Capability Matrix — SRIKANDI BUANA

**Versi:** 0.1 — baseline evidence map  
**Tanggal:** 26 November 2026  
**Basis Production:** `integration/phase1-preview-2026-11-16` @ `1c498abdfac8169432db62c91d0c96fb48072039`  
**Referensi UX/prototype:** V9.2 @ `d997eec0a42227da2f25c801dce1a6108e8db68e`  
**Branch:** `docs/production-capability-matrix-2026-11-26`  
**Status dokumen:** review-only; bukan persetujuan implementasi, migrasi, merge, atau rilis.

> Dokumen ini adalah baseline audit berbasis source yang sudah diperiksa. Ini belum merupakan inventaris final setiap kontrol UI, tabel, query, dan pengujian. Status `unknown` dipertahankan bila bukti yang tersedia belum cukup. Tidak ada klaim UAT browser atau verifikasi database live dalam dokumen ini.

## 1. Tujuan dan aturan penilaian

Tujuan matrix adalah mengubah blueprint menjadi backlog implementasi yang dapat diuji. Unit penilaian adalah **submodul × operasi**, bukan jumlah halaman, route, kartu dashboard, atau jenis record.

### Status kemampuan

| Status | Arti | Syarat minimum |
|---|---|---|
| `verified-working` | Alur operasional terbukti bekerja | Bukti UI → server action/API → DB read/write → authorization → automated test; UAT dicatat terpisah |
| `partial` | Sebagian alur nyata tersedia | Ada implementasi relevan, tetapi satu atau lebih operasi/setting/guard/test belum terbukti lengkap |
| `catalog-only` | Nama menu, route, tabel contoh, placeholder, atau kartu tanpa alur operasional yang terbukti | Tidak ada bukti aksi persisten end-to-end |
| `not-started` | Belum ditemukan implementasi relevan pada ref yang diperiksa | Pencarian source terdokumentasi |
| `blocked-policy` | Implementasi menunggu keputusan organisasi yang sah | Keputusan dan pemilik keputusan dicatat; sistem tetap dapat dikonfigurasi |
| `unknown` | Bukti belum cukup | Tidak boleh dinaikkan statusnya berdasarkan dugaan |

**Pemisahan bukti:** (1) source code, (2) schema/migration, (3) automated CI/test, (4) Preview/browser UAT, dan (5) Production runtime. Satu jenis bukti tidak menggantikan jenis lainnya. Build sukses tidak membuktikan transaksi bisnis berfungsi.

## 2. Baseline yang dilindungi

- Production project/domain yang menjadi acuan: `admin-dashboard` / `https://srikandibuana.vercel.app`.
- Baseline commit: `1c498abdfac8169432db62c91d0c96fb48072039`.
- Branch pemulihan immutable: `recovery/production-baseline-2026-11-26`.
- V9.2 adalah referensi UX/prototype terpisah, bukan sumber kode atau data Production.
- Tidak boleh menyalin `DemoIdentity`, demo seed, `StoreProvider`, `/app/*`, `switchContext`, ataupun menjadikan satu baris JSONB global `v9.app_state` sebagai model permanen domain Production.
- Tidak boleh mengubah login, registrasi/verifikasi/aktivasi anggota, session cookie `__Host-srikandi_session`, Principal, RBAC, `canReadSection`, `/dashboard/*`, `dashboardGroups`, API `/api/records`, `useWorkspaceData()`, atau `useRecordMutation()` sebagai jalan pintas visual.
- Dokumen ini berada pada branch baru yang dibuat dari commit baseline. Tidak ada perubahan Production, data, migration, environment, domain, SSO, atau billing.

## 3. Temuan lintas repository

### 3.1 Production

Source yang telah diperiksa pada baseline:

| Area | Bukti source | Penilaian awal |
|---|---|---|
| Identity/session | `src/lib/auth.ts`, `src/lib/permissions.ts`, `src/lib/session-config.ts`, `src/app/api/auth/*` | Fondasi existing dan protected; kelengkapan tiap skenario tetap perlu test/UAT |
| Workspace records | `src/app/dashboard/[[...section]]/page.tsx`, `src/app/api/records/route.ts`, `src/lib/srikandi.ts` | Jalur generic records tersedia; tiap kind/operasi harus diaudit terpisah |
| Agriculture | `src/app/api/agriculture/route.ts`, `src/lib/external-agriculture-summary.ts`, migration `006_agriculture_domain.sql` | API/schema domain ada; UI, workflow, setting, integrasi, dan UAT belum dibuktikan utuh |
| Attendance/HRM | `src/app/api/attendance/route.ts`, `src/app/api/hrm/attendance/route.ts`, `src/app/app/hrm/attendance/page.tsx` | Partial; koreksi, approval, scope, dan laporan perlu pemeriksaan operasi |
| Finance | `src/app/dashboard/akuntansi/page.tsx`, `src/lib/cash-report.ts`, `src/features/finance/*`, migrations `010–017` | Fondasi domain/transaksi ada; tidak membuktikan seluruh COA, jurnal, anggaran, rekonsiliasi, dan closing lengkap |
| Commerce/inventory | `src/app/api/ecosystem/*`, `src/app/dashboard/penjualan/page.tsx`, `src/app/dashboard/pesanan/*`, migrations `011–019` | Fondasi order/product/ledger/stock/procurement ada; lifecycle transaksi perlu audit |
| Reporting/external portal | `src/app/api/report-packages/*`, `src/app/api/external-portal/me/route.ts`, `src/app/portal-eksternal/page.tsx` | Partial; scope grant, review/publish, lineage, dan privasi perlu dibuktikan |
| Public CMS | `src/app/(public)/*`, `src/app/api/settings/route.ts`, `src/lib/site-settings.ts` | Public pages/settings tersedia; CMS workflow perlu audit per kemampuan |

`src/lib/srikandi.ts` mendefinisikan 21 jenis generic record. Ini membuktikan adanya kontrak record, bukan 21 modul bisnis lengkap. Generic CRUD tidak otomatis mencakup master data, approval, versioning, audit trail, export, atau pelaporan khusus domain.

### 3.2 V9.2

| Area | Bukti source | Penilaian awal |
|---|---|---|
| Pengurus, Sekretariat, Keuangan, Anggota, POS | `src/app/app/(area)/*` | Partial/candidate flows; perlu audit setiap aksi dan persistence |
| Studio Dashboard Builder | `src/app/studio/dashboard/page.tsx` | Catalog-only/placeholder; menggunakan `StudioBelumTersedia` |
| Studio Application/Data/Form/Organization/Module/Release | `src/app/studio/*` | Catalog-only pada builder yang belum memiliki aksi simpan |
| Workflow Studio | `src/app/studio/workflow/page.tsx` | Tahapan approval hardcoded; ambang persetujuan belum ditetapkan |
| Theme Studio | `src/app/studio/tema/page.tsx` | Preset/token terlihat; editor konfigurasi persisten lengkap belum terbukti |
| Website Studio | `src/app/studio/website/*`, `src/lib/site-settings.ts` | Partial; jangan digeneralisasi sebagai bukti builder lain selesai |
| State store | `src/lib/state-store.ts` | Payload operasional dipusatkan pada satu row `v9.app_state` JSONB per organisasi dengan `rev`; prototipe, bukan model relasional permanen |

Angka contoh V9.2 (termasuk anggota 128, luas lahan 18,6 ha, panen 2.340 kg, peserta pelatihan 112, pesanan 38) adalah data statis/demo sampai dibuktikan berasal dari query data operasional aktual. Jangan dipindahkan sebagai KPI Production. Bila data belum tersedia, tampilkan empty/unknown state.

## 4. Peta kemampuan per aplikasi target

Status di bawah adalah **status awal pada tingkat aplikasi**, bukan hasil audit final seluruh submodul.

| Aplikasi | Submodul yang wajib dicakup | Status awal | Bukti / gap utama |
|---|---|---|---|
| Platform Core | identitas, session, workspace, role/permission, module registry, settings, audit, notification, file, integration, health | `partial` | Auth/session/policy ada; settings platform menyeluruh, lifecycle modul, audit lintas domain, notifikasi, dan integrasi perlu dibuktikan |
| Organization | profil organisasi, wilayah/unit, anggota, status keanggotaan, struktur/jabatan, SK, rapat, agenda, notulen, presensi, surat, arsip, program kerja, tugas, inventaris organisasi | `partial` | Generic records, HRM/attendance, surat/rapat/dokumen tersebar; perlu source-of-truth dan lifecycle konsisten |
| Agriculture | petani-link, lahan/geometri, komoditas, musim tanam, budidaya, input, penyuluhan, panen, pascapanen, produktivitas, alsintan, traceability | `partial` | API/schema domain ditemukan; tiap submodul, setting, map/geotag, dan validasi lapangan belum diverifikasi end-to-end |
| Business & Enterprise | unit usaha, produk, pelanggan, pemasok, pembelian, penjualan, POS, pesanan, stok, gudang, aset usaha, kas/bank, COA, jurnal, piutang/utang, anggaran, rekonsiliasi | `partial` | Fondasi commerce/inventory/finance ada; lifecycle posting, retur, reversal, closing, dan idempotency perlu audit |
| BI & Analytics | KPI registry, metric definitions, dashboard, filter, drilldown, export, scheduled reports, lineage, data freshness | `unknown` | Dashboard/report endpoints ada, tetapi registry metric, sumber aktual, lineage, akses dan export per pengguna belum dipetakan lengkap |
| Public & Partnership | CMS, profil publik, berita, program, produk publik, partner registry, external grants, project reporting, evidence, review/publish, portal eksternal | `partial` | Public pages, site settings, report package, external portal ada; workflow publikasi/grant/scope belum dibuktikan utuh |

## 5. Checklist operasi wajib untuk setiap submodul

Setiap baris submodul di bagian 6 harus diperiksa pada kolom berikut. Status tidak boleh dinyatakan selesai jika hanya UI yang ada.

| Kode | Area pemeriksaan | Bukti yang harus dicatat |
|---|---|---|
| CFG | Settings & configuration | lokasi setting, default, validasi, scope organisasi, siapa yang boleh mengubah |
| MDM | Master data/reference | tabel sumber, relasi, uniqueness, status aktif/nonaktif, import |
| R | Read/search/filter/detail | query, pagination, filter, data scope, empty/loading/error |
| C | Create | API/action, server validation, duplicate handling |
| U | Update | version precondition/CAS, validation, conflict response |
| D/A | Delete/archive/restore | soft-delete/archive policy, dependency guard, audit |
| WF | Approve/reject/submit/publish | state machine, actor permission, transition guard, policy source |
| SEC | Authorization/privacy | server-side policy, tenant/owner scope, object-level access, export/download |
| AUD | Audit/version/idempotency | actor, timestamp, before/after or event, correlation/idempotency key |
| INT | Integration | contract, mapping, retry, failure state, reconciliation |
| REP | Reports/export | source query, totals, filters, permission, PDF/XLSX/CSV output |
| UX | Interaction states | loading, empty, validation, error, conflict, success, mobile/keyboard |
| TST | Tests | unit, API/integration, authorization, concurrency, browser UAT |

Gunakan `N/A` hanya dengan alasan eksplisit. Gunakan `unknown` bila bukti belum ditemukan. Untuk setiap klaim `verified-working`, cantumkan link/path test dan commit SHA yang diuji.

## 6. Register audit submodul — pekerjaan yang harus dituntaskan

### 6.1 Platform Core

| Submodul | CFG/MDM | CRUD/WF | SEC/AUD | Test/UAT | Status |
|---|---|---|---|---|---|
| Auth, session, account recovery | audit setting & provider | audit lifecycle akun | session, CSRF, revocation, audit | auth matrix + browser | `partial` |
| Member identity verification | aturan verifikasi dan status | submit/review/approve/reject | own-record, reviewer scope, audit | race/duplicate + UAT | `partial` |
| Roles & permissions | permission registry | grant/revoke/version | server-side deny-by-default | matrix tiap endpoint | `unknown` |
| Workspace/org settings | konfigurasi dan scope | CRUD/version/restore | owner boundary + audit | isolation tests | `unknown` |
| Module registry/lifecycle | katalog, dependency, enablement | enable/disable/upgrade | admin boundary + audit | lifecycle tests | `partial` |
| Audit, notification, file, integration | retention/provider/limits | retry/revoke/configure | immutable event/access logs | delivery/security tests | `unknown` |

### 6.2 Organization

| Submodul | Cakupan operasi yang wajib diverifikasi | Status awal |
|---|---|---|
| Profil & unit organisasi | setting identitas, wilayah, unit, kontak; CRUD/arsip; periode aktif | `unknown` |
| Anggota & keanggotaan | pendaftaran, verifikasi, aktivasi, perubahan profil, status, riwayat, arsip, ekspor | `partial` |
| Struktur & jabatan | posisi, pemegang, masa berlaku, SK dasar, pergantian, riwayat | `partial` |
| Rapat & agenda | kalender, undangan, peserta, perubahan jadwal, status kegiatan | `partial` |
| Presensi | daftar hadir, check-in, koreksi, approval, rekap | `partial` |
| Notulen & keputusan | draft, review, pengesahan, lampiran, tindak lanjut | `unknown` |
| Surat & ekspedisi | penomoran, template, disposisi, kirim/terima, arsip, cetak | `partial` |
| Dokumen & arsip | kategori, retensi, versi, akses, pencarian, unduh | `partial` |
| Program kerja & tugas | perencanaan, penanggung jawab, milestone, status, bukti, evaluasi | `partial` |
| Inventaris organisasi | register aset, lokasi, kondisi, mutasi, pemeliharaan, stocktake | `unknown` |

### 6.3 Agriculture

| Submodul | Cakupan operasi yang wajib diverifikasi | Status awal |
|---|---|---|
| Petani & relasi anggota | tautan ke identity anggota tanpa duplikasi; consent/scope | `unknown` |
| Lahan & peta | kepemilikan/pengelolaan, geometri, geotag, validasi, histori | `partial` |
| Komoditas & musim | master komoditas, kalender, varietas, musim, status | `unknown` |
| Budidaya & input | rencana, aktivitas, input, biaya, bukti, inspeksi | `unknown` |
| Penyuluhan & pelatihan | jadwal, materi, peserta, fasilitator, evaluasi | `partial` |
| Panen & produktivitas | catatan panen, satuan, mutu, lot, verifikasi, agregasi | `partial` |
| Alsintan & sarpras | registrasi, peminjaman, pemeliharaan, kondisi, pengembalian | `partial` |
| Traceability & compliance | lot, asal, bukti, chain-of-custody, kontrol akses | `partial` |

### 6.4 Business & Enterprise

| Submodul | Cakupan operasi yang wajib diverifikasi | Status awal |
|---|---|---|
| Unit usaha & mitra dagang | profil, kontrak, kontak, status, masa berlaku | `unknown` |
| Produk & katalog | SKU, kategori, harga, satuan, pajak, publik/internal | `partial` |
| Pembelian/procurement | permintaan, penawaran, PO, penerimaan, invoice, pembayaran | `partial` |
| Penjualan/POS/pesanan | cart/order, reservasi stok, pembayaran, fulfillment, cancel | `partial` |
| Inventory & gudang | lokasi, stock ledger, transfer, adjustment, stocktake | `partial` |
| Retur/refund | alasan, persetujuan, pengembalian stok/uang, reversal | `unknown` |
| Kas & bank | rekening, receipt/payment, transfer, reconciliation | `partial` |
| COA & jurnal | account mapping, journal entry, balanced posting, reversal | `partial` |
| Anggaran & biaya | periode, alokasi, realisasi, variance, approval | `unknown` |
| Piutang/utang & closing | aging, settlement, cutoff, lock, period close/reopen | `unknown` |
| Aset usaha | acquisition, depreciation policy, disposal, audit | `unknown` |

### 6.5 BI & Analytics

| Submodul | Cakupan operasi yang wajib diverifikasi | Status awal |
|---|---|---|
| KPI/metric registry | definisi, formula, unit, owner, target, period, source | `unknown` |
| Dashboard per persona | permission-aware cards, filter, drilldown, empty states | `partial` |
| Data lineage/freshness | query source, refresh timestamp, stale/error signal | `unknown` |
| Report builder/export | parameter, permission, PDF/XLSX/CSV, reproducibility | `unknown` |
| Program impact/evaluation | baseline, target, actual, evidence, outcome | `partial` |

### 6.6 Public & Partnership

| Submodul | Cakupan operasi yang wajib diverifikasi | Status awal |
|---|---|---|
| Public CMS | draft, preview, approval, publish/unpublish, schedule, revision | `partial` |
| Partner registry | organization/contact, agreement, scope, expiry, status | `unknown` |
| External access grants | sponsor, purpose, project scope, expiry, revoke, audit | `partial` |
| Report packages | assemble, review, approve, publish, export, evidence | `partial` |
| NGO/government portal | tenant scope, least privilege, download/export, revocation | `partial` |
| Public data projection | explicit approval, anonymization, privacy review | `unknown` |

**Catatan:** status pada tabel 6 adalah prioritas audit awal, bukan pengesahan bahwa seluruh operasi di submodul tersebut sudah berfungsi.

## 7. Arsitektur data target dan prinsip integritas

1. **System of record per domain:** Organization menjadi sumber identitas anggota/struktur; Agriculture menjadi sumber lahan dan aktivitas budidaya; Business & Enterprise menjadi sumber transaksi komersial/keuangan; Public & Partnership menjadi sumber konten dan grant eksternal; BI hanya membaca.
2. **Relasional per domain:** entitas operasional memiliki tabel, foreign key, constraint, dan indeks sesuai relasi. Jangan memindahkan seluruh domain ke satu JSONB global.
3. **Organization scoping:** setiap query dan mutasi privat harus memeriksa owner/workspace terlebih dahulu, lalu scope program/proyek/pemilik data.
4. **Identity tidak diduplikasi:** profil petani/pekerja merujuk identitas anggota yang sudah ada; data kontak atau PII tidak disalin tanpa kebutuhan.
5. **Audit trail:** perubahan penting mencatat actor, scope, timestamp, action, entity, correlation ID, dan perubahan yang relevan. Audit event tidak boleh dihapus melalui CRUD biasa.
6. **Concurrency:** mutasi menggunakan version precondition dan compare-and-swap atomik. Record, audit, ledger, stock, dan normalized writes terkait harus satu transaction boundary.
7. **Idempotency:** transaksi eksternal dan operasi yang dapat diulang memakai idempotency key; retry tidak boleh menggandakan pembayaran, jurnal, order, atau stock movement.
8. **Financial integrity:** journal harus balance; transaksi posted dikoreksi melalui reversal/adjustment, bukan destructive edit. Reconciliation dan period close memerlukan guard.
9. **Data publication:** portal publik/mitra menerima projection yang disetujui, bukan akses langsung ke tabel privat.
10. **No fabricated metrics:** KPI berasal dari query sumber yang dapat dilacak. Data kosong berarti 0 hanya bila definisi metrik memang menghitung nol; jika sumber belum tersedia tampilkan unknown/not yet reported.

## 8. Kebijakan organisasi yang harus tetap pending/configurable

Jangan mengarang aturan berikut. Simpan sebagai konfigurasi belum ditetapkan sampai ada keputusan resmi:
- kuorum dan tata cara pengesahan rapat;
- siapa yang berwenang menyetujui jenis keputusan dan dokumen;
- batas nominal approval keuangan/pengadaan;
- besaran, frekuensi, pengecualian, dan status iuran anggota;
- masa jabatan, mekanisme pergantian, dan delegasi tugas jika belum disahkan;
- klasifikasi dokumen dan retensi arsip;
- definisi target, baseline, serta indikator dampak;
- data apa yang boleh dibagikan kepada pemerintah, NGO, dan publik.

Setiap policy setting harus menyimpan status `draft/pending/approved/retired`, sumber keputusan, tanggal berlaku, pihak pengesah, dan histori perubahan. Fitur yang bergantung pada policy pending harus dapat disiapkan tanpa mengaktifkan aturan fiktif.

## 9. Prioritas delivery dan dependency gates

| Gelombang | Fokus | Exit criteria sebelum lanjut |
|---|---|---|
| 0 | Audit matrix + domain ownership + dependency map | Semua submodul memiliki status berbukti atau unknown yang eksplisit; tidak ada klaim kelengkapan tanpa bukti |
| 1 | Platform settings, permission, user/workspace administration, audit, versioning | tenant isolation, authorization tests, atomic mutation tests, configuration audit |
| 2 | Organization & Secretariat | member identity preserved; member/structure/document/meeting flows lengkap dan diuji |
| 3 | Program, agenda, task, training, indicators | workflow, assignment scope, evidence, progress, evaluation lulus |
| 4 | Agriculture | land-to-harvest lifecycle, field validation, traceability dan privacy lulus |
| 5 | Business, inventory, procurement, POS | stock ledger, order lifecycle, returns, idempotency, reconciliation lulus |
| 6 | Finance | balanced journals, approval policy, bank reconciliation, close/reversal lulus |
| 7 | BI, reports, government/NGO portals | lineage, metric definitions, scope grants, review/publish, export privacy lulus |
| 8 | Studio builders | builder menyimpan konfigurasi versioned, preview, permission, validation, rollback dan release history |

Satu gelombang tidak dinyatakan selesai hanya karena halaman sudah dibuat. Tiap submodul wajib melewati operation checklist, CI exact-head, dan browser UAT ketika UI berubah. Preview hanya dapat diuji jika deployment yang benar-benar menunjuk commit tersebut tersedia.

## 10. Gate untuk setiap PR implementasi

- PR kecil dan independen, menyebut issue/submodul serta baseline commit.
- Tidak menggabungkan demo architecture/store/identity.
- Menyertakan bukti file UI, API/action, schema, permission, dan test.
- Menyertakan migration hanya jika diperlukan, terpisah, direview dan disetujui secara eksplisit sebelum dijalankan.
- Menambahkan tests untuk happy path, invalid input, unauthorized/forbidden, cross-tenant, duplicate/idempotency, stale version/concurrency, dan rollback bila relevan.
- Menyebut status UAT secara jujur: belum dijalankan / lulus / gagal, dengan URL Preview dan exact commit jika tersedia.
- Tidak merge/deploy Production tanpa persetujuan rilis yang eksplisit.

## 11. Pekerjaan audit lanjutan yang masih terbuka

Versi 0.1 belum mengklaim selesai. Arena/reviewer harus melengkapi:
1. Inventaris setiap route/page dan tombol/action di Production dan V9.2 ke submodul pada bagian 6.
2. Pemetaan route/action ke handler API/server action, tabel/schema, policy, test file, dan commit.
3. Pengujian setiap operasi C/R/U/archive/approve/reject/publish/export per submodul.
4. Bukti CI exact-head dan daftar test yang benar-benar berjalan.
5. Bukti Preview/browser UAT per persona, ukuran layar, tema, keyboard/touch, overflow, console/network.
6. Daftar gap dengan prioritas P0/P1/P2, dependency, risiko, acceptance criteria, dan PR implementasi yang direncanakan.

**Reviewer acceptance:** dokumen baru dapat dinaikkan ke versi final bila tidak ada submodul yang disamarkan sebagai selesai hanya karena route/kartu tersedia, seluruh status dapat ditelusuri ke source/test evidence, dan backlog delivery memiliki acceptance criteria terukur.


## 12. Lampiran bukti route/API dan test inventory — baseline 26 Nov

Lampiran ini mempersempit beberapa temuan dari daftar area menjadi handler yang benar-benar ditemukan pada commit baseline. Keberadaan handler tetap **bukan** bukti seluruh operasi pada domain sudah lengkap.

### 12.1 Route dan batas akses yang teramati

| Kemampuan | Handler yang diperiksa | Operasi/bukti source yang terlihat | Batas yang belum boleh diasumsikan |
|---|---|---|---|
| Agriculture | `src/app/api/agriculture/route.ts` (322 baris) | Auth user, module availability, principal/role, validasi unit dan tenure; handler domain tersedia | Perlu inventaris metode HTTP, tabel/kolom, semua transisi, tests, dan browser UAT |
| Attendance register | `src/app/api/attendance/route.ts` | PUT; membatasi sekretaris/admin, validasi event dan member dalam owner yang sama, menulis record `kehadiran`, audit dan V14 attendance statements dalam batch | Belum membuktikan koreksi/approval, concurrency guard, seluruh status kehadiran, dan UAT |
| HRM attendance | `src/app/api/hrm/attendance/route.ts` (393 baris) | Handler khusus HRM; definisi tipe sesi dan status presensi, auth dan module guard | Perlu petakan GET/POST/PUT/DELETE dan tiap state transition; jangan disamakan dengan register attendance generic |
| Commerce orders | `src/app/api/ecosystem/orders/route.ts` | GET dengan pembatasan pembacaan berdasarkan role/buyer; POST memvalidasi productId dan clientRequestId, rate limit, memeriksa request id yang telah ada | Perlu verifikasi seluruh POST transaction, stock reservation, status lifecycle, pembayaran, cancel/return, serta race/idempotency test |
| Commerce products | `src/app/api/ecosystem/products/route.ts` | GET katalog publik atau daftar manage sesuai role/module; owner-scoped product list | Perlu audit POST/PATCH/DELETE, unique SKU, publish lifecycle, stock integrity dan UAT |
| Finance ledger | `src/app/api/ecosystem/ledger/route.ts` | Role read dan write dipisah; module guard; balanced journal validation; CSV export | Perlu audit POST/reversal, database constraints, period lock, atomicity, reconciliation dan test concurrency |
| Platform modules | `src/app/api/platform/modules/route.ts` | Handler terpisah; node runtime; no-store/referrer policy; JSON request parser | Perlu audit admin guard, reason, persisted grants, audit event dan negative tests |
| Report packages | `src/app/api/report-packages/route.ts` | Report group registry; permission helpers `canReadKindForRole`, `canReadRecord`, `visibleRecord`; module guard | Perlu petakan draft/review/approve/export lifecycle, sumber tiap group, evidence lineage dan privacy tests |
| External portal identity | `src/app/api/external-portal/me/route.ts` | External auth dan active grant filtering sebelum mengembalikan account/grants | Endpoint identitas ini bukan bukti portal report/data endpoints seluruhnya aman; audit setiap endpoint dan file download terpisah |

### 12.2 Schema/migration inventory yang relevan

| Domain | Migration/file yang ditemukan | Catatan audit |
|---|---|---|
| Initial identity/roles | `001_initial.sql`, `002_roles.sql` | Periksa constraint, ownership dan migrasi historis sebelum perubahan identity |
| Audit/database integrity | `007_database_integrity_and_audit.sql` | Constraint/audit baseline ada; perlu verifikasi tiap writer menggunakan mekanisme konsisten |
| Organization/workspace v14 | `008_workspace_v14_core.sql`, `013_multi_officer_positions.sql`, `021_member_self_service_identity.sql`, `022_member_email_backfill.sql` | Relasi dan identity berkembang melalui migrasi terpisah; perlu map entity dan compatibility writer |
| External access/reporting | `005_external_access.sql`, `009_report_packages.sql`, `010_report_package_source_scope.sql` | Grant dan report package schema ada; perlu uji expiry/revoke/scope serta publikasi |
| Agriculture | `006_agriculture_domain.sql` | Domain schema tersedia; perlu map semua tabel ke route dan UI |
| Commerce/inventory | `005_ecosystem_foundation.sql`, `012_sales_invoices_and_receipts.sql`, `014_supplier_bills.sql`, `015_procurement_workflow.sql`, `016_purchase_three_way_match.sql`, `017_inventory_stock_ledger.sql`, `018_inventory_transfers_stocktakes.sql`, `019_inventory_document_lifecycle.sql` | Banyak fondasi transaksi tersedia; tidak berarti seluruh layar, workflow dan test lulus |
| Finance/banking | `006_order_receipts_and_journal_corrections.sql`, `010_member_impact_finance.sql`, `013_bank_reconciliation.sql` | Perlu audit balanced posting, reversal, bank matching, closing dan report consistency |
| Platform module access | `020_platform_module_access.sql` | Registry/grants perlu diuji dengan role, disabled module, cross-owner, audit dan revocation |

**Peringatan nomor migrasi:** repository memiliki beberapa file dengan prefix nomor yang sama (misalnya `005_*`, `006_*`, `008_*`, `009_*`, `010_*`, `011_*`, `012_*`, `013_*`). Jangan menyimpulkan urutan eksekusi hanya dari nama file; gunakan migration runner/manifest aktual dan audit applied migration ledger. Jangan menjalankan atau menyusun ulang migration dari dokumen ini.

### 12.3 Test inventory yang ditemukan

Direktori `tests/` pada baseline memuat antara lain:

- `ecosystem-security.test.mjs`
- `ecosystem-validation.test.mjs`
- `ecosystem-v12-audit-writes.test.mjs`
- `ecosystem-v12-deployment-safety.test.mjs`
- `ecosystem-v12-domain-boundaries.test.mjs`
- `ecosystem-v12-ledger-integrity.test.mjs`
- `ecosystem-v12-pillars.test.mjs`
- `ecosystem-v12` lainnya untuk dashboard, media consent, monitoring/reporting, dan workspace layout
- `enterprise-analytics.test.mjs`
- `platform-application-registry.test.mjs`
- `platform-core-module-center.test.mjs`
- `platform-module-access.test.mjs`
- `integration-security.mjs`
- `migration-audit.test.mjs`

Nama file test di atas hanya inventory. Hasil test harus diperiksa per test case dan exact commit; keberadaan file tidak membuktikan seluruh operasi teruji. Secara khusus, belum ada bukti dari inventory ini saja bahwa attendance lifecycle, agriculture lifecycle, report publication, member verification, dan CAS concurrency sudah memiliki integration tests lengkap.

### 12.4 PR #67 — hasil CI dokumentasi

Pada commit PR #67 `44988d917e4a44202e18e5bc7f415bf069e0e0e6`, dua check bernama `quality` telah berstatus `completed / success`. Check `Vercel Preview Comments` juga completed/success, tetapi komentar Vercel yang muncul mengarah ke project `srikandi-buana-v9`; ini **bukan** bukti Preview Production dan bukan browser UAT Production. PR tetap Draft dan belum di-merge.


### 12.5 Concurrency/CAS review — PR #63 exact head, 26 Nov

**Ref yang diperiksa:** PR #63 head `bafb2d8b51803df834d9dc4d994072eba34864ee`. Ini audit atas kandidat perubahan, bukan klaim bahwa perubahan tersebut sudah masuk Production.

| Jalur | Bukti source | Temuan | Acceptance criteria yang belum terpenuhi |
|---|---|---|---|
| Generic record update | `src/app/api/records/route.ts` | Handler membaca `updated`, membandingkan `expectedUpdated`, lalu batch akhir menjalankan UPDATE dengan `WHERE id=? AND owner=?`; kondisi UPDATE tidak lagi mensyaratkan `updated=expectedUpdated`. Audit dan normalized/ledger statements ikut dalam batch yang sama. | Conditional CAS harus terjadi pada write boundary. Dua request dengan versi awal sama tidak boleh sama-sama sukses. |
| Database batch | `src/lib/runtime.ts` | Neon adapter menggunakan `sql.transaction(..., { isolationLevel: 'Serializable' })`. Ini transaction boundary, bukan pengganti predicate CAS eksplisit. | Uji perilaku aktual pada concurrent handler requests dan retry/serialization failure. |
| Protected cash/asset update | `src/lib/enterprise/protected-records.ts` | CTE mengondisikan UPDATE pada expected version dan menulis audit dari `changed`; helper menjalankan `db.batch([write,...normalizedWrites])`, lalu baru memeriksa hasil CTE. | Semua normalized/ledger/asset effects harus SQL-conditional pada CAS success atau dieksekusi dalam transaction control yang membatalkan semuanya ketika CAS kalah. |
| Automated tests | `scripts/verify-roles.mjs` | Tes memeriksa missing version → 428, stale pre-read version → 409, dan current version → 200. Tidak ditemukan concurrent handler race test untuk dua request dengan versi awal identik. | Test nyata: tepat satu 200 dan satu 409; assert source, audit, normalized tables, ledger/asset effects dan rollback dari request yang kalah. |

**Status:** `partial` untuk version precondition; `not verified` untuk atomic CAS/concurrent side-effect safety. Jangan menandai update lifecycle sebagai `verified-working` sebelum concurrency test di atas lulus.

**Required implementation sequence:**
1. Tentukan satu pola transaction-safe CAS yang didukung oleh Neon driver dan adapter aktual; jangan mengandalkan SELECT precheck.
2. Jadikan source write, audit, normalized V14 writes, ledger/asset side effects satu all-or-nothing unit. Semua dependent writes wajib bersyarat pada row CAS yang berhasil.
3. Kembalikan 409 bila versi kalah; jangan meninggalkan audit atau efek samping parsial.
4. Tambahkan concurrent integration test pada handler nyata, bukan hanya unit test helper.
5. Jalankan full CI pada exact implementation SHA; Preview/UAT dicatat terpisah.

Reviewer handoff: [Issue #65 — atomic record CAS](https://github.com/teknik-informer/Srikandi-Buana/issues/65). Tidak ada perubahan Production, migration, data, auth/session, RBAC, environment, domain, atau billing yang diotorisasi oleh audit ini.
### 12.6 Member identity, account activation and access recovery — Production baseline

**Source yang diperiksa:** `src/app/api/accounts/route.ts`, `src/app/api/auth/activate/route.ts`, `src/app/api/account/route.ts`, `src/lib/auth.ts`, `src/lib/permissions.ts`, `scripts/verify-roles.mjs`, migration `021_member_self_service_identity.sql` dan `022_member_email_backfill.sql`.

| Tahap | Bukti source | Penilaian | Batas bukti / gap |
|---|---|---|---|
| Pengelolaan undangan | `POST /api/accounts` membatasi role admin/ketua, memeriksa anggota owner-scoped, status Aktif dan Terverifikasi, validasi email/nomor, menolak akun duplikat, menyimpan hash token dan mencabut undangan lama yang belum dipakai. Email gagal kirim menyebabkan undangan dicabut. | `partial` dengan alur konkret | Perlu race test untuk dua undangan bersamaan dan verifikasi email delivery pada runtime/Preview yang tepat. |
| Aktivasi akun | `POST /api/auth/activate` memakai token hash, expiry, rate limit, same-origin, cek owner/member dan status keanggotaan. CTE mengklaim undangan sekali pakai dan membuat akun dalam satu statement; unique constraint tetap harus dibuktikan pada schema/test. | `partial` dengan guard kuat | Audit event aktivasi dan pembuatan session dilakukan setelah statement aktivasi; perlu memastikan kegagalan audit/session tidak membuat UI menyatakan aktivasi gagal tanpa jalur pemulihan yang jelas. |
| Principal/session | `src/lib/auth.ts` memvalidasi session, akun enabled, workspace owner admin, role, serta status aktif/terverifikasi anggota; session disimpan dalam bentuk token hash dan cookie HttpOnly/Secure di production. | `partial` | Perlu audit expiry/revocation/logout, cookie lifecycle dan browser UAT lintas perangkat. |
| Perubahan profil/password | `PATCH /api/account` memakai same-origin, account binding untuk profile, rate limit; perubahan password mencabut sesi lama dan membuat sesi baru. | `partial` | Update profil/settings dan audit perlu diuji untuk kegagalan parsial; update profil menggunakan batch tanpa CAS/version field. |
| RBAC dan privacy roster | `GET/POST/PATCH /api/accounts` membatasi role; roster ketua menyembunyikan nomor/email dan data privat; penetapan/administrasi role Ketua dibatasi. | `partial` | Audit seluruh endpoint, ekspor, unduhan dan object-level scope; test matrix harus diperluas di luar skenario yang ada. |

### 12.6.1 Test evidence dan batas interpretasi

`scripts/verify-roles.mjs` memuat skenario handler untuk aktivasi satu kali, token salah/expired/revoked/replaced, tautan reset, session revocation, owner/member linkage, role matrix, masking data pribadi, serta batas kewenangan Ketua/Sekretaris/Bendahara/Koordinator. Ini merupakan bukti automated test untuk source yang diuji, tetapi test harness menggunakan database fixture/adapter terisolasi; bukan koneksi ke database Production, bukan pengujian email live, dan bukan browser UAT.

### 12.6.2 Temuan yang harus ditindaklanjuti

1. **Audit activation atomicity:** akun/undangan diklaim dan akun dibuat dalam satu CTE statement; tetapi penulisan `access_audit` untuk aktivasi/reset dan `createSession()` dilakukan setelah statement tersebut. Uji kegagalan audit/session dan tetapkan perilaku pemulihan yang eksplisit. Untuk alur change-email, audit ditulis di CTE yang sama dengan perubahan email.
2. **Profile concurrency:** perubahan display name memakai upsert pada `settings` tanpa expected version/CAS. Evaluasi apakah konflik update antar-tab perlu dicegah dan tambahkan versioning jika relevan.
3. **Invitation race/idempotency:** tambahkan test dua permintaan undangan paralel untuk anggota yang sama, dua aktivasi token paralel, serta retry email delivery. Hasil harus satu akun, satu undangan aktif yang sah, tanpa token ganda yang masih dapat dipakai.
4. **Operational proof:** jalankan browser UAT untuk aktivasi email, login pertama, reset password, perubahan email, logout/revocation dan akses role; catat exact Preview commit dan hasilnya. Jangan menganggap automated fixture test sebagai bukti UAT.

**Status keseluruhan member identity:** `partial` — fondasi proteksi dan alur aktivasi nyata telah ditemukan serta memiliki automated test, tetapi lifecycle audit, concurrency, kegagalan parsial, dan browser UAT belum seluruhnya dibuktikan.

### 12.7 Agriculture and attendance lifecycle audit — Production baseline

**Ref yang diperiksa:** Production baseline `1c498abdfac8169432db62c91d0c96fb48072039`. Source: `src/app/api/agriculture/route.ts`, `src/app/api/attendance/route.ts`, `src/lib/external-agriculture-summary.ts`, `migrations/006_agriculture_domain.sql`, `scripts/verify-agriculture.mjs`, `scripts/verify-roles.mjs`.

#### Agriculture — capability evidence

| Submodul/operasi | Bukti yang ditemukan | Status | Gap/risiko yang belum ditutup |
|---|---|---|---|
| Komoditas | Create master komoditas; normalisasi slug; validasi satuan; unique code per workspace; audit event dalam batch | `partial` | Tidak ditemukan pada route ini operasi update/archive master komoditas; perlu pastikan apakah memang dikelola di tempat lain atau belum tersedia |
| Register lahan | Create/update/archive; hanya anggota aktif dan terverifikasi; kode unik per workspace; validasi luas dan tenure; perubahan data mengembalikan verifikasi ke pending; archive mempertahankan relasi/histori | `partial` | Tidak ada geometri/polygon/GPS/geotag pada schema/handler yang diperiksa; koordinat dan validasi batas lahan belum terbukti |
| Siklus tanam | Create dengan lahan dan komoditas aktif dalam workspace sama; luas tanam dibatasi luas lahan; tanggal tanam/perkiraan panen divalidasi | `partial` | Tidak ditemukan operasi edit/status lifecycle siklus tanam pada handler yang diperiksa; status domain ada di schema tetapi transisi operasional belum dibuktikan |
| Panen | Create berdasarkan siklus yang tersedia dan bukan gagal; satuan diturunkan dari komoditas; kuantitas/tanggal divalidasi | `partial` | Tidak ditemukan operasi edit/koreksi/void panen pada handler yang diperiksa; kontrol tanggal panen terhadap tanggal tanam dan multi-harvest/lot belum terbukti |
| Verifikasi berjenjang | Sekretariat/admin memverifikasi atau menolak lahan, siklus, panen; alasan penolakan wajib; siklus mensyaratkan lahan verified; panen mensyaratkan lahan dan siklus verified | `partial` | Perlu uji transisi berulang, perubahan parent setelah child verified, race antar-verifikator, dan atomicity update + audit |
| External agriculture projection | Hanya grant sesuai scope; anggota minimal 5 dan kontribusi lahan/panen minimal 3 anggota untuk mengungkap agregat; hanya data verified; tanpa PII/koordinat presisi | `partial` | Perlu test query integration dan UAT per grant/audience; threshold harus ditinjau sebagai konfigurasi/policy bila organisasi/mitra menghendaki angka lain |
| Audit trail | `agriculture_audit` mencatat actor/role/action/target/reason/details; dibatasi untuk Sekretariat/admin pada GET | `partial` | Perlu bukti immutable access, before/after diff, correlation ID, dan uji atomic failure agar audit tidak terpisah dari mutasi |

#### Agriculture — schema dan automated-test evidence

Migration `006_agriculture_domain.sql` mendefinisikan `agriculture_commodities`, `farm_parcels`, `crop_cycles`, `harvest_records`, dan `agriculture_audit`. Foreign key composite mengikat anggota, lahan, komoditas, siklus, dan panen ke workspace yang sama; terdapat constraint status, satuan, luas, kuantitas, tanggal, dan unique code.

`scripts/verify-agriculture.mjs` menjalankan migration pada `pg-mem` fixture dan memeriksa constraint relasi lintas workspace/jenis record, unit, duplicate commodity, serta beberapa policy dan source assertions. Ini **bukan** integration test yang memanggil handler POST/PATCH terhadap database, bukan test concurrency, bukan live DB, dan bukan browser UAT. Karena itu status keseluruhan Agriculture tetap `partial`, bukan `verified-working`.

#### Attendance — handler and evidence

| Operasi | Bukti source | Status | Gap/risiko |
|---|---|---|---|
| Simpan daftar hadir | `PUT /api/attendance` memerlukan login, modul HRM aktif, role sekretaris/admin, same-origin, DB tersedia; validasi event kegiatan owner-scoped, deduplikasi memberIds, validasi anggota dalam workspace; menulis `records.kind='kehadiran'`, audit, dan normalized V14 attendance statements melalui `db.batch` | `partial` | Satu endpoint PUT; tidak terlihat expectedUpdated/CAS, sehingga dua petugas dapat saling menimpa data kehadiran tanpa konflik versi yang eksplisit |
| Status peserta | Handler generic menetapkan semua `memberStatuses` menjadi `Hadir penuh` dan `externalParticipants: []` | `partial` | Belum ada bukti status izin/sakit/alpa/terlambat/parsial, peserta nonanggota, check-in timestamp, atau bukti koreksi per peserta melalui endpoint ini |
| Audit dan sinkronisasi | Batch menyertakan audit record dan `buildV14AttendanceSyncStatements` | `partial` | Perlu uji rollback jika salah satu normalized write gagal; perlu pastikan batch adapter benar-benar all-or-nothing pada runtime yang dipakai |
| Automated test | `scripts/verify-roles.mjs` memiliki skenario sukses PUT attendance untuk Sekretaris dengan satu member fixture | `partial` | Belum ditemukan test handler attendance untuk role terlarang, event lintas workspace, member lintas workspace, duplicate IDs, invalid payload/size, concurrency, rollback, atau sinkronisasi seluruh status |
| HRM attendance terpisah | `src/app/api/hrm/attendance/route.ts` adalah handler berbeda | `unknown` untuk lifecycle lengkap | Jangan menyamakan route ini dengan generic register; perlu audit GET/POST/PUT/DELETE dan relasi sesi/presensi tersendiri |

**Kesimpulan audit tahap ini:** Agriculture mempunyai schema relasional dan lifecycle create/verify/archive yang nyata, tetapi belum mencakup bukti seluruh operasi lapangan dan belum memiliki handler integration/concurrency test yang cukup. Generic attendance hanya membuktikan penyimpanan daftar anggota hadir penuh untuk satu event, bukan presensi lengkap. Kedua aplikasi tetap `partial`.

**Prioritas tindak lanjut P1:**
1. Tambahkan handler-level integration tests untuk seluruh Agriculture POST/PATCH actions, role matrix, tenant isolation, validation, transition order, duplicate/concurrent verification, serta rollback audit.
2. Tambahkan expected version/CAS pada update lahan dan status verifikasi; audit harus ikut hanya jika mutasi berhasil.
3. Tetapkan secara eksplisit apakah geometri/geotag dibutuhkan; jangan menambahkan pengumpulan koordinat sebelum dasar tujuan, izin, dan akses ditetapkan.
4. Lengkapi lifecycle attendance: status kehadiran per anggota, koreksi dengan alasan, version conflict, event/member scope, normalized sync dan rollback test.
5. Audit HRM attendance route secara terpisah sebelum menyatakan fitur presensi selesai.
6. Jalankan Preview dan browser UAT hanya pada exact commit yang benar; status UAT tetap belum dibuktikan dalam audit ini.

Tidak ada perubahan schema, migration, database, data, auth/session, RBAC, environment, domain, billing, atau Production yang dilakukan dalam audit ini.


### 12.8 HRM attendance — separate operational lifecycle audit

**Source:** `src/app/api/hrm/attendance/route.ts` pada Production baseline. Ini berbeda dari generic `PUT /api/attendance`.

| Area | Bukti source | Status | Gap yang harus diuji/diperbaiki |
|---|---|---|---|
| Session creation | `POST create_session`: role manage (admin/full access, sekretaris, koordinator); program scope; validasi jenis, tanggal, jam, lokasi, peserta aktif/terverifikasi, late threshold; optional geofence | `partial` | Tidak ada expected version pada create (wajar), tetapi perlu duplicate/parallel creation test dan policy untuk lokasi |
| Member check-in | `POST check_in`: self, QR, location, manual; hanya pada tanggal/jam dan sesi active; member harus terdaftar; status present/late; stable attendance ID mencegah duplicate check-in | `partial` | Perlu test concurrent duplicate, QR replay/expiry, session close race, serta verifikasi bahwa insert + audit atomik |
| QR | Token acak 32-byte disimpan sebagai SHA-256 digest, terikat session, expiry maksimum 30 menit/akhir sesi; QR hanya dapat dibuat untuk sesi active oleh pengelola berwenang | `partial` | Perlu test token single-use atau kebijakan multi-use yang eksplisit; saat ini token aktif dapat dipakai untuk tiap peserta yang memenuhi syarat sampai expiry |
| Geofence | Validasi consent eksplisit, rentang koordinat/akurasi, haversine radius + accuracy; hasil menyimpan status verifikasi dan akurasi | `partial` | Data lokasi presensi dan titik geofence merupakan data sensitif; perlu minimisasi, retensi, akses dan penghapusan yang jelas. Tidak boleh diasumsikan sudah lulus PDP hanya karena consent checkbox ada |
| Manual attendance | `PATCH manual_record`: pengelola program dapat menandai present/late/excused/sick/absent; perubahan yang sudah ada memerlukan expectedUpdated dan alasan, mencatat previousStatus dan audit | `partial` | UPDATE akhir belum memasukkan `updated=expectedUpdated` dalam predicate; pre-read check bukan atomic CAS. Koreksi bersamaan dapat saling menimpa |
| Session lifecycle | `PATCH session_status`: scheduled → active → closed/cancelled; penutupan membuat absent untuk peserta yang belum memiliki record; audit disimpan | `partial` | expectedUpdated hanya diperiksa sebelum batch; UPDATE akhir tidak mengikat versi. Perlu race test antara check-in dan close agar peserta tidak salah ditandai absent |
| Member correction | `POST request_correction`: anggota hanya mengajukan untuk record miliknya, status valid dan alasan minimal 10 karakter; pending duplicate diperiksa | `partial` | Duplicate check pre-read bukan unique/atomic claim; dua request paralel berpotensi membuat dua koreksi pending |
| Review correction | `PATCH review_correction`: reviewer (admin/full access, sekretaris, ketua) memutuskan approved/rejected dengan catatan; approval memperbarui record attendance dan audit | `partial` | Status pending dibaca dahulu lalu UPDATE tanpa predicate `approvalStatus='pending'`/version; concurrent reviewer race dan side-effect consistency belum diuji |
| Reporting/privacy | GET menyaring sesi sesuai role/program; anggota melihat sesi/record/koreksi sendiri; CSV export untuk data yang terlihat | `partial` | Perlu test export per role, filter scope, formula injection, data pribadi, dan browser UAT. GET memuat daftar record domain yang perlu diuji skala/pagination |

**Test inventory:** pencarian source/test pada baseline tidak menemukan dedicated handler integration suite untuk `attendance_session`, `attendance_record`, `attendance_qr_token`, atau `attendance_correction`. Test attendance yang ditemukan di `scripts/verify-roles.mjs` hanya menguji happy-path generic `PUT /api/attendance`; jangan menganggap itu mencakup HRM lifecycle di atas.

**Kesimpulan:** HRM attendance memiliki workflow lebih kaya daripada generic attendance register, tetapi status tetap `partial`. Temuan CAS di session/manual/correction perlu ditangani sebagai prioritas P1 bersama pengujian concurrency, QR replay, geofence privacy, dan role-scoped export. Belum ada bukti browser UAT atau Production runtime untuk alur ini.
