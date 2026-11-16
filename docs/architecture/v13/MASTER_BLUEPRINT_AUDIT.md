# SRIKANDI BUANA — Audit Arsitektur Master Blueprint

**Tanggal audit:** 16 November 2026  
**Repository:** `teknik-informer/Srikandi-Buana`  
**Branch baseline:** `main`  
**Branch fitur yang diperiksa:** `feat/architect-identity-console-2026-11-15`  
**Tujuan:** memetakan kondisi nyata sebelum mengimplementasikan Integrated Modular Organization & Business Management Platform.

> Dokumen ini adalah audit kode, konfigurasi, metadata skema, dan status perubahan. Ini bukan sertifikasi keamanan, bukan UAT browser, dan bukan pernyataan bahwa semua workflow telah siap produksi. Tidak ada data bisnis atau data pribadi anggota yang disalin ke dokumen ini.

---

## 1. Executive Summary

SRIKANDI BUANA sudah memiliki fondasi aplikasi manajemen yang cukup luas: website publik, autentikasi internal, kontrol akses berbasis peran, administrasi anggota, operasional, pertanian, keuangan, katalog/pemesanan, persediaan, kemitraan, dokumen, notifikasi, serta sebagian indikator dampak.

Namun kondisi saat ini **belum sama dengan target Master Blueprint**.

| Area | Kondisi terobservasi | Status terhadap target |
|---|---|---|
| Platform | Satu aplikasi Next.js dengan beberapa dashboard/pilar | Sudah ada fondasi |
| Identity | Identitas dan sesi dikelola aplikasi melalui tabel `users` dan `sessions` | Belum memakai Supabase Auth |
| Authorization | Role dan scope diperiksa di server; jabatan dipisahkan dari role aplikasi | Fondasi sudah ada, perlu permission catalog lebih granular |
| Modul | Fitur tersebar di route, API, feature registry, dan schema database | Ada, tetapi belum seluruhnya bounded context mandiri |
| Database | Satu project Neon, satu database aplikasi, schema `public` dan `workspace_v14` | Belum terpisah per database/domain |
| Integrasi | Ada beberapa event/history khusus domain; belum terbukti ada integration platform generik | Perlu dibangun bertahap |
| Frontend | Next.js, React, TypeScript, Tailwind CSS, komponen shadcn/Radix | MUI belum terpasang |
| Backend/database | Neon PostgreSQL, Neon serverless driver, Drizzle ORM | Supabase belum terpasang |
| File | Metadata dan sebagian konten file ditangani melalui tabel database | Belum sesuai target object storage terpisah |
| QA | Branch QA terpisah dari Production; beberapa perubahan PR sudah diuji otomatis | Perlu rekonsiliasi migrasi dan UAT terautentikasi |
| Rilis | PR #17, #21, dan #22 masih Draft/open | Belum menjadi baseline Production |

**Kesimpulan:** jangan melakukan big-bang rewrite atau langsung memecah database. Langkah yang benar adalah menyelesaikan audit dan rekonsiliasi skema, menetapkan kontrak domain, menguatkan Platform Core, kemudian memindahkan domain satu per satu.

---

## 2. Repository dan Status Perubahan

### 2.1 Baseline repository

- Default branch repository adalah `main`.
- README pada `main` mengidentifikasi aplikasi sebagai Enterprise Ecosystem v11.5 Beta Staging dan secara eksplisit belum menyatakan production-ready.
- Paket aplikasi pada `main` menggunakan Next.js 16.4.5, React 19.2.6, TypeScript 5.9.3, Neon serverless, Drizzle ORM, React Hook Form, Zod, dan Recharts.
- Styling yang terpasang adalah Tailwind CSS 4 dan ekosistem komponen shadcn/Radix. Dependensi MUI dan Supabase tidak ditemukan pada `package.json` yang diperiksa.

### 2.2 Pull request yang relevan

| PR | Isi | Status saat audit |
|---|---|---|
| #17 | Governance RBAC, registri administrasi, dan paket laporan | Draft, open, belum merge |
| #21 | Navigasi dan account menu | Draft, open, belum merge |
| #22 | Konsol identitas, email/WhatsApp, dan Full Access QA Preview | Draft, open, belum merge |

PR #22 berada di atas branch PR #17. PR #21 merupakan branch terpisah di atas PR #17; perubahan navigasi PR #21 tidak otomatis menjadi bagian dari Preview PR #22.

