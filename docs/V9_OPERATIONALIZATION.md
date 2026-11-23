# V9.1 operationalization — implementation record

## Source of truth

- Application baseline: `v9-rebuild` (Arena.ai-generated Srikandi Buana V9.1).
- Working branch: `feat/v9-operational-core`.
- Pull request #57 was closed without merge; the working branch remains available and was not merged into the V9.1 base branch.
- The previous production application is not an architecture, route, design, or data baseline for V9.1.
- This branch is additive. Do not merge it into `v9-rebuild` or deploy it to production until review and acceptance.

## Database isolation

- Neon project: `Srikandi Buana Core` (`hidden-surf-18556907`).
- Development branch: `v9-operational-dev` (`br-bitter-sky-a1busxt3`).
- Database: `srikandi`.
- All V9.1 application-owned tables are in schema `v9`.
- The existing `public` schema has not been changed by the V9 migrations.
- No old production database, domain, user records, member data, or transactions were copied.
- Vercel runtime must use `V9_DATABASE_URL` configured with a V9-only, least-privilege application role. Never point it at a legacy `DATABASE_URL`.

## Applied schema

Files applied on the isolated development branch:

1. `db/migrations/0001_v9_identity_and_membership.sql`
2. `db/migrations/0002_membership_interest_context.sql`
3. `db/migrations/0003_first_admin_bootstrap.sql`
4. `db/migrations/0004_membership_interest_org_scope.sql`
5. `db/migrations/0005_secretariat_letters.sql`
6. `db/migrations/0006_secretariat_meetings_minutes_attendance.sql`
7. `db/migrations/0007_secretariat_attendance_upsert_key.sql`
8. `db/migrations/0008_secretariat_document_register_and_files.sql`
9. `db/migrations/0009_field_applications_operational_core.sql`
10. `db/migrations/0010_field_team_assignments.sql`

The `v9` schema currently includes 28 tables:

- organization, organizational units, and four field-application registry rows;
- people, user accounts, memberships, and scoped role assignments;
- hashed-token sessions and login rate limits;
- organization-scoped membership-interest submissions and bootstrap state;
- Secretariat letter register, meetings, versioned minutes, meeting decisions, meeting attendance, document register, and revisioned file storage;
- field workplans, programs, indicators, activities, tasks, and field-team assignments;
- audit events, organization settings, outbox events, and migration history.

Structural seed data is limited to one Srikandi Buana organization, seven organization units, and four approved field applications. No initial administrator, login account, actual member, financial balance, transaction, letter, activity history, or operational KPI is seeded.

The database role `v9_app` has read/write access to application tables in schema `v9`. Privilege checks confirmed it cannot read the legacy `public.users` table and cannot create objects in schema `v9`.

## Implemented application boundaries

### Database client

- Server-only Neon client in `src/lib/db.ts`.
- Dedicated environment variable `V9_DATABASE_URL`; it does not fall back to an old generic database URL.
- Shared result normalization for Neon query return shapes.
- Authenticated identity includes the organization ID; member, letter, and review queries enforce that scope.

### Identity and authentication

- Hardcoded demo account catalogue and the `demo1234` login path removed from the login UI.
- Password hashing and verification use Node.js scrypt with timing-safe comparison.
- Login resolves accounts and current role assignments from the V9 database.
- Session cookies contain random opaque tokens; only SHA-256 token hashes are stored in `v9.sessions`.
- Login attempts are rate limited per HMAC-protected email/IP subject pair.
- Logout revokes the database session before clearing the cookie.
- Page layouts apply server-side permission/role checks for Pengurus, Keuangan, Sekretariat, Bidang, Anggota, POS, and Studio.
- Membership activation and Secretariat letter mutations have separate permission checks.
- First administrator provisioning is a one-time CLI operation: `npm run bootstrap:v9-admin`. It requires explicit environment values and a confirmation phrase; it has not been run and no real account has been created.

### Membership-interest and membership workflow

The implementation follows the V9.1 division of duties:

1. **Bidang Organisasi & Keanggotaan** performs the initial review of public membership-interest submissions. It can move submissions to review, approve them for registration, or reject them.
2. **Sekretariat** owns the authoritative Buku Induk, verifies approved applicants, assigns an official member number when the organization has determined it, and controls activation/inactivation/exit status.
3. **Pengurus** sees a read-only organization summary. It does not directly edit the membership register.
4. **Anggota** and other portals must read only the records and fields allowed to their account's active role and scope.

Technical implementation:

