# SRIKANDI BUANA — RBAC and Application Access Matrix

**Status:** Target authorization contract. Existing policy and PR #17 governance baseline remain authoritative until a reviewed implementation changes them.

## 1. Separate identity dimensions

- Account role/profile is not an organizational position.
- Position is not proof of a login identity.
- Module access is not equivalent to permission to perform every action in that module.
- Record scope and workflow state are additional authorization constraints.
- Each human operator has an individual account; shared accounts are prohibited.

## 2. Existing organizational profiles

| Existing profile | Baseline responsibility | Important boundary |
|---|---|---|
| Ketua | Organizational oversight and explicitly authorized decisions | Not a routine data-entry operator; no self-approval where prohibited |
| Sekretaris | Membership, governance, documents, meetings and administrative records | No finance transaction editing/reconciliation |
| Bendahara | Cash, finance, ledger and assigned business/asset workflows | No authority to alter Secretariat-verified source data |
| Koordinator | Assigned program activities and reporting | Program scope only; no cross-program access |
| Anggota | Own profile, own attendance and published member information | No access to other members' private records |
| Administrator Sistem / Arsitek | Technical configuration, security, integration and maintenance | No organizational approval or operational business data access in Production |
| Government / NGO / Partner | Explicit external grant | Purpose, data scope, expiry and revocation apply |

External roles are scoped grants, not internal organization positions.

## 3. Application access target

This is a proposed starting matrix, not a grant of authority. Exact permissions must be approved by domain owner and organization policy.

| Profile | HRM | Accounting | CRM | Projects | POS |
|---|---|---|---|---|---|
| Ketua | Oversight, selected approvals, aggregate reports | Oversight and authorized budget/report approvals | Partnership oversight | Portfolio oversight and authorized approvals | Sales/stock oversight reports |
| Sekretaris | Membership and organization administration | Read-only summaries where approved | Contact/meeting administration where assigned | Program administration and records where assigned | No default cashier or refund authority |
| Bendahara | Limited people references needed for finance | Finance operations, journals, reconciliation, reports | Supplier/customer financial references only | Budget and expense finance controls | Stock/sales finance controls and approved refunds per policy |
| Koordinator | Assigned people/activity data only | No ledger write; assigned budget visibility if granted | Assigned partner context | Assigned projects, tasks, evidence and progress | No default POS access |
| Anggota | Own profile, attendance, learning | Own approved statements only if applicable | No internal CRM access | Assigned participation information | Customer-facing transactions only if enabled |
| Administrator Sistem | Technical diagnostics, configuration and QA fixtures | No Production operational ledger access | No Production contact export | No Production beneficiary/project data access | No Production sales/refund access |
| External Viewer | No general HRM | Approved aggregate/project finance disclosure | Only explicitly shared partner relationship | Grant/project-scoped reporting | No POS operations |

## 4. Permission vocabulary

Use resource/action permissions, for example:
- `hrm.people.read`, `hrm.people.create`, `hrm.people.update`, `hrm.people.verify`
- `hrm.attendance.manage`, `hrm.attendance.self_checkin`, `hrm.attendance.correct`
- `accounting.journal.create`, `accounting.journal.post`, `accounting.journal.reverse`, `accounting.period.close`
- `accounting.budget.read`, `accounting.budget.approve`, `accounting.report.export`
- `crm.contact.read`, `crm.contact.manage`, `crm.partnership.approve`
- `projects.project.create`, `projects.task.assign`, `projects.evidence.verify`, `projects.report.approve`
- `pos.sale.create`, `pos.sale.void`, `pos.refund.request`, `pos.refund.approve`, `pos.shift.close`
- `platform.identity.manage`, `platform.module.configure`, `platform.integration.manage`, `platform.audit.read`

A permission grant alone is insufficient: also check workspace, module activation, scope, account status, assignment and workflow state.

## 5. Segregation of duties

- Maker/checker/approver must be separate when policy requires it.
- A requester must not approve their own request where the workflow prohibits self-approval.
- A journal creator must not be able to silently edit a posted journal.
- Refund approval requires a separate permission and a source sale reference.
- Platform technical administration never substitutes for organizational approval.
- Emergency support access, if later implemented, must be time-limited, justified, independently approved where possible and audited.

## 6. Required negative tests

Test denied access for:
- Direct URL to an ungranted application.
- API calls without the matching permission.
- Guessed IDs from another workspace.
- Coordinator access to an unassigned program.
- Member access to another member's profile/attendance.
- External grant after expiry or revocation.
- Technical admin attempting Production business data or approvals.
- Self-approval and duplicate approval.
- File/export access after source access has been revoked.