Commit PR #22 yang diperiksa: `50e360bac18e6e38f3fd6cd089747488ad475734`. Dua GitHub Actions check-run untuk commit tersebut berstatus completed/success. Ini membuktikan pemeriksaan CI pada commit itu berhasil, bukan UAT browser atau verifikasi email/WhatsApp nyata.

---

## 3. Technology Stack: Current vs Target

| Lapisan | Implementasi sekarang | Target Master Blueprint | Tindakan |
|---|---|---|---|
| Web framework | Next.js App Router | Next.js App Router | Pertahankan |
| UI | React + Tailwind + shadcn/Radix | React + MUI + Emotion | Rencanakan adopsi MUI bertahap; jangan mengganti seluruh UI sekaligus |
| Bahasa | TypeScript | TypeScript | Pertahankan |
| Form dan validasi | React Hook Form + Zod | React Hook Form + Zod | Pertahankan |
| Tabel dan grafik | Recharts; tabel khusus/komponen yang ada | TanStack Table + Recharts | Tambahkan sesuai kebutuhan modul |
| Database | Neon PostgreSQL | Supabase PostgreSQL atau PostgreSQL domain terpisah | Perlu keputusan migrasi dan rehearsal |
| Auth | Custom session pada `users`/`sessions` di Neon | Supabase Auth terpusat | Migrasi identitas harus menjadi proyek tersendiri |
| Backend | Next.js Route Handlers, server-side services, Neon driver | Next.js handlers/actions + internal API | Pertahankan pola backend; ekstrak service/domain |
| ORM/query | Neon serverless driver dan adapter SQL; Drizzle dependency tersedia | PostgreSQL client/ORM yang ditetapkan | Standarkan repository/persistence layer |
| Email | Nodemailer + Gmail pada branch fitur | Email notification service | Pertahankan untuk tahap awal, tambah observability |
| Hosting | Vercel | Vercel | Pertahankan |
| Source control/CI | GitHub + GitHub Actions | GitHub + CI/CD | Pertahankan |
| File storage | Tabel `file_objects` pada database untuk konten file di runtime yang diperiksa | Object storage | Pisahkan penyimpanan file dari transaksi database |

### Keputusan migrasi teknologi

Master Blueprint menetapkan MUI dan Supabase sebagai target. Keduanya **belum menjadi implementasi aktif** pada branch yang diperiksa. Perubahan tersebut harus dilakukan secara bertahap dan tidak boleh dianggap sudah tersedia.

Sebelum memindahkan Neon ke Supabase, wajib tersedia:
1. Inventaris tabel, constraint, index, trigger, function, dan migration history.
2. Pemetaan tipe data dan kompatibilitas SQL.
3. Desain central identity dan verifikasi token lintas layanan.
4. Strategi ekspor, transformasi, import, validasi jumlah/baris/checksum, cutover, dan rollback.
5. Uji RLS serta negative tests untuk akses lintas organisasi.
6. Lingkungan staging Supabase yang terpisah dari Production.

Jangan menganggap JWT Supabase Auth dari satu project otomatis menjadi token Data API project Supabase lain. Backend harus memverifikasi identitas dan permission sebelum mengakses database modul.

---

## 4. Existing Application Architecture

### 4.1 Pola aplikasi

Implementasi sekarang paling tepat disebut **modular monolith yang sedang diekstraksi bertahap**:
- Satu deployment Next.js.
- Satu koneksi database yang dipilih berdasarkan environment.
- Route handlers berada di `src/app/api`.
- Domain policy dan registry mulai dipisahkan di `src/features`.
- Shared runtime, authentication, query, dan adapter berada di `src/lib`.
- UI dashboard masih banyak dirakit dari komponen bersama dan route kompatibilitas.

Dokumen `docs/architecture/v12/DOMAIN_BOUNDARIES.md` juga menetapkan modular monolith sebagai tahap saat ini dan menegaskan bahwa dashboard pillar bukan otomatis database boundary atau authorization boundary.

### 4.2 Database environment

Project Neon yang diperiksa mempunyai branch Production dan branch QA tersendiri. Aplikasi memilih:
- Production/local: `DATABASE_URL`.
- Vercel Preview: hanya `PREVIEW_DATABASE_URL`.
- Preview tidak boleh fallback ke Production apabila URL QA tidak tersedia.

