# Module 001 — Smart Attendance Management

**Branch:** `feat/hrm-smart-attendance-001-2026-11-16-v2`  
**Baseline:** `feat/architect-identity-console-2026-11-15`  
**Status:** First operational increment; not yet production-ready.

## 1. Existing-system audit

The repository already had a legacy attendance feature:
- UI: `src/app/_components/attendance.tsx`
- API: `src/app/api/attendance/route.ts`
- Data: one `kehadiran` record per activity, storing a list of member IDs and notes.

That legacy feature is a manual attendance checklist. It does not provide scheduled sessions, participant-level attendance records, QR token validation, correction workflow, or attendance reporting.

The active database connection is Neon PostgreSQL. The current application does not have a separate `sb_hrm` database or a dedicated HRM schema connection. The current repository also does not have Supabase Auth or MUI installed.

## 2. Implementation delivered in this increment

### Routes

- `/dashboard/presensi` — management workspace.
- `/dashboard/presensi-saya` — personal member workspace.
- `/app/hrm/attendance` — compatibility redirect to management workspace.
- `/app/member/attendance` — compatibility redirect to member workspace.
- `/api/hrm/attendance` — authenticated server API.

### Persistence compatibility layer

To avoid an unreviewed database migration while the migration history is being reconciled, this increment uses the existing owner-scoped `records` table through a dedicated API/repository boundary.

| Record kind | Purpose |
|---|---|
| `attendance_session` | Session details, time window, event/program reference, eligible participant IDs and status |
| `attendance_record` | One participant's attendance state and check-in evidence |
| `attendance_correction` | Member correction request and decision |
| `attendance_qr_token` | Session-scoped QR token hash and expiry |
| `attendance_audit` | Append-only application-level audit events |

This is a compatibility persistence model, **not** the final normalized `sb_hrm` schema. No database migration was applied and no Production data was changed.

### Implemented behavior

- Create scheduled attendance sessions.
- Validate session name, type, date, start/end time and location.
- Associate an existing activity record and optional program ID.
- Select active, verified members as participants.
- Open, close and cancel sessions.
- Manual check-in by authorized officers.
- Member self check-in.
- Late status based on configured grace minutes.
- Deterministic attendance record IDs to prevent duplicate check-in.
- QR session token generation, SHA-256 token-hash storage, session binding and expiry validation.
- Optional geofence validation in the API, requiring one-time location consent; device coordinates are not persisted.
- Member correction request, Secretary/Chair review, and previous-state retention.
- CSV export with spreadsheet formula-injection mitigation.
- Management summary and member-only attendance history.

## 3. Role mapping in the current organization model

The repository does not currently define separate `HRM Manager` or `Attendance Officer` account roles. This increment maps the workflow to existing profiles:

| Existing profile | Attendance capability |
|---|---|
| Arsitek Sistem / Administrator Sistem | Full access only when server authentication grants the Preview QA capability |
| Ketua | Read management sessions and review correction requests |
| Sekretaris | Create/manage sessions, manage attendance, review corrections and export |
| Koordinator | Manage sessions within assigned program scope; no general member directory returned |
| Anggota | Self check-in and own history/correction requests |
| Bendahara | No attendance access |

The API enforces these rules server-side. The generic records API explicitly denies the private attendance record kinds; attendance data is served only through the attendance API.

## 4. Important limitations before acceptance

The current increment is not yet the full Module Prompt 001 acceptance scope.

1. **Dedicated HRM schema/database:** not implemented. Existing Neon database and generic `records` storage are used temporarily.
2. **Migration reconciliation:** not complete. The branch migration files and live Neon migration ledger have divergent histories/names. Do not run the migration runner from this feature branch against QA or Production until reconciled.
3. **MUI:** not installed in the current repository. The UI uses the installed Tailwind/shadcn design system to avoid a package-lock-breaking dependency change.
4. **QR visual renderer/scanner:** secure token issuance and server validation exist, but this increment returns a check-in URL; it does not yet render a QR image or provide an in-app camera scanner.
5. **GPS UI:** server-side geofence validation exists, but the session form does not yet expose geofence configuration and the member UI does not yet request one-time geolocation.
6. **Participant types:** the first increment supports active, verified KWT members. Staff, volunteers, guests and field-worker records need the HRM participant directory/identity model first.
7. **PDF/XLSX:** CSV export is implemented. PDF and XLSX templates remain pending.
8. **Check-out, attendance locations CRUD, attendance settings, calendar view and scheduled reminders:** pending.
9. **End-to-end UAT:** no authenticated browser test has been completed yet. CI success alone will not prove email, QR-camera, GPS or mobile workflows.
10. **Data model:** append-only audit events are enforced by API behavior, not yet by database triggers/normalized append-only tables.

## 5. Security and privacy controls

- Every endpoint requires an authenticated session.
- Write requests require same-origin or same-origin fetch metadata.
- Workspace ownership is included in every database lookup.
- Members can only read their own attendance history.
- Check-in requires session status active, matching local date/time window and participant eligibility.
- Duplicate check-in uses a deterministic workspace/session/participant identifier and database primary-key conflict handling.
- QR tokens use 256-bit random values; only SHA-256 hashes are stored.
- QR tokens are bound to a session and expire no later than the session end or 30 minutes.
- GPS is optional unless a session explicitly enables geofencing; location is never tracked continuously and raw device coordinates are not stored.
- Corrections require a reason and reviewer decision; the previous status is retained.
- CSV values are quoted and spreadsheet formula prefixes are neutralized.

## 6. Required next implementation stages

1. Complete migration-ledger reconciliation and establish the canonical migration source.
2. Design normalized HRM tables and a migration plan on a disposable QA branch.
3. Add a participant directory for members, staff, volunteers and guests with global identity references.
4. Add a QR encoder and mobile scanner using a reviewed local dependency.
5. Add session geofence configuration and explicit one-time location capture.
6. Add PDF/XLSX report templates and export privacy tests.
7. Add attendance settings, location registry, calendar, check-out and reminders.
8. Add authenticated Playwright UAT for each role, duplicate/replay attempts, corrections, and responsive mobile.
9. Only after all acceptance tests pass, request approval for a release decision. No Production migration or deployment is authorized by this branch.
