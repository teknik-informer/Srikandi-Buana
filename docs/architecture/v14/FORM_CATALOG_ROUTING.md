# v14 — Form Catalogue and Domain Routing

## Core rule

The help centre contains **form documentation**: field definitions, instructions, validation rules and versions. It is not where users submit operational forms.

The operational form is opened from the record that owns the data. One record has one canonical owner domain and one API write path. Do not create a second form library that writes the same information to another record kind.

## Template-to-domain mapping

| Template ID | Help-centre documentation | Operational menu | Canonical record kind | Status |
|---|---|---|---|---|
| partner-engagement-log | Catatan Penjajakan Mitra | E-Commerce & Rantai Pasok → Kemitraan | kemitraan | Field mapping required |
| tot-session-record | Laporan Training of Trainers | Manajemen → Kegiatan | kegiatan | Field mapping required |
| tot-attendance-roster | Daftar Hadir ToT | Manajemen → Daftar Hadir | kehadiran | Field mapping required |
| tot-action-plan | Rencana Aksi Pasca-ToT | Manajemen → Tugas dan Tindak Lanjut | tindaklanjut | Existing fields reused; confirm evidence mapping |
| partner-document-register | Register Dokumen Mitra | Administrasi → Register Dokumen | register | Existing register extended only where needed |
| program-preparation-checklist | Kesiapan Program Sebelum Perjanjian | E-Commerce & Rantai Pasok → Kemitraan | kemitraan | Field mapping required |
| basic-member-intake | Pendataan Awal Anggota | Administrasi → Keanggotaan | anggota | Existing membership form; verify consent minimization |

The exact template definitions remain versioned in `src/features/agriculture/templates.mjs`. A template can be shown as “panduan” while its operational implementation remains “belum diaktifkan”. This prevents the documentation from falsely claiming that a template is a working form.

## Required form UX

Every owning module must provide:

- Contextual “Tambah” action in its own page.
- Field groups with concise instructions and the minimum necessary personal information.
- Required/optional indicators, format/length/date/enum validation and accessible error messages.
- Draft/save/submit states only when the underlying API supports those states.
- Evidence link/file control with permission checks; do not store private documents as public assets.
- Confirmation and unsaved-change protection.
- Server-side validation; client-side validation is only an aid.
- Audit entry for material changes.
- Role-based field visibility and edit rights.
- Clear statement where a field awaits official partner guidance.

## ToT and pre-agreement safety

- A ToT session is a training record, not evidence of an executed programme agreement.
- Attendance records do not automatically make participants programme beneficiaries.
- A readiness checklist does not authorise a programme, expense, grant, target or claim.
- Partner document status distinguishes not requested, requested, promised, received and source/version verified.
- No legal or government form is represented as official unless the issuing institution's source document has been received and verified.
- No NIK, full birth date, bank account, health or unnecessary personal data is requested in the basic attendance form.

## Migration compatibility

During the v14 migration, old JSON record keys remain readable. Field additions are non-destructive. A future normalized schema may store structured child tables, but it must preserve the source record ID, owner/organization scope, created/updated timestamps and audit lineage.