Pemisahan environment ini benar dan harus dipertahankan.

### 4.3 Database inventory

Database aplikasi yang diperiksa bernama `neondb`. Tabel bisnis berada pada schema `public` dan `workspace_v14`; schema `neon_auth` juga tersedia pada database.

| Lingkungan | Tabel schema public | Tabel schema workspace_v14 |
|---|---:|---:|
| Production | 52 | 50 |
| QA | 55 | 50 |

QA memiliki tiga tabel tambahan yang tidak ditemukan pada Production:
- `report_packages`
- `report_package_events`
- `report_package_counters`

Perbedaan ini sesuai dengan sebagian pekerjaan paket laporan yang masih berada pada branch pengembangan dan belum menjadi skema Production.

### 4.4 Domain yang sudah tercermin pada skema

| Domain target | Bukti tabel yang sudah ada | Catatan |
|---|---|---|
| Platform/Core | `users`, `sessions`, `account_invitations`, `settings`, audit dan role grants | Identitas, akun, konfigurasi dan audit masih bercampur dengan schema operasional lama |
| HRM | `records`, `workspace_v14.member_profiles`, `organization_memberships`, `organization_units` | Perlu menetapkan satu sumber kebenaran profil anggota dan riwayatnya |
| Accounting | `ledger_accounts`, `ledger_entries`, `ledger_lines`, `ledger_reversals`, rekonsiliasi bank, `funds`, `budget_allocations` | Buku kas lama dan ledger perlu direkonsiliasi sebelum laporan gabungan |
| CRM | `partner_organizations`, `partner_interactions`, `external_organizations` | Perlu satu model organisasi/kontak eksternal dengan status hubungan yang jelas |
| Project Management | `programmes`, `activities`, `tasks`, `activity_attendance`, `evidence_links` | Fondasi program dan tugas sudah tersedia |
| POS | `commerce_products`, `commerce_orders`, `commerce_sales_invoices`, `commerce_sales_invoice_receipts` | Pesanan tidak boleh dianggap sebagai pembayaran terverifikasi |
| Inventory & Procurement | `inventory_items`, `stock_movements`, `inventory_transfers`, `inventory_stocktakes`, tabel procurement dan supplier bills | Ada fondasi persediaan dan pembelian |
| Agriculture | `farm_plots`, `crop_cycles`, `harvest_records`, `supply_lots`, `supply_lot_events` | Domain pertanian dan traceability sudah mulai terbentuk |
| Document & Content | `documents`, `files`, `file_objects`, tabel publikasi dan dokumen | Metadata, konten file, versi, dan approval perlu dipisahkan secara eksplisit |
| MEL & Analytics | `impact_indicators`, `indicator_observations`, `quality_observations`, `evidence_links` | Belum terbukti sebagai analytics warehouse/read model terintegrasi |
| Collaboration | `messages`, `ecosystem_notifications`, `operational_events` | Layanan tersedia sebagian; perlu kontrak notifikasi dan event lintas domain |

Inventaris tabel membuktikan adanya fondasi data, bukan bahwa seluruh layar dan workflow pada setiap domain sudah selesai atau siap produksi.

---

## 5. Identity, Role, Permission, and Scope Audit

### 5.1 Yang sudah ada

- Autentikasi aplikasi menggunakan akun dan sesi server.
- Tabel `users` memisahkan account ID, workspace owner, member ID, role, position, dan program assignment.
- Session token disimpan sebagai hash pada database.
- Pemeriksaan akses dilakukan di server; menu yang disembunyikan bukan satu-satunya pengaman.
- Policy membedakan Administrator Sistem, Ketua, Sekretaris, Bendahara, Koordinator, dan Anggota.
- Posisi struktural tidak harus unik untuk satu akun. Beberapa orang dapat memegang jabatan/profil akses yang sama dengan akun dan audit masing-masing.
- Full Access Arsitek Sistem dibatasi pada Preview QA dengan branch yang ditentukan; Production tetap menolak akses bisnis untuk role teknis.

### 5.2 Yang masih perlu diselesaikan untuk target platform

