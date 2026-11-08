# SRIKANDI BUANA v14 — Workspace Information Architecture

## Objective

Rebuild the application as one coherent organizational operating system for the KWT, not as a set of unrelated dashboards. Keep the existing seven workspaces as business domains, but unify navigation, records, search, forms, reporting, files, and user experience.

The sidebar has three tiers:

1. **Workspaces** — daily operational domains.
2. **Utilities** — Monitoring and Laporan, available according to role.
3. **Pusat Bantuan** — a permanent support destination outside the business modules.

No separate “Template & Pengembangan” business menu is permitted.

## Primary workspace map

| Workspace | Primary responsibility | Existing route IDs to retain | NextAdmin capability absorbed here |
|---|---|---|---|
| Ekosistem | Member self-service, notifications, shared services | portal, notifikasi | Dashboard shell, notifications, user profile entry |
| Manajemen | Plans, activities, meetings, tasks, attendance, approvals | program, laporan_program, tindaklanjut, kegiatan, kehadiran, musyawarah, pengajuan, enterprise | Calendar, task list, Kanban, analytics summaries |
| Administrasi | Membership, organizational structure, consent, official records and archives | anggota, pengurus, persetujuan, surat, register, sumber, kelembagaan, transkripsi, dokumen | CRM-style person records, file manager, searchable tables, forms |
| Keuangan | Cash, journals, financial controls and assets | kas, laporan, akuntansi, aset | Finance dashboard, transaction tables, charts, approvals |
| E-Commerce & Rantai Pasok | Products, orders, stock, coffee intake, commercial and partner relationships | penjualan, lotkopi, usaha, kemitraan | eCommerce, Stocks, CRM, product/catalog pages |
| Publikasi & Komunikasi | Public content, gallery, incoming messages and communication | publikasi, galeri, pesan | Marketing, inbox, message centre, content management |
| Sistem | Accounts, role assignments, site/application settings | akun, akun-saya, pengaturan | Profile, account, security, settings, team management |

Existing URLs are compatibility contracts. A route may be reorganized in the navigation without changing its URL. New views should be added as subviews inside the domain that owns the data, not as duplicate top-level modules.

## Utilities and support

### Utilities

- **Monitoring** — technical readiness plus operational exceptions and data quality. A metric must come from an actual query or be explicitly shown as unavailable.
- **Laporan** — domain reports and period summaries, with permission-aware export.
- **Pusat Bantuan** — a permanent sidebar shortcut and a direct route at `/dashboard/panduan`. It is documentation, not an operational data module.

### Help centre content

The help centre owns:

- Usage guide and role-based instructions.
- Template field definitions, validation rules, examples and version history.
- Partner/ToT pre-agreement guidance.
- Record status glossary and evidence standards.
- Privacy, consent and safeguarding guidance.
- Release notes and support contacts.

The catalogue of template definitions must not appear as a normal business menu or as a form-entry destination. All data entry takes place in the owning domain.

## Form placement rules

| Template definition | The operational input belongs in | Stored domain kind / route |
|---|---|---|
| Partner Engagement Log | E-Commerce & Rantai Pasok → Kemitraan | kemitraan |
| ToT Session Record | Manajemen → Kegiatan | kegiatan |
| ToT Attendance Roster | Manajemen → Daftar Hadir | kehadiran |
| Post-ToT Action Plan | Manajemen → Tugas dan Tindak Lanjut | tindaklanjut |
| Partner Document Register | Administrasi → Register Dokumen | register |
| Pre-Agreement Readiness Checklist | E-Commerce & Rantai Pasok → Kemitraan | kemitraan |
| Basic Member Intake | Administrasi → Keanggotaan | anggota |

A template describes a field set. The owning domain presents the real create/edit form, applies authorization, validates data, persists through its API, and records an audit event. Do not create a second “Forms” workspace that duplicates these inputs.

## NextAdmin capability integration

The visual and functional ideas of NextAdmin are adopted as patterns, then assigned to Srikandi Buana domains:

| Reference capability | Srikandi Buana destination |
|---|---|
| Dashboard variations (analytics, eCommerce, CRM, marketing, stocks) | Seven role-aware workspaces and their overview pages |
| Calendar | Manajemen → Kegiatan, with calendar/list views over the same activity records |
| Task List and Kanban | Manajemen → Tugas dan Tindak Lanjut, with list/board views over the same task records |
| CRM | Kemitraan and membership records; engagement history, contacts, follow-ups and scopes |
| eCommerce | E-Commerce & Rantai Pasok → Catalog, Orders and Sales |
| Stocks / Inventory | E-Commerce stock and Keuangan assets; keep product stock distinct from organization assets |
| Forms | In-context domain forms; field definitions documented in Pusat Bantuan |
| Tables | Shared table pattern within each data-owning module; search, filters, sort, pagination, bulk actions and export by permission |
| Charts | Monitoring and Laporan; only real aggregated records |
| File Manager | Administrasi → Arsip Berkas, with evidence linked back to owning records |
| Profile and Settings | Sistem and account menu |
| Messages / Inbox | Publikasi & Komunikasi |
| UI Elements | Shared component system, not a user-facing menu |
| Error, mail-success and terms pages | Application/public system states; not business modules |

## Shared shell and interaction model

- One sidebar, one workspace header, one breadcrumb pattern and one content frame across all routes.
- Global search uses the existing application data access layer and only returns records the current principal may read.
- Global actions are contextual: Create activity in Manajemen, Add transaction in Keuangan, Add product/order in Commerce.
- Theme is a single preference control; no page-specific theme implementations.
- Notifications link to the owning record and do not expose protected data in message previews.
- Every table has a purposeful empty state, loading state, error state, search, pagination, and a clear permission explanation.
- Calendar and Kanban are alternate views over existing records, never independent stores.
- Use semantic status labels and do not use colour alone to convey state.
- Maintain keyboard access, visible focus and 44 px recommended touch targets.

## Dashboard data integrity

Every KPI and chart must be sourced from the database or shown as “Belum tersedia / belum ada catatan”. A missing value is not zero. Do not seed fictional members, beneficiaries, programme budgets, sales, production, certification claims or market prices to fill a dashboard.

## Compatibility and navigation policy

- Existing route IDs remain supported during the transition.
- Old `/dashboard/pengembangan` links redirect to `/dashboard/panduan#template`.
- No dead menu entries. A future capability is documented in the help centre and has no clickable business route until its workflow is implemented and verified.
- Menu visibility is a convenience layer; API and record-level authorization remain the security boundary.
