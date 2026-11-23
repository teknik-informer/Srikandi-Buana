import { Handshake, Milestone, Plus, Target } from "lucide-react";
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  Notice,
  PageHeader,
  StatCard,
} from "@/components/ui";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { can, requireIdentity } from "@/lib/session";
import type { FieldDef } from "@/config/fields";
import {
  createBusinessAgreement,
  createBusinessMilestone,
  createBusinessOpportunity,
  createBusinessPartner,
  updateBusinessAgreementStatus,
  updateBusinessMilestoneStatus,
  updateBusinessOpportunityStage,
  updateBusinessPartnerStatus,
} from "@/app/actions/business";

interface BusinessSummary {
  partner_count: number;
  active_partner_count: number;
  prospect_partner_count: number;
  open_opportunity_count: number;
  won_opportunity_count: number;
  active_agreement_count: number;
  overdue_milestone_count: number;
  pipeline_value: string;
}

interface PartnerRow {
  id: string;
  reference_no: string;
  partner_name: string;
  partner_type: string;
  status: "prospect" | "active" | "inactive" | "ended";
  contact_name: string | null;
  contact_role: string | null;
  phone: string | null;
  email: string | null;
  relationship_summary: string | null;
  owner_label: string | null;
  next_review_date: string | null;
}

interface OpportunityRow {
  id: string;
  reference_no: string;
  partner_id: string | null;
  partner_name: string | null;
  title: string;
  opportunity_type: string;
  stage: "lead" | "qualified" | "proposal" | "negotiation" | "won" | "lost" | "on_hold";
  estimated_value: string | null;
  currency_code: string;
  expected_decision_date: string | null;
  next_action: string | null;
  next_action_date: string | null;
  owner_label: string | null;
}

interface AgreementRow {
  id: string;
  reference_no: string;
  partner_id: string;
  partner_name: string;
  opportunity_id: string | null;
  opportunity_title: string | null;
  agreement_type: string;
  title: string;
  status: "draft" | "review" | "signed" | "active" | "expired" | "terminated";
  start_date: string | null;
  end_date: string | null;
  signatory_label: string | null;
  responsible_label: string | null;
}

interface MilestoneRow {
  id: string;
  reference_no: string;
  partner_id: string;
  partner_name: string;
  opportunity_id: string | null;
  opportunity_title: string | null;
  agreement_id: string | null;
  agreement_title: string | null;
  title: string;
  due_date: string | null;
  status: "open" | "in_progress" | "completed" | "blocked" | "cancelled";
  completion_note: string | null;
}

