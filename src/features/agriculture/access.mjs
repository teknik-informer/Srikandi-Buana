export const agencyRoles = Object.freeze([
  "member", "field_enumerator", "group_leader", "program_coordinator",
  "finance_officer", "quality_officer", "supply_chain_operator",
  "executive", "internal_reviewer", "partner_viewer", "platform_admin",
]);

const permissionSets = {
  member: [
    "person.read_own", "person.request_correction", "membership.read_own",
    "program.read_enrolled", "service.read_own", "attendance.read_own",
    "grievance.create", "consent.read_own", "consent.update_own",
  ],
  field_enumerator: [
    "person.read", "person.create", "person.update_unverified",
    "membership.read", "membership.create", "farm.read", "farm.create",
    "plot.read", "plot.create", "field_observation.read", "field_observation.create",
    "attendance.read", "attendance.create", "service.read",
  ],
  group_leader: [
    "organisation.read", "organisation.update_profile", "membership.read",
    "membership.create", "membership.submit_verification", "governance.read",
    "governance.create", "governance.submit", "program.read", "activity.read",
    "activity.create", "activity.update", "activity.submit", "task.read",
    "task.create", "task.update", "report.read", "report.create",
    "grievance.read_metadata", "market.read", "supply_chain.read_summary",
  ],
  program_coordinator: [
    "program.read", "program.update_delivery", "beneficiary.read",
    "beneficiary.create", "beneficiary.update_unverified", "service.read",
    "service.create", "attendance.read", "attendance.create",
    "indicator.read", "indicator.create_observation", "report.read",
    "report.create", "activity.read", "activity.create", "activity.update",
    "task.read", "task.create", "task.update", "evidence.read_program",
    "evidence.attach_program", "grievance.create",
  ],
  finance_officer: [
    "finance.read", "finance.create_transaction", "finance.submit_transaction",
    "finance.reconcile", "budget.read", "procurement.read", "procurement.create",
    "procurement.submit", "goods_receipt.create", "invoice.read",
    "asset.read", "asset.update_custody", "report.read_finance",
  ],
  quality_officer: [
    "standard.read", "assessment.read", "assessment.create",
    "assessment.update_draft", "inspection.read", "inspection.create",
    "finding.read", "finding.create", "finding.update", "capa.read",
    "capa.create", "capa.update", "farm.read_quality_scope",
    "plot.read_quality_scope", "traceability.read", "evidence.read_quality_scope",
    "report.create_quality",
  ],
  supply_chain_operator: [
    "trading_partner.read", "contract.read", "delivery.read",
    "delivery.create", "delivery.update_pending", "quality_test.read",
    "quality_test.create", "lot.read", "lot.create", "lot.update_pending",
    "inventory.read", "inventory.record_movement", "traceability.read",
    "traceability.create_event", "market.read", "market.create_quote",
    "report.create_supply_chain",
  ],
  executive: [
    "organisation.read", "organisation.update_profile", "governance.read",
    "membership.read", "program.read", "program.approve", "budget.read",
    "budget.approve", "procurement.read", "procurement.approve",
    "finance.read", "finance.approve_transaction", "finance.release_payment",
    "report.read", "report.approve", "report.export", "activity.read",
    "activity.approve", "task.read", "task.approve", "partner.read",
    "partner.approve_due_diligence", "legal_registration.read",
    "legal_registration.submit_verification", "standard.read",
    "assessment.read", "inspection.read", "finding.read", "capa.read",
    "traceability.read", "market.read", "audit.read_metadata",
    "grievance.read_metadata", "evidence.approve_release",
  ],
  finance_reviewer: [
    "finance.read", "budget.read", "procurement.read", "invoice.read",
    "report.read_finance", "audit.read_finance",
  ],
  quality_reviewer: [
    "standard.read", "assessment.read", "inspection.read",
    "finding.read", "capa.read", "traceability.read",
    "report.read_quality",
  ],
};

const restrictedResources = new Set([
  "identity_document", "bank_account", "safeguarding_case", "grievance_case",
  "precise_plot_geometry", "health_record",
]);
const separationActions = new Set([
  "approve", "verify", "reconcile", "release_payment", "publish",
  "approve_export", "close_finding", "close_program",
]);
const scopeLimitedRoles = new Set([
  "field_enumerator", "program_coordinator", "quality_officer", "supply_chain_operator",
]);

function has(values, value) {
  return Array.isArray(values) && values.includes(value);
}

function sameActor(a, b) {
  return Boolean(a && b && String(a) === String(b));
}