- The public join form validates on the server and writes to `v9.membership_interests`.
- Each submission is scoped to the organization and writes a `membership.interest.submitted` outbox event in the same SQL statement.
- A real reference number is generated by PostgreSQL, not by a random client value.
- The Organization & Membership field app includes a database-backed, organization-scoped review queue.
- Review decisions are permission-checked server-side, organization-scoped, and written to the audit log.
- Approval creates or reuses a person record and creates/links a membership in `pending` status. It does not activate membership or create a login account.
- Sekretariat Buku Induk reads actual V9 membership rows, shows database counts/status tabs, and supports authorized activation/inactivation/departure changes.
- Member numbers are not auto-generated: the Secretariat action accepts an optional manually assigned number so the application does not invent an organizational numbering policy.
- Pengurus membership view is read-only and database-backed.
- Secretariat verification page is a read-only, database-backed application tracker. It does not duplicate the initial decision authority of the Organization & Membership field app.
- Membership status changes are organization-scoped and audited. Activating a membership does not automatically create a login account.

### Secretariat letter register

- Letter registration writes to `v9.secretariat_letters` and an audit event in one SQL statement.
- Incoming and outgoing records share one organization-scoped source of data.
- The external/official letter number is optional and never invented by the application; the system generates a separate internal `REG-YYYY-NNNNNN` reference for traceability.
- Letter status changes follow the controlled forward transition `baru → diproses → selesai`, with server-side permission checks and audit events.
- The Expedition page reads the same letter register; there is no duplicate localStorage dataset.
- No real letter records or demo letters were seeded into the V9 database.

### Secretariat meetings, minutes, decisions, and attendance

- Meeting schedule records are stored in `v9.secretariat_meetings`; a system reference is generated, and no meeting sample rows are seeded.
- Creating a meeting creates its initial draft minutes and audit event in the same SQL statement.
- The Rapat & Undangan page reads the shared meeting registry and supports organization-scoped scheduling, completion, and cancellation.
- Agenda Organisasi reads scheduled meetings from the same database table; it does not read the old `ACTIVITIES` demo array.
- Minutes are stored as revisions in `v9.secretariat_minutes`; decisions are held in `v9.secretariat_meeting_decisions`.
- Draft minutes can be edited. Finalization is permitted only after a meeting is marked completed and there is at least some minutes content or a recorded decision.
- Final minutes are not edited in place. A new draft revision copies the last final text and decision list, leaving the prior revision intact.
- Attendance is stored in `v9.secretariat_meeting_attendance` and linked to a meeting. Participants can be selected from active/pending organization memberships or entered as external guests.
- Attendance statuses are `hadir`, `izin`, `sakit`, and `alpa`. A separate flag records whether a physical signature sheet was checked; it is not an electronic signature.
- A generated attendee key prevents duplicates for the same registered person or normalized guest name within a meeting.
- Meeting, minutes, decision, revision, and attendance mutations are organization-scoped and write audit events.
- Agenda, Rapat, Notulen, and Presensi read the same operational records. They do not read seeded meeting arrays or browser `localStorage`.

### Secretariat document register and archive

- The Secretariat document register is stored in `v9.secretariat_documents`; file revisions are stored separately in `v9.secretariat_document_files`.
- Files are stored as PostgreSQL `bytea` in the isolated V9 schema, with a 3 MiB per-upload limit.
- Accepted formats: PDF, JPG/JPEG, PNG, DOCX, XLSX, and PPTX. The server checks extension, MIME declaration, and file signature before storing.
- Each upload receives a revision number, SHA-256 checksum, MIME type, filename, size, and uploader identity.
- Replacing a file on a final document returns the document to draft until the updated version is reviewed and finalized again.
- Finalization requires an attached file. Public visibility additionally requires the server-side `documents:publish` permission.
- Archiving changes status and preserves metadata and file revisions; the application does not delete document records.
- The download route checks public-final status or authenticated organization role/scope. Documents marked limited are restricted to designated senior roles.
- The public `/dokumen` page reads only final, public documents with an attached file. It does not read the old `DOCUMENTS` demo array.
- The upload route is configured with a 4 MiB Server Action body limit; the application and database enforce a 3 MiB file size limit.

### Field applications — shared operational core and team assignment