function dateLabel(value: string | null): string {
  if (!value) return "Belum ditentukan";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function moneyLabel(value: string | null, currency = "IDR"): string {
  if (value === null || value === "") return "Belum diestimasi";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "—";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(numeric);
}

const partnerTypeLabel: Record<string, string> = {
  pemerintah: "Pemerintah",
  ngo: "NGO / Yayasan",
  swasta: "Swasta",
  koperasi: "Koperasi",
  akademik: "Akademik",
  komunitas: "Komunitas",
  perorangan: "Perorangan",
  lainnya: "Lainnya",
};

const partnerStatusLabel: Record<PartnerRow["status"], string> = {
  prospect: "Penjajakan",
  active: "Aktif",
  inactive: "Tidak aktif",
  ended: "Berakhir",
};

const opportunityTypeLabel: Record<string, string> = {
  akses_pasar: "Akses pasar",
  pengadaan: "Pengadaan",
  hibah: "Hibah / dukungan",
  pelatihan: "Pelatihan",
  riset: "Riset",
  program: "Program",
  lainnya: "Lainnya",
};

const stageLabel: Record<OpportunityRow["stage"], string> = {
  lead: "Prospek",
  qualified: "Terkualifikasi",
  proposal: "Proposal",
  negotiation: "Negosiasi",
  won: "Berhasil",
  lost: "Tidak berhasil",
  on_hold: "Ditunda",
};

const stageTone: Record<OpportunityRow["stage"], "neutral" | "info" | "warning" | "success" | "danger"> = {
  lead: "neutral",
  qualified: "info",
  proposal: "info",
  negotiation: "warning",
  won: "success",
  lost: "danger",
  on_hold: "neutral",
};

const agreementStatusLabel: Record<AgreementRow["status"], string> = {
  draft: "Draf",
  review: "Ditinjau",
  signed: "Ditandatangani",
  active: "Aktif",
  expired: "Berakhir",
  terminated: "Dihentikan",
};

const milestoneStatusLabel: Record<MilestoneRow["status"], string> = {
  open: "Terbuka",
  in_progress: "Berjalan",
  completed: "Selesai",
  blocked: "Terhambat",
  cancelled: "Dibatalkan",
};

function resultNotice(result?: string): { tone: "success" | "warning" | "danger" | "info"; text: string } | null {
  if (!result) return null;
  const messages: Record<string, { tone: "success" | "warning" | "danger" | "info"; text: string }> = {
    "partner-created": { tone: "success", text: "Mitra berhasil dicatat." },
    "partner-updated": { tone: "success", text: "Status mitra berhasil diperbarui." },
    "partner-stale": { tone: "warning", text: "Catatan mitra sudah berubah atau tidak lagi tersedia." },
    "opportunity-created": { tone: "success", text: "Peluang kerja sama berhasil dicatat." },
    "opportunity-updated": { tone: "success", text: "Tahap peluang berhasil diperbarui." },
    "opportunity-transition-blocked": { tone: "warning", text: "Perubahan tahap tidak sesuai dengan alur peluang." },
    "outcome-required": { tone: "warning", text: "Keputusan akhir memerlukan catatan alasan minimal 3 karakter dan persetujuan pengurus." },
    "agreement-created": { tone: "success", text: "Draf perjanjian berhasil dibuat." },
    "agreement-updated": { tone: "success", text: "Status perjanjian berhasil diperbarui." },
    "agreement-transition-blocked": { tone: "warning", text: "Perubahan status perjanjian tidak dapat dilakukan dari status saat ini." },
    "milestone-created": { tone: "success", text: "Milestone kerja sama berhasil dicatat." },
    "milestone-updated": { tone: "success", text: "Status milestone berhasil diperbarui." },
    "milestone-transition-blocked": { tone: "warning", text: "Perubahan status milestone tidak sesuai dengan alurnya." },
    "invalid": { tone: "warning", text: "Periksa kembali data yang diisi. Ada nilai yang belum valid." },
    "duplicate": { tone: "warning", text: "Catatan dengan identitas yang sama sudah terdaftar." },
    "error": { tone: "danger", text: "Sistem tidak dapat menyimpan perubahan. Periksa koneksi atau hubungi administrator." },
    "field-unavailable": { tone: "warning", text: "Aplikasi bidang Usaha belum aktif untuk organisasi ini." },
    "partner-unavailable": { tone: "warning", text: "Mitra tidak ditemukan atau sudah berakhir." },
    "partner-or-opportunity-unavailable": { tone: "warning", text: "Mitra atau peluang terkait tidak ditemukan." },
    "partner-link-unavailable": { tone: "warning", text: "Pilih mitra dan satu peluang atau perjanjian yang masih aktif." },
  };
  return messages[result] ?? { tone: "info", text: "Perubahan telah diproses." };
}

export async function FieldBusinessSection({
  field,
  result,
}: {
  field: FieldDef;
  result?: string;
}) {
  const identity = await requireIdentity("field:usaha:read");
  const canWrite = can(identity, "field:usaha:business:write");
  const canApprove = can(identity, "organization:team:approve");
  const sql = getV9Sql();

  const [summaryResult, partnerResult, opportunityResult, agreementResult, milestoneResult] = await Promise.all([
    sql`
      SELECT
        (SELECT count(*)::int FROM v9.business_partners p
          WHERE p.organization_id = ${identity.organizationId} AND p.field_key = 'usaha' AND p.status <> 'ended') AS partner_count,
        (SELECT count(*)::int FROM v9.business_partners p
          WHERE p.organization_id = ${identity.organizationId} AND p.field_key = 'usaha' AND p.status = 'active') AS active_partner_count,
        (SELECT count(*)::int FROM v9.business_partners p
          WHERE p.organization_id = ${identity.organizationId} AND p.field_key = 'usaha' AND p.status = 'prospect') AS prospect_partner_count,
        (SELECT count(*)::int FROM v9.business_opportunities o
          WHERE o.organization_id = ${identity.organizationId} AND o.field_key = 'usaha'
            AND o.stage NOT IN ('won','lost','on_hold')) AS open_opportunity_count,
        (SELECT count(*)::int FROM v9.business_opportunities o
          WHERE o.organization_id = ${identity.organizationId} AND o.field_key = 'usaha' AND o.stage = 'won') AS won_opportunity_count,
        (SELECT count(*)::int FROM v9.business_agreements a
          WHERE a.organization_id = ${identity.organizationId} AND a.field_key = 'usaha' AND a.status = 'active') AS active_agreement_count,
        (SELECT count(*)::int FROM v9.business_milestones m
          WHERE m.organization_id = ${identity.organizationId} AND m.field_key = 'usaha'
            AND m.due_date < current_date AND m.status IN ('open','in_progress','blocked')) AS overdue_milestone_count,
        (SELECT COALESCE(sum(o.estimated_value),0)::text FROM v9.business_opportunities o
          WHERE o.organization_id = ${identity.organizationId} AND o.field_key = 'usaha'
            AND o.stage IN ('qualified','proposal','negotiation')) AS pipeline_value
    `,
    sql`
      SELECT id::text AS id, reference_no, partner_name, partner_type, status,
        contact_name, contact_role, phone, email, relationship_summary,
        owner_label, next_review_date::text AS next_review_date
      FROM v9.business_partners
      WHERE organization_id = ${identity.organizationId} AND field_key = 'usaha'
      ORDER BY CASE status WHEN 'active' THEN 1 WHEN 'prospect' THEN 2 WHEN 'inactive' THEN 3 ELSE 4 END,
        partner_name
      LIMIT 200
    `,
    sql`
      SELECT opportunity.id::text AS id, opportunity.reference_no,
        opportunity.partner_id::text AS partner_id, partner.partner_name,
        opportunity.title, opportunity.opportunity_type, opportunity.stage,
        opportunity.estimated_value::text AS estimated_value, opportunity.currency_code,
        opportunity.expected_decision_date::text AS expected_decision_date,
        opportunity.next_action, opportunity.next_action_date::text AS next_action_date,
        opportunity.owner_label
      FROM v9.business_opportunities AS opportunity
      LEFT JOIN v9.business_partners AS partner
        ON partner.id = opportunity.partner_id
        AND partner.organization_id = opportunity.organization_id
        AND partner.field_key = opportunity.field_key
      WHERE opportunity.organization_id = ${identity.organizationId}
        AND opportunity.field_key = 'usaha'
      ORDER BY CASE opportunity.stage WHEN 'negotiation' THEN 1 WHEN 'proposal' THEN 2
          WHEN 'qualified' THEN 3 WHEN 'lead' THEN 4 ELSE 5 END,
        opportunity.created_at DESC
      LIMIT 200
    `,
    sql`
      SELECT agreement.id::text AS id, agreement.reference_no,
        agreement.partner_id::text AS partner_id, partner.partner_name,
        agreement.opportunity_id::text AS opportunity_id, opportunity.title AS opportunity_title,
        agreement.agreement_type, agreement.title, agreement.status,
        agreement.start_date::text AS start_date, agreement.end_date::text AS end_date,
        agreement.signatory_label, agreement.responsible_label
      FROM v9.business_agreements AS agreement
      INNER JOIN v9.business_partners AS partner
        ON partner.id = agreement.partner_id
        AND partner.organization_id = agreement.organization_id
        AND partner.field_key = agreement.field_key
      LEFT JOIN v9.business_opportunities AS opportunity
        ON opportunity.id = agreement.opportunity_id
        AND opportunity.organization_id = agreement.organization_id
        AND opportunity.field_key = agreement.field_key
      WHERE agreement.organization_id = ${identity.organizationId}
        AND agreement.field_key = 'usaha'
      ORDER BY agreement.created_at DESC
      LIMIT 200
    `,
    sql`
      SELECT milestone.id::text AS id, milestone.reference_no,
        milestone.partner_id::text AS partner_id, partner.partner_name,
        milestone.opportunity_id::text AS opportunity_id, opportunity.title AS opportunity_title,
        milestone.agreement_id::text AS agreement_id, agreement.title AS agreement_title,
        milestone.title, milestone.due_date::text AS due_date, milestone.status,
        milestone.completion_note
      FROM v9.business_milestones AS milestone
      INNER JOIN v9.business_partners AS partner
        ON partner.id = milestone.partner_id
        AND partner.organization_id = milestone.organization_id
        AND partner.field_key = milestone.field_key
      LEFT JOIN v9.business_opportunities AS opportunity
        ON opportunity.id = milestone.opportunity_id
        AND opportunity.organization_id = milestone.organization_id
        AND opportunity.field_key = milestone.field_key
      LEFT JOIN v9.business_agreements AS agreement
        ON agreement.id = milestone.agreement_id
        AND agreement.organization_id = milestone.organization_id
        AND agreement.field_key = milestone.field_key
      WHERE milestone.organization_id = ${identity.organizationId}
        AND milestone.field_key = 'usaha'
      ORDER BY CASE milestone.status WHEN 'blocked' THEN 1 WHEN 'in_progress' THEN 2
          WHEN 'open' THEN 3 ELSE 4 END,
        milestone.due_date NULLS LAST
      LIMIT 300
    `,
  ]);

  const summary = rowsFromResult<BusinessSummary>(summaryResult)[0] ?? {
    partner_count: 0, active_partner_count: 0, prospect_partner_count: 0,
    open_opportunity_count: 0, won_opportunity_count: 0, active_agreement_count: 0,
    overdue_milestone_count: 0, pipeline_value: "0",
  };
  const partners = rowsFromResult<PartnerRow>(partnerResult);
  const opportunities = rowsFromResult<OpportunityRow>(opportunityResult);
  const agreements = rowsFromResult<AgreementRow>(agreementResult);
  const milestones = rowsFromResult<MilestoneRow>(milestoneResult);
  const notice = resultNotice(result);
  const selectablePartners = partners.filter((partner) => partner.status !== "ended");
  const activeOpportunities = opportunities.filter((opportunity) => !["won","lost"].includes(opportunity.stage));
  const activeAgreements = agreements.filter((agreement) => !["expired","terminated"].includes(agreement.status));

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow={field.name}
        title="Usaha & kemitraan"
        description="Kelola mitra, peluang pasar, proposal, perjanjian, dan tindak lanjut kerja sama dengan jejak audit."
      />

      {notice ? (
        <div className="mb-4">
          <Notice tone={notice.tone} title="Pembaruan usaha & kemitraan">{notice.text}</Notice>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Mitra tercatat" value={summary.partner_count} note={`${summary.active_partner_count} aktif · ${summary.prospect_partner_count} penjajakan`} tone="info" />
        <StatCard label="Peluang terbuka" value={summary.open_opportunity_count} note={`${summary.won_opportunity_count} berhasil`} tone="success" />
        <StatCard label="Perjanjian aktif" value={summary.active_agreement_count} note="Status perjanjian yang telah disahkan" tone="neutral" />
        <StatCard label="Milestone terlambat" value={summary.overdue_milestone_count} note="Perlu tindak lanjut" tone={summary.overdue_milestone_count > 0 ? "warning" : "success"} />
      </div>

      <div className="mt-5 grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.6fr)]">
        <Card>
          <CardHeader title="Daftar mitra" subtitle={`${partners.length} mitra · register organisasi`} action={<Badge tone="neutral">CRM</Badge>} />
          {partners.length ? (
            <div className="divide-y divide-line">
              {partners.map((partner) => (
                <article key={partner.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[9.5px] text-muted2">{partner.reference_no}</span>
                      <Badge tone={partner.status === "active" ? "success" : partner.status === "prospect" ? "warning" : "neutral"}>{partnerStatusLabel[partner.status]}</Badge>
                    </div>
                    <h3 className="mt-1 text-[12.5px] font-semibold text-ink">{partner.partner_name}</h3>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10.5px] text-muted">
                      <span>{partnerTypeLabel[partner.partner_type] ?? partner.partner_type}</span>
                      {partner.contact_name ? <span>{partner.contact_name}{partner.contact_role ? ` · ${partner.contact_role}` : ""}</span> : null}
                      {partner.phone ? <span>{partner.phone}</span> : null}
                      {partner.email ? <span>{partner.email}</span> : null}
                    </div>
                    {partner.relationship_summary ? <p className="mt-2 text-[10.5px] leading-relaxed text-muted">{partner.relationship_summary}</p> : null}
                    {partner.next_review_date ? <p className="mt-1 text-[10px] text-muted2">Tinjau kembali: {dateLabel(partner.next_review_date)}</p> : null}
                  </div>
                  {canWrite && partner.status !== "ended" ? (
                    <form action={updateBusinessPartnerStatus} className="flex items-center gap-1.5">
                      <input type="hidden" name="partner_id" value={partner.id} />
                      <select name="status" defaultValue={partner.status} className="sb-input !h-8 w-[130px] text-[10px]" aria-label={`Status ${partner.partner_name}`}>
                        <option value="prospect">Penjajakan</option>
                        <option value="active">Aktif</option>
                        <option value="inactive">Tidak aktif</option>
                        <option value="ended" disabled={!canApprove}>Akhiri hubungan · persetujuan pengurus</option>
                      </select>
                      <button type="submit" className="sb-btn sb-btn-outline !h-8 !px-2 text-[9.5px]">Simpan</button>
                    </form>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <div className="px-5 py-9"><EmptyState title="Belum ada mitra" body="Catat lembaga, kelompok, pembeli, penyedia sarana, atau mitra program yang benar-benar telah dihubungi." /></div>
          )}
        </Card>

        {canWrite ? (
          <Card>
            <CardHeader title="Catat mitra baru" subtitle="Identitas dan kontak pihak kerja sama" />
            <form action={createBusinessPartner} className="grid gap-3 p-4">
              <div>
                <label htmlFor="partner-name" className="mb-1 block text-[11px] font-semibold text-ink2">Nama lembaga / mitra</label>
                <input id="partner-name" name="partner_name" required minLength={2} maxLength={240} className="sb-input" />
              </div>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                <div>
                  <label htmlFor="partner-type" className="mb-1 block text-[11px] font-semibold text-ink2">Jenis mitra</label>
                  <select id="partner-type" name="partner_type" required className="sb-input">
                    <option value="pemerintah">Pemerintah</option><option value="ngo">NGO / yayasan</option><option value="swasta">Swasta</option><option value="koperasi">Koperasi</option><option value="akademik">Akademik</option><option value="komunitas">Komunitas</option><option value="perorangan">Perorangan</option><option value="lainnya">Lainnya</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="partner-contact" className="mb-1 block text-[11px] font-semibold text-ink2">Nama kontak</label>
                  <input id="partner-contact" name="contact_name" maxLength={160} className="sb-input" />
                </div>
              </div>
              <div>
                <label htmlFor="partner-role" className="mb-1 block text-[11px] font-semibold text-ink2">Jabatan / posisi</label>
                <input id="partner-role" name="contact_role" maxLength={160} className="sb-input" />
              </div>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                <div><label htmlFor="partner-phone" className="mb-1 block text-[11px] font-semibold text-ink2">Telepon</label><input id="partner-phone" name="phone" maxLength={60} className="sb-input" /></div>
                <div><label htmlFor="partner-email" className="mb-1 block text-[11px] font-semibold text-ink2">Email</label><input id="partner-email" name="email" type="email" maxLength={254} className="sb-input" /></div>
              </div>
              <div><label htmlFor="partner-summary" className="mb-1 block text-[11px] font-semibold text-ink2">Bentuk hubungan / catatan</label><textarea id="partner-summary" name="relationship_summary" rows={3} maxLength={5000} className="sb-input !h-auto resize-y py-2" /></div>
              <div><label htmlFor="partner-owner" className="mb-1 block text-[11px] font-semibold text-ink2">Penanggung jawab internal</label><input id="partner-owner" name="owner_label" maxLength={160} className="sb-input" /></div>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                <div><label htmlFor="partner-since" className="mb-1 block text-[11px] font-semibold text-ink2">Tanggal mulai (opsional)</label><input id="partner-since" name="since_date" type="date" className="sb-input" /></div>
                <div><label htmlFor="partner-review" className="mb-1 block text-[11px] font-semibold text-ink2">Tinjau berikutnya</label><input id="partner-review" name="next_review_date" type="date" className="sb-input" /></div>
              </div>
              <div className="flex justify-end"><button type="submit" className="sb-btn sb-btn-primary"><Plus size={14} /> Simpan mitra</button></div>
            </form>
          </Card>
        ) : null}
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Peluang usaha & kemitraan" subtitle={`${opportunities.length} peluang · estimasi pipeline ${moneyLabel(summary.pipeline_value)}`} action={<Target size={16} className="text-muted" />} />
          {opportunities.length ? (
            <div className="divide-y divide-line">
              {opportunities.map((opportunity) => (
                <article key={opportunity.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-[9px] text-muted2">{opportunity.reference_no}</div>
                      <h3 className="mt-1 text-[12.5px] font-semibold text-ink">{opportunity.title}</h3>
                      <div className="mt-1 text-[10.5px] text-muted">
                        {opportunity.partner_name ?? "Belum ditautkan"}
                        {opportunityTypeLabel[opportunity.opportunity_type] ? ` · ${opportunityTypeLabel[opportunity.opportunity_type]}` : ""}
                      </div>
                    </div>
                    <Badge tone={stageTone[opportunity.stage]}>{stageLabel[opportunity.stage]}</Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10.5px] text-muted2">
                    <span>Nilai: {moneyLabel(opportunity.estimated_value, opportunity.currency_code)}</span>
                    {opportunity.expected_decision_date ? <span>Keputusan: {dateLabel(opportunity.expected_decision_date)}</span> : null}
                    {opportunity.next_action_date ? <span>Tindak lanjut: {dateLabel(opportunity.next_action_date)}</span> : null}
                  </div>
                  {opportunity.next_action ? <p className="mt-1 text-[10.5px] text-muted">Berikutnya: {opportunity.next_action}</p> : null}
                  {canWrite && !["won","lost"].includes(opportunity.stage) ? (
                    <form action={updateBusinessOpportunityStage} className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-2.5">
                      <input type="hidden" name="opportunity_id" value={opportunity.id} />
                      <select name="stage" defaultValue={opportunity.stage} className="sb-input !h-8 min-w-0 flex-1 text-[10px]" aria-label={`Tahap ${opportunity.title}`}>
                        {opportunity.stage === "lead" ? <><option value="qualified">Terkualifikasi</option><option value="on_hold">Tunda</option><option value="lost" disabled={!canApprove}>Tidak berhasil · persetujuan pengurus</option></> : null}
                        {opportunity.stage === "qualified" ? <><option value="proposal">Ajukan proposal</option><option value="on_hold">Tunda</option><option value="lost">Tidak berhasil</option></> : null}
                        {opportunity.stage === "proposal" ? <><option value="negotiation">Negosiasi</option><option value="won" disabled={!canApprove}>Berhasil · persetujuan pengurus</option><option value="lost">Tidak berhasil</option><option value="on_hold">Tunda</option></> : null}
                        {opportunity.stage === "negotiation" ? <><option value="won" disabled={!canApprove}>Berhasil · persetujuan pengurus</option><option value="lost">Tidak berhasil</option><option value="on_hold">Tunda</option></> : null}
                        {opportunity.stage === "on_hold" ? <><option value="lead">Buka kembali</option><option value="qualified">Terkualifikasi</option><option value="proposal">Proposal</option><option value="negotiation">Negosiasi</option><option value="won" disabled={!canApprove}>Berhasil · persetujuan pengurus</option><option value="lost">Tidak berhasil</option></> : null}
                      </select>
                      <input name="outcome_note" maxLength={3000} className="sb-input !h-8 min-w-0 flex-1 text-[10px]" placeholder="Alasan wajib bila tidak berhasil · catatan tindak lanjut" />
                      <button type="submit" className="sb-btn sb-btn-outline !h-8 !px-2 text-[9.5px]">Ubah tahap</button>
                    </form>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <div className="px-5 py-9"><EmptyState title="Belum ada peluang" body="Catat kesempatan pasar, permintaan pembeli, usulan program, hibah, atau kolaborasi yang sedang dijajaki." /></div>
          )}
        </Card>

        {canWrite ? (
          <Card>
            <CardHeader title="Catat peluang baru" subtitle="Satu catatan per kesempatan kerja sama" />
            <form action={createBusinessOpportunity} className="grid gap-3 p-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><label htmlFor="opp-title" className="mb-1 block text-[11px] font-semibold text-ink2">Nama peluang</label><input id="opp-title" name="title" required minLength={3} maxLength={300} className="sb-input" /></div>
              <div><label htmlFor="opp-type" className="mb-1 block text-[11px] font-semibold text-ink2">Jenis peluang</label><select id="opp-type" name="opportunity_type" className="sb-input"><option value="akses_pasar">Akses pasar</option><option value="pengadaan">Pengadaan</option><option value="hibah">Hibah / dukungan</option><option value="pelatihan">Pelatihan</option><option value="riset">Riset</option><option value="program">Program</option><option value="lainnya">Lainnya</option></select></div>
              <div><label htmlFor="opp-partner" className="mb-1 block text-[11px] font-semibold text-ink2">Mitra terkait</label><select id="opp-partner" name="partner_id" defaultValue="" className="sb-input"><option value="">Belum ditentukan</option>{selectablePartners.map((partner) => <option key={partner.id} value={partner.id}>{partner.partner_name}</option>)}</select></div>
              <div><label htmlFor="opp-value" className="mb-1 block text-[11px] font-semibold text-ink2">Estimasi nilai (Rp)</label><input id="opp-value" name="estimated_value" type="number" min="0" step="1" className="sb-input" /></div>
              <div><label htmlFor="opp-date" className="mb-1 block text-[11px] font-semibold text-ink2">Perkiraan keputusan</label><input id="opp-date" name="expected_decision_date" type="date" className="sb-input" /></div>
              <input type="hidden" name="currency_code" value="IDR" />
              <div className="sm:col-span-2"><label htmlFor="opp-next" className="mb-1 block text-[11px] font-semibold text-ink2">Tindak lanjut berikutnya</label><input id="opp-next" name="next_action" maxLength={1000} className="sb-input" placeholder="Mis. kirim profil kelompok dan katalog" /></div>
              <div><label htmlFor="opp-next-date" className="mb-1 block text-[11px] font-semibold text-ink2">Tanggal tindak lanjut</label><input id="opp-next-date" name="next_action_date" type="date" className="sb-input" /></div>
              <div><label htmlFor="opp-owner" className="mb-1 block text-[11px] font-semibold text-ink2">Penanggung jawab</label><input id="opp-owner" name="owner_label" maxLength={160} className="sb-input" /></div>
              <div className="sm:col-span-2"><label htmlFor="opp-description" className="mb-1 block text-[11px] font-semibold text-ink2">Keterangan peluang</label><textarea id="opp-description" name="description" rows={2} maxLength={5000} className="sb-input !h-auto resize-y py-2" /></div>
              <div className="flex justify-end sm:col-span-2"><button type="submit" className="sb-btn sb-btn-primary"><Plus size={14} /> Simpan peluang</button></div>
            </form>
          </Card>
        ) : null}
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Perjanjian & dokumen kerja sama" subtitle={`${agreements.length} catatan · status aktif memerlukan persetujuan`} action={<Handshake size={16} className="text-muted" />} />
          {agreements.length ? (
            <div className="divide-y divide-line">
              {agreements.map((agreement) => (
                <article key={agreement.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-[9.5px] text-muted2">{agreement.reference_no}</span>
                    <Badge tone={agreement.status === "active" ? "success" : agreement.status === "review" ? "warning" : "neutral"}>{agreementStatusLabel[agreement.status]}</Badge>
                  </div>
                  <h3 className="mt-1 text-[12.5px] font-semibold text-ink">{agreement.title}</h3>
                  <div className="mt-1 text-[10.5px] text-muted">{agreement.partner_name}{agreement.opportunity_title ? ` · ${agreement.opportunity_title}` : ""}</div>
                  <div className="mt-1 text-[10px] text-muted2">{agreement.agreement_type.toUpperCase()} · {dateLabel(agreement.start_date)} sampai {dateLabel(agreement.end_date)}</div>
                  {(canWrite || canApprove) && !["expired","terminated"].includes(agreement.status) ? (
                    <form action={updateBusinessAgreementStatus} className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-2.5">
                      <input type="hidden" name="agreement_id" value={agreement.id} />
                      <select name="status" defaultValue={agreement.status} className="sb-input !h-8 min-w-0 flex-1 text-[10px]" aria-label={`Status perjanjian ${agreement.title}`}>
                        {agreement.status === "draft" ? <option value="review">Ajukan untuk ditinjau</option> : null}
                        {agreement.status === "review" ? <><option value="signed" disabled={!canApprove}>Tandai ditandatangani</option><option value="terminated">Hentikan</option></> : null}
                        {agreement.status === "signed" ? <><option value="active" disabled={!canApprove}>Aktifkan</option><option value="terminated">Hentikan</option></> : null}
                        {agreement.status === "active" ? <><option value="expired" disabled={!canApprove}>Tandai berakhir</option><option value="terminated">Hentikan</option></> : null}
                      </select>
                      <input name="notes" maxLength={5000} className="sb-input !h-8 min-w-0 flex-1 text-[10px]" placeholder="Catatan perubahan" />
                      <button type="submit" className="sb-btn sb-btn-outline !h-8 !px-2 text-[9.5px]">Simpan</button>
                    </form>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <div className="px-5 py-8"><EmptyState title="Belum ada perjanjian" body="Catat draf nota kesepahaman, PKS, kontrak, atau surat minat setelah data mitra tersedia." /></div>
          )}
        </Card>

        {canWrite ? (
          <Card>
            <CardHeader title="Buat draf perjanjian" subtitle="Pencatatan draf tidak berarti perjanjian sudah disahkan." />
            <form action={createBusinessAgreement} className="grid gap-3 p-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><label htmlFor="agreement-title" className="mb-1 block text-[11px] font-semibold text-ink2">Judul perjanjian</label><input id="agreement-title" name="title" required minLength={3} maxLength={300} className="sb-input" /></div>
              <div><label htmlFor="agreement-partner" className="mb-1 block text-[11px] font-semibold text-ink2">Mitra</label><select id="agreement-partner" name="partner_id" required className="sb-input" defaultValue=""><option value="" disabled>Pilih mitra</option>{selectablePartners.map((partner) => <option key={partner.id} value={partner.id}>{partner.partner_name}</option>)}</select></div>
              <div><label htmlFor="agreement-opportunity" className="mb-1 block text-[11px] font-semibold text-ink2">Peluang terkait (opsional)</label><select id="agreement-opportunity" name="opportunity_id" defaultValue="" className="sb-input"><option value="">Tidak ditautkan</option>{activeOpportunities.filter((opportunity) => opportunity.partner_id).map((opportunity) => <option key={opportunity.id} value={opportunity.id}>{opportunity.title}</option>)}</select></div>
              <div><label htmlFor="agreement-type" className="mb-1 block text-[11px] font-semibold text-ink2">Jenis dokumen</label><select id="agreement-type" name="agreement_type" className="sb-input"><option value="mou">MoU</option><option value="pks">PKS</option><option value="kontrak">Kontrak</option><option value="loi">Letter of Intent</option><option value="nota_kesepahaman">Nota kesepahaman</option><option value="lainnya">Lainnya</option></select></div>
              <div><label htmlFor="agreement-ref" className="mb-1 block text-[11px] font-semibold text-ink2">Nomor dari pihak mitra (opsional)</label><input id="agreement-ref" name="external_reference" maxLength={120} className="sb-input" /></div>
              <div><label htmlFor="agreement-start" className="mb-1 block text-[11px] font-semibold text-ink2">Tanggal mulai</label><input id="agreement-start" name="start_date" type="date" className="sb-input" /></div>
              <div><label htmlFor="agreement-end" className="mb-1 block text-[11px] font-semibold text-ink2">Tanggal berakhir</label><input id="agreement-end" name="end_date" type="date" className="sb-input" /></div>
              <div><label htmlFor="agreement-signatory" className="mb-1 block text-[11px] font-semibold text-ink2">Penandatangan</label><input id="agreement-signatory" name="signatory_label" maxLength={160} className="sb-input" /></div>
              <div><label htmlFor="agreement-owner" className="mb-1 block text-[11px] font-semibold text-ink2">Penanggung jawab</label><input id="agreement-owner" name="responsible_label" maxLength={160} className="sb-input" /></div>
              <div className="sm:col-span-2"><label htmlFor="agreement-notes" className="mb-1 block text-[11px] font-semibold text-ink2">Catatan</label><textarea id="agreement-notes" name="notes" rows={2} maxLength={5000} className="sb-input !h-auto resize-y py-2" /></div>
              <div className="flex justify-end sm:col-span-2"><button type="submit" className="sb-btn sb-btn-primary"><Plus size={14} /> Simpan draf</button></div>
            </form>
          </Card>
        ) : null}
      </div>

      <Card className="mt-5">
        <CardHeader title="Milestone & tindak lanjut" subtitle={`${milestones.length} catatan · urut berdasarkan status dan tenggat`} action={<Milestone size={16} className="text-muted" />} />
        {milestones.length ? (
          <div className="divide-y divide-line">
            {milestones.map((milestone) => (
              <article key={milestone.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-[9px] text-muted2">{milestone.reference_no}</div>
                  <h3 className="mt-1 text-[12.5px] font-semibold text-ink">{milestone.title}</h3>
                  <div className="mt-1 text-[10.5px] text-muted">{milestone.partner_name} · {milestone.opportunity_title ?? milestone.agreement_title ?? "Kerja sama"}</div>
                  <div className="mt-1 text-[10px] text-muted2">Tenggat: {dateLabel(milestone.due_date)}</div>
                  {milestone.completion_note ? <p className="mt-1 text-[10.5px] text-muted">{milestone.completion_note}</p> : null}
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={milestone.status === "completed" ? "success" : milestone.status === "blocked" ? "danger" : milestone.status === "in_progress" ? "info" : "neutral"}>{milestoneStatusLabel[milestone.status]}</Badge>
                  {canWrite && !["completed","cancelled"].includes(milestone.status) ? (
                    <form action={updateBusinessMilestoneStatus} className="flex flex-wrap items-center gap-1.5">
                      <input type="hidden" name="milestone_id" value={milestone.id} />
                      <select name="status" defaultValue={milestone.status} className="sb-input !h-8 w-[130px] text-[10px]" aria-label={`Status milestone ${milestone.title}`}>
                        <option value="open">Terbuka</option><option value="in_progress">Berjalan</option><option value="blocked">Terhambat</option><option value="completed">Selesai</option><option value="cancelled">Dibatalkan</option>
                      </select>
                      <input name="completion_note" minLength={3} maxLength={3000} className="sb-input !h-8 w-[180px] text-[10px]" placeholder="Catatan penyelesaian" />
                      <button type="submit" className="sb-btn sb-btn-outline !h-8 !px-2 text-[9.5px]">Simpan</button>
                    </form>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="px-5 py-8"><EmptyState title="Belum ada milestone" body="Buat tindak lanjut dari peluang atau perjanjian untuk memantau kemajuan kerja sama." /></div>
        )}
        {canWrite ? (
          <form action={createBusinessMilestone} className="grid gap-3 border-t border-line p-4 sm:grid-cols-2 xl:grid-cols-4">
            <div><label htmlFor="milestone-partner" className="mb-1 block text-[11px] font-semibold text-ink2">Mitra</label><select id="milestone-partner" name="partner_id" required className="sb-input" defaultValue=""><option value="" disabled>Pilih mitra</option>{selectablePartners.map((partner) => <option key={partner.id} value={partner.id}>{partner.partner_name}</option>)}</select></div>
            <div><label htmlFor="milestone-opportunity" className="mb-1 block text-[11px] font-semibold text-ink2">Peluang</label><select id="milestone-opportunity" name="opportunity_id" className="sb-input" defaultValue=""><option value="">Pilih peluang</option>{activeOpportunities.filter((opportunity) => opportunity.partner_id).map((opportunity) => <option key={opportunity.id} value={opportunity.id}>{opportunity.title}</option>)}</select></div>
            <div><label htmlFor="milestone-agreement" className="mb-1 block text-[11px] font-semibold text-ink2">Atau perjanjian</label><select id="milestone-agreement" name="agreement_id" className="sb-input" defaultValue=""><option value="">Pilih perjanjian</option>{activeAgreements.map((agreement) => <option key={agreement.id} value={agreement.id}>{agreement.title}</option>)}</select></div>
            <div><label htmlFor="milestone-title" className="mb-1 block text-[11px] font-semibold text-ink2">Tindak lanjut</label><input id="milestone-title" name="title" required minLength={3} maxLength={300} className="sb-input" placeholder="Mis. kirim sampel produk" /></div>
            <div><label htmlFor="milestone-date" className="mb-1 block text-[11px] font-semibold text-ink2">Tenggat</label><input id="milestone-date" name="due_date" type="date" className="sb-input" /></div>
            <div className="flex items-end sm:col-span-2 xl:col-span-3"><button type="submit" className="sb-btn sb-btn-primary"><Plus size={14} /> Tambah milestone</button></div>
          </form>
        ) : null}
      </Card>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Notice tone="info" title="Persetujuan organisasi">
          Draf perjanjian disiapkan oleh bidang. Status ditandatangani, aktif, atau berakhir
          memerlukan kewenangan persetujuan pengurus; pencatatan draf tidak mengesahkan komitmen organisasi.
        </Notice>
        <Notice tone="info" title="Batas data CRM">
          Estimasi peluang dan milestone bukan pendapatan, transaksi penjualan, persediaan, atau
          penerimaan hibah. Semua tetap harus dicatat pada modul keuangan dan stok yang berwenang.
        </Notice>
      </div>
    </div>
  );
}