1. Permission catalog terstruktur per resource dan action: `view`, `create`, `update`, `delete`, `approve`, `export`, `publish`.
2. Scope standar: organisasi, modul, unit, program/proyek, record, dan mitra eksternal.
3. Module access grant dan feature flag yang terpisah dari role.
4. Central identity service yang tidak bergantung pada satu modul bisnis.
5. Emergency access yang dibatasi waktu, membutuhkan alasan, memerlukan persetujuan sesuai kebijakan, dan selalu diaudit.
6. Pengujian lintas organisasi, eskalasi role, akses ID record tebakan, file URL, serta pencabutan sesi.

Jabatan organisasi tetap menjadi data HRM/governance. Role aplikasi adalah konfigurasi hak akses. Keduanya tidak boleh digabung menjadi satu kolom otoritas.

---

## 6. Database Drift and Migration Findings

### 6.1 QA dan Production tidak identik

Perbandingan metadata skema menemukan:
- QA mempunyai tiga tabel paket laporan tambahan.
- Kolom `login_phone`, `phone_verified_at`, dan `phone_verified_by` tersedia pada `users` di QA, tetapi tidak pada Production.
- Kolom verifikasi WhatsApp dan index terkait tersedia pada `account_invitations` di QA, tetapi tidak pada Production.
- Constraint purpose pada undangan QA menerima tujuan perubahan email dan aktivasi/pemulihan WhatsApp; Production masih membatasi tujuan awal aktivasi dan reset.

Ini adalah perbedaan yang diharapkan untuk fitur yang belum dirilis, tetapi harus tercatat jelas dalam migration/release ledger.

### 6.2 Migration ledger belum merepresentasikan seluruh file migrasi fitur

Tabel `schema_migrations` pada kedua environment mencatat rangkaian migrasi aplikasi hingga `019_inventory_document_lifecycle.sql`. Namun branch fitur yang diperiksa juga memiliki file:
- `009_report_packages.sql`
- `010_report_package_source_scope.sql`
- `011_verified_email_change.sql`
- `012_whatsapp_login_identity.sql`
- `013_multi_officer_positions.sql`

Nama-nama file tersebut belum tercatat pada tabel `schema_migrations` yang diperiksa, meskipun sebagian objek hasilnya sudah terlihat pada QA.

Konsekuensi:
- Status migrasi tidak dapat ditentukan hanya dari nama branch atau klaim PR.
- Migration runner dapat menganggap file tersebut belum diterapkan dan mencoba menjalankannya lagi.
- Sebagian file tampak dirancang agar dapat dijalankan ulang, tetapi perilaku rerun tetap harus diuji pada branch sementara.
- Riwayat aplikasi, penerapan manual, dan migration ledger harus direkonsiliasi sebelum migrasi berikutnya.

**Tindakan wajib:** buat satu daftar migrasi kanonis, cocokkan setiap file dengan objek aktual pada QA dan Production, tetapkan checksum/versi, lalu pastikan migration runner dapat mengidentifikasi status dengan benar. Jangan mengubah ledger Production secara manual tanpa rencana dan persetujuan.

### 6.3 Batas keamanan

- Tidak ada migrasi Production yang dijalankan dalam audit ini.
- Tidak ada tabel atau baris Production yang diubah.
- Tidak ada environment secret yang dibaca atau ditampilkan.
- QA harus diperlakukan sebagai lingkungan data terpisah; jangan mengasumsikan semua salinannya anonim tanpa bukti masking.

---

## 7. Target Module Architecture and Data Ownership

Target modul mengikuti Master Blueprint, dengan satu Platform Core dan domain independen.

| Modul target | Data owner | Data inti | Integrasi utama |
|---|---|---|---|
| Platform Core | Platform | user identity, organization registry, roles, permissions, module registry, grants, preferences, audit, integration registry | Semua modul |
| HRM | HRM | anggota, personel, struktur, jabatan, penugasan, kehadiran, pelatihan | Core, Projects, MEL |
| Accounting | Accounting | COA, jurnal, ledger, kas/bank, piutang/utang, anggaran, aset, laporan | Projects, POS, Procurement |
| CRM | CRM | kontak, organisasi eksternal, mitra, donor, buyer, supplier, leads, pipeline | Projects, Accounting |
| Project Management | Projects | program, proyek, aktivitas, tugas, milestone, deliverable, risiko, progress | HRM, CRM, Accounting, MEL |
| POS | POS | outlet, terminal, transaksi, item, pembayaran, retur, shift | Inventory, Accounting |
| Inventory & Procurement | Inventory | item, gudang, stock ledger, purchase request/order, receipt, issue, transfer | POS, Accounting, Agriculture |
| Agriculture | Agriculture | lahan, plot, siklus tanam, input, panen, batch, traceability | Inventory, Projects, MEL, CRM |
| Document & Content | Content | metadata dokumen, versi, template, surat, notulen, publikasi, halaman, media | Semua modul |
| Collaboration | Platform shared service | notifikasi, kalender, pesan, direktori tim, reminder | Semua modul |
| MEL & Analytics | Analytics | indikator, target, observasi, survei, evidence reference, outcome, read models | Semua modul |