function isWithinAssignedScope(principal, record) {
  if (record.programId && scopeLimitedRoles.has(principal.role)
    && !has(principal.assignedProgramIds, String(record.programId))) return false;
  if (record.siteId && ["quality_officer", "supply_chain_operator", "field_enumerator"].includes(principal.role)
    && !has(principal.assignedSiteIds, String(record.siteId))) return false;
  return true;
}

function grantAllows(grant, request, now) {
  if (!grant || grant.active !== true || !grant.expiresAt) return false;
  const expiry = Date.parse(grant.expiresAt);
  if (!Number.isFinite(expiry) || expiry <= now.getTime()) return false;
  if (grant.organisationId !== request.record.organisationId) return false;
  if (!has(grant.resources, request.resource) || !has(grant.actions, request.action)) return false;
  if (request.record.programId && !has(grant.programIds, String(request.record.programId))) return false;
  if (request.record.siteId && grant.siteIds?.length && !has(grant.siteIds, String(request.record.siteId))) return false;
  if (restrictedResources.has(request.resource) && grant.restrictedDataApproved !== true) return false;
  if (request.record.containsPersonalData === true && grant.personalDataApproved !== true) return false;
  return true;
}

/**
 * The v13 permission layer is deliberately separate from legacy login roles.
 * It must not be wired to API routes until accounts, role assignments and
 * record scopes are migrated and security tests pass. Unknown roles deny.
 */
export function authorizeAgencyAction(request = {}) {
  const principal = request.principal || {};
  const record = request.record || {};
  const now = request.now instanceof Date && Number.isFinite(request.now.getTime())
    ? request.now
    : new Date();
  const deny = (reason) => ({ allowed: false, reason });

  if (!agencyRoles.includes(principal.role)) return deny("Peran belum dikenal.");
  if (!request.resource || !request.action || !record.organisationId) {
    return deny("Konteks organisasi, sumber daya dan tindakan wajib tersedia.");
  }
  if (principal.organisationId !== record.organisationId) {
    return deny("Data berada di luar organisasi akun.");
  }

  if (principal.role === "platform_admin") {
    return request.resource === "system" && ["read", "configure", "manage_access"].includes(request.action)
      ? { allowed: true, reason: "Akses administrasi sistem." }
      : deny("Administrator platform tidak otomatis mendapat akses ke data bisnis atau pribadi.");
  }

  if (principal.role === "partner_viewer" || principal.role === "internal_reviewer") {
    if (!grantAllows(request.grant, { ...request, record }, now)) {
      return deny("Tidak ada mandat akses aktif yang mencakup data, tindakan dan ruang lingkup ini.");
    }
    if (["person", "membership", "identity_document", "bank_account", "safeguarding_case",
      "grievance_case", "precise_plot_geometry"].includes(request.resource)) {
      return deny("Data individu atau data terbatas tidak tersedia melalui akses peninjau/mitra umum.");
    }
    return { allowed: true, reason: "Diizinkan oleh mandat akses terbatas dan berlaku." };
  }

  if (principal.role === "member") {
    const ownRecord = sameActor(record.personId, principal.personId);
    const permission = request.resource + "." + request.action;
    if (!ownRecord || !permissionSets.member.includes(permission)) {
      return deny("Anggota hanya dapat mengakses layanan dan data miliknya sendiri.");
    }
    if (restrictedResources.has(request.resource)) return deny("Jenis data ini memerlukan layanan khusus dengan akses terbatas.");
    return { allowed: true, reason: "Akses layanan mandiri atas data sendiri." };
  }

  const permission = request.resource + "." + request.action;
  if (!(permissionSets[principal.role] || []).includes(permission)) {
    return deny("Tindakan tidak termasuk kewenangan peran.");
  }
  if (!isWithinAssignedScope(principal, record)) {
    return deny("Program atau lokasi tidak termasuk penugasan akun.");
  }
  if (restrictedResources.has(request.resource)) {
    return deny("Sumber daya ini memerlukan mandat akses khusus yang belum tersedia untuk peran ini.");
  }
  if (request.action === "read" && record.containsPersonalData === true
    && principal.role !== "executive") {
    return deny("Data personal memerlukan hak akses yang lebih spesifik.");
  }
  if (separationActions.has(request.action)
    && (sameActor(record.createdBy, principal.accountId)
      || sameActor(record.initiatedBy, principal.accountId)
      || sameActor(record.createdBy, principal.userId)
      || sameActor(record.initiatedBy, principal.userId))) {
    return deny("Pemisahan tugas: pembuat atau pengaju tidak boleh menyetujui tindakannya sendiri.");
  }
  return { allowed: true, reason: "Diizinkan oleh matriks kewenangan dan ruang lingkup." };
}

export function listAgencyPermissions(role) {
  if (["partner_viewer", "internal_reviewer", "platform_admin"].includes(role)) return [];
  return [...(permissionSets[role] || [])];
}