- All four approved field applications use one shared data model, partitioned by `organization_id` and `field_key`: `v9.field_workplans`, `v9.field_programs`, `v9.field_program_indicators`, `v9.field_activities`, and `v9.field_tasks`.
- Composite foreign keys tie programs to workplans, indicators to programs, and activities/tasks to programs or activities in the same organization and same field. A record cannot be linked across fields through these relations.
- Rencana Kerja records can be drafted and submitted for review. The approval decision screen/action for submitted workplans still needs to be implemented; creating or submitting a workplan does not make it approved.
- Program records support an optional workplan link and an optional budget request. Budget requests do not post to the ledger and remain subject to the Finance application workflow.
- Program indicators store target and actual values separately. Actual values are entered by an authorized field user and written to audit; no actual result is prefilled.
- Activities support scheduling, start, completion, and cancellation with audit events. A dedicated field-activity attendance register and evidence files are still pending; no attendance figure is inferred from audit-event counts.
- Tasks support priorities, optional links to program/activity, a responsible-person label, due dates, and controlled status transitions. A task marked complete cannot be reopened through the normal status action.
- The field dashboard now computes active unit membership, workplans, programs, scheduled activities, and task counts from V9. No hardcoded KPI or seeded activity array is used for those figures.
- The field team register is distinct from membership in a unit. An active member of the matching unit can be proposed for a field assignment. A proposal remains `proposed` until organization leadership approves it; only then does it become `active`. Ending an assignment records an end event and preserves history.
- Field coordinators can propose/end assignments within their field scope. Activation requires the separate `organization:team:approve` permission. Team assignment does not automatically grant an application login role or change the person's system permissions.
- Current development data has no active memberships assigned to the four field units, so the dashboard member counts and eligible team lists correctly show zero/empty. No demo staff or sample task records were inserted.

## Verification performed

- GitHub Actions for commit `8378bcb9e5d4db4d444a9a4964e706828c03b149` completed successfully:
  - `npm ci`
  - `npm run typecheck`
  - `npm run build`
- GitHub Actions for the Secretariat letter UI/server-page commit `e4379b2d857d2c6814abf4c82e70b18f501d35a7` completed successfully through typecheck and production build.
- GitHub Actions for the V9 meeting/minutes/agenda/attendance implementation commit `364bef67b7a039a39378361b92d23114da8d45b3` completed successfully: install, typecheck, and production build.
- GitHub Actions for the document register, file download route, and public documents page commit `ef127aa1f96f60dade8f8eeb3bbd969b00f1b7eb` completed successfully: install, typecheck, and production build.
- GitHub Actions for field dashboard commit `cc874297c270e0aefbf96bdc0b50d5f29c485f56` completed successfully: install, typecheck, and production build.
- GitHub Actions for field team roster commit `fc223bf77c5ae9db6abc7ca60bcf247fe9ab4db8` and corrected revalidation commit `c2d626db9ec477b4727f87f883e23186766022a6` completed successfully: install, typecheck, and production build.
- Privilege checks: `v9_app` can read/insert/update document records and read/insert file revisions; it can write audit events and use the document reference sequence.
- Neon development schema check: 28 V9 tables and ten applied migrations.
- Role privilege checks: `v9_app` can read/insert/update meeting, minutes, decisions, attendance, field plans/programs/indicators/activities/tasks, field team assignments, and audit records; it cannot create schema objects or read legacy user records.
- PostgreSQL query-plan checks passed for meeting creation, minutes draft save, decision insertion, finalization, revision creation, attendance upsert, document registration, metadata update, file upload, finalization, archive, public listing, download, field dashboard, field program/indicator/activity/task queries, and field team roster/proposal/approval/end.
- Privilege checks: `v9_app` can read/insert/update the Secretariat letters table and write audit records, but cannot read legacy users or create schema objects.
- SQL query plans were obtained for organization-scoped public submission/outbox insertion, membership review/approval, and membership status update.
- No browser E2E, real account login, or real data insertion test has been completed yet.
- No V9 deployment, Vercel environment change, domain switch, or production database migration has been performed.

## Remaining blockers and work

1. Email verification, invitation and password-reset tokens, plus a reliable outbox delivery worker (using the agreed email provider), are not yet implemented.
2. The initial administrator still needs to be provisioned through the one-time CLI using an organization-authorized name, email, and password.
3. Several remaining operational modules still use the original client reducer and browser `localStorage` demo state. Each must be migrated to server-side domain services and shared database persistence before operational use.
4. Sample dashboard figures and seeded content must not be represented as actual organizational records.
5. Secretariat agenda, meetings, minutes, decisions, attendance, and document/archive register now use the V9 database. Field workplans, programs, indicators, activities, tasks, team assignments, and dashboard now use the V9 database. Workplan approval, field-specific land/production records, training sessions and attendance, business catalog/orders/stock, field evidence, budgets, reports, finance, POS, portals, invitations, public calendar publishing, and CMS publishing still need their own domain schemas, authorization, transactional services, and tests.
6. V9.1 Vercel project access is not currently visible in the connected Vercel team. Preview deployment is blocked until the correct Vercel project/team is authorized.
7. Production release remains blocked until preview, migration rehearsal, automated tests, role-based UAT, responsive/accessibility checks, security review, backups, and rollback readiness are complete.

## Release boundary

This work is a development foundation, not a production-ready release. Keep the existing production domain untouched until V9.1 is complete, accepted, and verified end to end.