### Aturan kepemilikan

1. HRM menjadi sumber kebenaran profil anggota. Modul lain menyimpan referensi global, bukan salinan seluruh data pribadi.
2. Accounting menjadi sumber kebenaran transaksi akuntansi.
3. POS tidak menulis langsung ke ledger Accounting atau stock Inventory.
4. Inventory menjadi sumber kebenaran saldo dan pergerakan persediaan.
5. Project Management menjadi sumber kebenaran penugasan dan progres proyek.
6. CRM menjadi sumber kebenaran relasi eksternal; hubungan tidak boleh dinyatakan resmi sebelum persetujuan dan bukti tersedia.
7. Analytics hanya membaca projection/aggregate yang disediakan domain pemilik.
8. File binary ditempatkan di object storage; database menyimpan metadata, checksum, owner, classification, dan pointer.

---

## 8. Target Integration Architecture

Tidak boleh ada query atau write langsung lintas database domain.

### Integration matrix

| Producer | Consumer | Event/contract | Kontrol |
|---|---|---|---|
| HRM | Project Management | `MemberAssignedToProject` | Referensi member ID; scope dan status keanggotaan diverifikasi |
| CRM | Project Management | `PartnershipApproved` | Hanya setelah persetujuan dan bukti |
| Project Management | Accounting | `ProjectBudgetRequested`, `ProjectExpenseSubmitted` | Approval, idempotency, audit, budget scope |
| POS | Inventory | `SaleCommitted`, `ReturnAccepted` | Stock movement atomik pada domain Inventory |
| POS | Accounting | `SaleSettled`, `RefundIssued` | Hanya transaksi pembayaran/settlement tervalidasi |
| Procurement | Inventory | `GoodsReceived`, `GoodsIssued` | Penerimaan dan pergerakan stok tervalidasi |
| Agriculture | Inventory | `AgriculturalInputConsumed`, `HarvestReceived` | Satuan, lot, tanggal, lokasi, dan bukti |
| Semua modul | Analytics | Domain events/periodic projections | Timestamp, freshness, source, verification status |

### Event envelope minimum

- `event_id` unik.
- `event_type` dan `schema_version`.
- `source_module`.
- `organization_id`.
- `aggregate_id` dan `aggregate_version`.
- `occurred_at`.
- `correlation_id`.
- `idempotency_key`.
- `payload` tervalidasi dan diminimalkan.

Bangun transactional outbox/inbox, retry dengan backoff, dead-letter/failure registry, consumer idempotency, dan reconciliation. Gunakan saga untuk workflow lintas database yang tidak dapat dijadikan satu transaksi atomik.

Untuk skala tahap awal, application service internal boleh mengorkestrasi domain di dalam modular monolith. Kontrak dan batas kepemilikan harus ditetapkan lebih dahulu agar ekstraksi layanan/database kelak tidak memerlukan rewrite.

---

## 9. Module Navigation and Dashboard Gap

Registry saat ini mengelompokkan fitur ke empat area besar:
- Organisasi.
- Publikasi.
- Pelaporan.
- Administrasi.

Blueprint menargetkan dashboard sistem yang lebih eksplisit:
- HRM.
- Accounting.
- CRM.
- Project Management.
- POS.
- Inventory & Procurement.
- Agriculture.
- Document Management.
- Collaboration.
- MEL & Analytics.
- System Administration.

Perubahan navigasi harus dilakukan tanpa menghapus route lama. Setiap route lama dipetakan ke modul pemiliknya, kemudian module launcher menampilkan hanya modul yang statusnya aktif dan diizinkan untuk akun tersebut.

Module registry minimal memuat:
- module ID dan kode.
- nama dan deskripsi.
- status: Planned, Available, Active, Suspended, Maintenance, Deprecated.
- route entry.
- permission requirement.
- dependency.
- database/service reference.
- versi kontrak API.
- health state.
- feature flags.

