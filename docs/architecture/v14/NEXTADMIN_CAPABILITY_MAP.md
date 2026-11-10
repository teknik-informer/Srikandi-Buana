# NextAdmin Reference Capability Map

## Reference examined

- Demo: https://demo.nextadmin.co/
- Project: https://github.com/NextAdminHQ/nextjs-admin-dashboard
- Components: https://nextadmin.co/components
- Update notes: https://nextadmin.co/update-logs

The repository README describes NextAdmin 2.0 as a Next.js 16 / Tailwind dashboard with 200+ UI components, multiple dashboard variations, interactive pages connected to mock REST APIs, charts, tables, forms, profile/settings, and integrations such as Recharts, Leaflet, TanStack Table, Zod and FullCalendar.

This project does **not** copy NextAdmin branding, artwork, sample identities, product names, seeded dashboard metrics or mock API responses. It adopts compatible interaction patterns and reimplements them with Srikandi Buana's design system, records, authorization and APIs. The reference repository does not expose a root LICENSE file in the inspected tree, so do not transplant its source files or assets without independently confirming the applicable licence.

## Complete capability coverage target

| NextAdmin pattern / page family | Adopt | Srikandi destination | Data source / acceptance condition |
|---|---|---|---|
| Dashboard overview | Yes | Pusat Kendali and seven workspace overviews | Actual database aggregates; unavailable is explicit |
| Analytics dashboard | Yes | Monitoring and Laporan | Verified events, membership, programme, finance and activity data |
| eCommerce dashboard | Yes | E-Commerce & Rantai Pasok | Products, stock movement, orders and fulfilled sales |
| CRM dashboard | Yes | Kemitraan and Keanggotaan | Real contacts, partner interactions, member profiles and follow-ups |
| Marketing dashboard | Yes | Publikasi & Komunikasi | Published content and inbound communication; no assumed ad tracking |
| Stocks dashboard | Yes | E-Commerce stock + Keuangan assets | Product stock and organizational assets are different entities |
| Calendar | Yes | Manajemen → Kegiatan | Event start/end, status, venue and assigned person |
| Task list | Yes | Manajemen → Tugas dan Tindak Lanjut | Existing task record and assignment |
| Kanban | Yes | Same task route, alternative view | Drag/drop writes a validated status transition; no client-only status |
| Form Elements / Form Layout | Yes | Shared form components and domain forms | Existing CRUD APIs, server validation and audit trail |
| Basic Tables / advanced data tables | Yes | Shared list/table pattern | Server permission, sorting/filtering/pagination; CSV only within access scope |
| Charts: line, bar, pie | Yes | Monitoring and Laporan | Real aggregated records; no demo values |
| UI elements: accordion, avatar, buttons, breadcrumbs, progress, tooltip | Yes | Shared design system | Accessible variants, keyboard/focus support |
| File manager | Yes | Administrasi → Arsip Berkas | Existing private file metadata and protected object storage |
| Profile | Yes | Sistem → Profil Saya | Authenticated principal |
| Account/security | Yes | Sistem → Pengguna dan Hak Akses / Profil Saya | Sessions, roles, invitations and audit; sensitive values never shown |
| Notification settings | Yes | Sistem → Pengaturan / Notifikasi | User preferences and existing notifications |
| Inbox / messages | Yes | Publikasi & Komunikasi → Pesan Masuk | Existing messages; new private internal chat only after its data and retention design |
| Error pages / mail success / terms | Yes | Global application/public pages | Real system state and published policy |
| Global search | Yes | Shared application header | Query only the user's permitted records |
| Theme toggle | Yes | Shared workspace shell | One persisted preference; consistent across routes |

## Deliberately not copied

- Example users such as “John Smith”, sample companies or share-price widgets.
- Fictional revenue, visitor, conversion, stock, storage or location figures.
- The NextAdmin logo, branding, licensed/proprietary artwork or premium-only assets.
- Mock REST API behaviour masquerading as production data.
- A generic Forms menu that would duplicate the form entry points in business modules.

## Definition of done for a capability

A capability is not complete merely because a card or route exists. It must have:

1. A named owner domain and a stable record model.
2. A server/API path using the authenticated principal.
3. Server-side validation and authorization.
4. A meaningful empty/loading/error/success state.
5. Audit or event history for material changes.
6. Tests for the happy path, invalid input, role denial and concurrency where relevant.
7. A responsive accessible interface and an approved route in the navigation registry.