Dashboard pilar adalah cara menyajikan pengalaman pengguna; ia tidak menggantikan domain ownership atau pemeriksaan permission server.

---

## 10. Gap Register

| ID | Prioritas | Gap | Risiko | Tindakan |
|---|---|---|---|---|
| GAP-01 | Critical | Migration ledger tidak cocok dengan seluruh migration files dan keadaan QA | Rerun migrasi, drift, dan ketidakpastian rilis | Rekonsiliasi file, checksum, objek, dan ledger |
| GAP-02 | High | Database operasional masih satu database lintas domain | Coupling data dan sulitnya isolasi domain | Terapkan schema ownership dan repository boundary; pisahkan fisik setelah siap |
| GAP-03 | High | Auth masih custom Neon, bukan central Supabase Auth target | Migrasi identitas dan token lintas DB belum tersedia | Desain identity migration dan compatibility layer |
| GAP-04 | High | Module registry masih empat pilar | Pengalaman pengguna belum sesuai module launcher target | Perluas registry tanpa menghapus route lama |
| GAP-05 | High | API/domain services belum seragam untuk seluruh modul | Integrasi lintas domain rentan coupling | Tetapkan application service dan API contract |
| GAP-06 | High | Belum terbukti ada generic outbox/event registry untuk semua domain | Event dapat hilang atau terkirim ganda | Implementasikan outbox/inbox dan idempotency |
| GAP-07 | High | Accounting dan buku kas lama perlu rekonsiliasi | Laporan gabungan dapat salah | Definisikan COA, opening balance, mapping, dan closing rules |
| GAP-08 | High | Penyimpanan binary masih terikat pada database runtime | Membesarkan database dan memperumit lifecycle file | Migrasikan file ke object storage dengan signed URL |
| GAP-09 | Medium | MUI belum terpasang; UI saat ini Tailwind/shadcn | Design system berbeda dari blueprint | Adopsi MUI bertahap setelah design tokens dan komponen dasar ditetapkan |
| GAP-10 | Medium | Analytics belum terbukti memakai read model lintas domain dengan freshness metadata | Dashboard dapat menampilkan data stale seolah real-time | Bangun projection dan indikator freshness/source |
| GAP-11 | Medium | Workflow POS/payment masih terbatas | Order dapat disalahartikan sebagai pembayaran | Pisahkan order, payment, settlement, fulfillment, refund |
| GAP-12 | Medium | UAT browser lintas akun dan role belum lengkap | CI hijau belum membuktikan perjalanan pengguna nyata | Playwright/E2E dengan akun uji pada QA |
| GAP-13 | Medium | File dan dokumen belum seluruhnya memiliki versioning/classification lifecycle seragam | Akses, retensi, dan audit tidak konsisten | Tetapkan document contract dan object storage metadata |

---

## 11. Recommended Implementation Roadmap

### Phase 0 — Audit and Stabilization (sekarang)

1. Rekonsiliasi migration ledger QA/Production.
2. Dokumentasikan database ownership dan hubungan tabel.
3. Petakan API, service, route, permission, dan feature registry.
4. Pastikan Preview selalu menggunakan database QA.
5. Tetapkan data masking dan fixture UAT.
6. Selesaikan daftar gap dan acceptance criteria.

**Exit criteria:** tidak ada migrasi yang statusnya ambigu; QA/Production drift terdokumentasi; seluruh domain memiliki owner dan batas akses.

### Phase 1 — Platform Core

1. Central identity abstraction.
2. Organization registry dan membership.
3. Permission catalog, role assignment, dan scope.
4. Module registry dan module launcher.
5. Global navigation, preferences, notification metadata.
6. Audit log dan integration registry.
7. System Administration yang memisahkan kendali teknis dari keputusan organisasi.

**Exit criteria:** semua route memakai permission server yang konsisten; modul dapat diaktif/nonaktifkan tanpa menghapus data; akun dapat diuji tanpa akses Production.

### Phase 2 — HRM

1. Satu sumber kebenaran anggota.
2. Struktur organisasi, jabatan berulang, penugasan.
3. Riwayat keanggotaan dan verifikasi.
4. Kehadiran dan pelatihan.
5. Ekspor dan laporan HRM dengan minimisasi data.

**Exit criteria:** anggota, pengurus, dan akun terhubung konsisten; perubahan status mengevaluasi ulang akses.

### Phase 3 — Accounting

1. Chart of Accounts dan periode akuntansi.
2. Mapping Buku Kas lama ke COA.
3. Journal posting, ledger, trial balance.
4. Budget dan grant accounting.
5. Rekonsiliasi bank dan aset.
6. Koreksi melalui reversing entries.

**Exit criteria:** opening balance dan saldo historis direkonsiliasi; jurnal seimbang dan immutable; laporan dapat ditelusuri ke sumber.

### Phase 4 — Project Management

Program, proyek, tugas, penugasan, milestone, deliverable, risiko, progres, dan integrasi anggaran.

### Phase 5 — CRM

Kontak, organisasi eksternal, donor, buyer, supplier, lead, pipeline, komunikasi, follow-up, dan bukti kemitraan.

### Phase 6 — Inventory & Agriculture

Master item, gudang, stock ledger, procurement, goods receipt/issue, plot, crop cycle, input, harvest, lot, dan traceability.

### Phase 7 — POS

Diaktifkan hanya saat kegiatan perdagangan benar-benar berjalan. Pisahkan order, payment, settlement, fulfillment, return, dan refund. Jangan mengaktifkan QRIS/payment gateway sebelum provider, webhook signature, idempotency, dan reconciliation diuji.

### Phase 8 — Content, Collaboration, MEL & Analytics

Document lifecycle, template generator, surat, notulen, kalender, notifikasi, indikator, baseline/target, observasi, evidence, dashboard, dan reporting snapshots.

### Phase 9 — Physical Database Separation

Setelah domain boundary dan kontrak stabil:
1. Pindahkan satu domain per siklus.
2. Sediakan database/connection/secret/migration/backup per domain.
3. Gunakan UUID global dan API/event contract.
4. Jalankan dual-read atau shadow comparison bila diperlukan.
5. Cutover dengan rollback plan.
6. Hapus akses lintas database langsung setelah parity terverifikasi.

Supabase dapat menjadi target platform sesuai blueprint. Central Auth harus tetap satu; database modul tidak boleh mengandalkan token Data API project lain tanpa verifikasi backend dan authorization yang eksplisit.

---

## 12. Release and Safety Rules

1. `main` dan Production tidak diubah sebagai bagian audit ini.
2. PR #17, #21, dan #22 tetap Draft sampai acceptance criteria dan UAT dipenuhi.
3. Tidak menjalankan migrasi Production.
4. Tidak mengganti secret, URL database, domain, atau perlindungan SSO.
5. Tidak membuat data anggota atau transaksi fiktif pada Production.
6. Tidak menyalin data pribadi ke repository.
7. Semua migrasi diuji pada branch QA/temporary terlebih dahulu.
8. Tidak mengklaim integrasi selesai hanya karena tabel atau menu tersedia.
9. Setiap modul harus mempunyai owner, contract, permission tests, migration plan, backup/recovery plan, dan UAT.
10. Pemisahan database dilakukan setelah kesiapan domain dibuktikan, bukan sekadar untuk menambah jumlah database.

---

## 13. Immediate Next Actions

Urutan kerja berikutnya yang paling aman:

1. Buat **Migration Reconciliation Report**: cocokkan seluruh file SQL branch fitur dengan ledger QA/Production dan objek aktual.
2. Buat **Data Ownership & Relationship Map** per tabel, termasuk foreign key, owner predicate, dan referensi lintas domain.
3. Buat **Module/API Contract Catalog**: endpoint yang ada, application service owner, permission, input/output, dan event yang diterbitkan.
4. Tetapkan **Platform Core v1** sebagai kontrak identitas, organisasi, role, permission, module registry, dan audit.
5. Susun **QA acceptance matrix** untuk akun Ketua, Sekretaris, Bendahara, Koordinator, Anggota, Government/NGO, dan Arsitek Sistem.
6. Setelah Phase 0 selesai, implementasikan perubahan pertama dalam PR terpisah dan tetap di Preview.

**Status akhir audit:** fondasi modular sudah ada, tetapi target multi-database, Supabase Auth, MUI, generic integration layer, dan dashboard per sistem belum sepenuhnya diimplementasikan. Prioritas pertama bukan membangun semua database sekaligus, melainkan menyelesaikan migration reconciliation dan memperjelas kepemilikan data.
