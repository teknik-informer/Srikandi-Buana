import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, ClipboardCheck, FileCheck2, ShoppingBag } from "lucide-react";
import {
  Badge, Card, CardHeader, EmptyState, Notice, PageHeader, StatCard,
} from "@/components/ui";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { can, requireRoles } from "@/lib/session";

export const metadata: Metadata = { title: "Workflow Builder" };

interface FinanceQueue {
  draft_count: number;
  submitted_count: number;
  approved_count: number;
  posted_count: number;
  rejected_count: number;
}
interface MembershipQueue {
  submitted_count: number;
  under_review_count: number;
  approved_count: number;
  rejected_count: number;
  withdrawn_count: number;
}
interface WorkplanQueue {
  draft_count: number;
  submitted_count: number;
  approved_count: number;
  active_count: number;
  completed_count: number;
  cancelled_count: number;
}
interface OrderQueue {
  draft_count: number;
  confirmed_count: number;
  processing_count: number;
  ready_count: number;
  fulfilled_count: number;
  cancelled_count: number;
}

function safeErrorType(reason: unknown): string {
  return reason instanceof Error && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(reason.name)
    ? reason.name
    : "UnknownError";
}

function countLabel(value: number | undefined): string {
  return Number(value ?? 0).toLocaleString("id-ID");
}

export default async function WorkflowStudio() {
  const identity = await requireRoles(["platform_admin", "organization_admin"]);;
  const canReadFinance = can(identity, "finance:read");
  const canReadMembership = can(identity, "field:organisasi:review");
  const canReadWorkplans = can(identity, "approval:read") || can(identity, "organization:team:approve");
  const canReadOrders = can(identity, "field:usaha:read");

  let finance: FinanceQueue | null = null;
  let membership: MembershipQueue | null = null;
  let workplans: WorkplanQueue | null = null;
  let orders: OrderQueue | null = null;
  let unavailable = false;

  try {
    const sql = getV9Sql();
    const [financeResult, membershipResult, workplanResult, orderResult] = await Promise.all([
      canReadFinance ? sql`
        SELECT
          count(*) FILTER (WHERE status = 'draft')::int AS draft_count,
          count(*) FILTER (WHERE status = 'submitted')::int AS submitted_count,
          count(*) FILTER (WHERE status = 'approved')::int AS approved_count,
          count(*) FILTER (WHERE status = 'posted')::int AS posted_count,
          count(*) FILTER (WHERE status = 'rejected')::int AS rejected_count
        FROM v9.finance_journals
        WHERE organization_id = ${identity.organizationId}
      ` : Promise.resolve(null),
      canReadMembership ? sql`
        SELECT
          count(*) FILTER (WHERE status = 'submitted')::int AS submitted_count,
          count(*) FILTER (WHERE status = 'under_review')::int AS under_review_count,
          count(*) FILTER (WHERE status = 'approved')::int AS approved_count,
          count(*) FILTER (WHERE status = 'rejected')::int AS rejected_count,
          count(*) FILTER (WHERE status = 'withdrawn')::int AS withdrawn_count
        FROM v9.membership_interests
        WHERE organization_id = ${identity.organizationId}
      ` : Promise.resolve(null),
      canReadWorkplans ? sql`
        SELECT
          count(*) FILTER (WHERE status = 'draft')::int AS draft_count,
          count(*) FILTER (WHERE status = 'submitted')::int AS submitted_count,
          count(*) FILTER (WHERE status = 'approved')::int AS approved_count,
          count(*) FILTER (WHERE status = 'active')::int AS active_count,
          count(*) FILTER (WHERE status = 'completed')::int AS completed_count,
          count(*) FILTER (WHERE status = 'cancelled')::int AS cancelled_count
        FROM v9.field_workplans
        WHERE organization_id = ${identity.organizationId}
      ` : Promise.resolve(null),
      canReadOrders ? sql`
        SELECT
          count(*) FILTER (WHERE status = 'draft')::int AS draft_count,
          count(*) FILTER (WHERE status = 'confirmed')::int AS confirmed_count,
          count(*) FILTER (WHERE status = 'processing')::int AS processing_count,
          count(*) FILTER (WHERE status = 'ready')::int AS ready_count,
          count(*) FILTER (WHERE status = 'fulfilled')::int AS fulfilled_count,
          count(*) FILTER (WHERE status = 'cancelled')::int AS cancelled_count
        FROM v9.business_orders
        WHERE organization_id = ${identity.organizationId}
          AND field_key = 'usaha'
      ` : Promise.resolve(null),
    ]);

    finance = financeResult ? (rowsFromResult<FinanceQueue>(financeResult)[0] ?? null) : null;
    membership = membershipResult ? (rowsFromResult<MembershipQueue>(membershipResult)[0] ?? null) : null;
    workplans = workplanResult ? (rowsFromResult<WorkplanQueue>(workplanResult)[0] ?? null) : null;
    orders = orderResult ? (rowsFromResult<OrderQueue>(orderResult)[0] ?? null) : null;
  } catch (reason) {
    unavailable = true;
    console.warn("[workflow-studio] Queue data unavailable", safeErrorType(reason));
  }

  const pendingTotal =
    Number(finance?.submitted_count ?? 0) +
    Number(membership?.submitted_count ?? 0) +
    Number(membership?.under_review_count ?? 0) +
    Number(workplans?.submitted_count ?? 0);

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Workflow Builder"
        title="Alur operasional yang terpasang"
        description="Pemantauan antrean dan status dari modul domain. Transisi status dijalankan oleh server action masing-masing; konfigurasi workflow generik belum tersimpan pada registry."
        actions={<Badge tone="neutral">Baca-saja</Badge>}
      />

      {unavailable ? (
        <div className="mb-4">
          <Notice tone="danger" title="Antrean workflow belum dapat dimuat">
            Data antrean disembunyikan sampai koneksi database pulih. Status tidak diganti dengan contoh.
          </Notice>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Menunggu pemeriksaan" value={pendingTotal} note="Jurnal, pendaftaran, dan rencana kerja" tone="warning" icon={<ClipboardCheck size={17} />} />
        <StatCard label="Jurnal terposting" value={finance ? countLabel(finance.posted_count) : "Tidak diizinkan"} note="Memerlukan finance:read" tone="success" icon={<FileCheck2 size={17} />} />
        <StatCard label="Pesanan terpenuhi" value={orders ? countLabel(orders.fulfilled_count) : "Tidak diizinkan"} note="Memerlukan field:usaha:read" tone="info" icon={<ShoppingBag size={17} />} />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        {finance ? (
          <Card>
            <CardHeader title="Jurnal keuangan" subtitle="Draf → diajukan → disetujui → terposting / ditolak" action={<Badge tone="neutral">Finance</Badge>} />
            <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3">
              {[
                ["Draf", finance.draft_count],
                ["Diajukan", finance.submitted_count],
                ["Disetujui", finance.approved_count],
                ["Terposting", finance.posted_count],
                ["Ditolak", finance.rejected_count],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[10px] border border-line bg-paper p-3">
                  <div className="text-[10px] text-muted">{label}</div>
                  <div className="mt-1 text-[18px] font-semibold tabular-nums text-ink">{countLabel(Number(value))}</div>
                </div>
              ))}
            </div>
            <div className="border-t border-line px-4 py-3">
              <Link href="/app/pengurus/persetujuan" className="text-[11px] font-semibold text-primary-700">Buka antrean persetujuan <ArrowRight size={12} className="inline" /></Link>
            </div>
          </Card>
        ) : null}

        {membership ? (
          <Card>
            <CardHeader title="Minat keanggotaan" subtitle="Dikirim → ditinjau → disetujui / ditolak / ditarik" action={<Badge tone="neutral">Organisasi</Badge>} />
            <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3">
              {[
                ["Menunggu", membership.submitted_count],
                ["Ditinjau", membership.under_review_count],
                ["Disetujui", membership.approved_count],
                ["Ditolak", membership.rejected_count],
                ["Ditarik", membership.withdrawn_count],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[10px] border border-line bg-paper p-3">
                  <div className="text-[10px] text-muted">{label}</div>
                  <div className="mt-1 text-[18px] font-semibold tabular-nums text-ink">{countLabel(Number(value))}</div>
                </div>
              ))}
            </div>
            <div className="border-t border-line px-4 py-3">
              <Link href="/app/bidang/organisasi/pengajuan" className="text-[11px] font-semibold text-primary-700">Tinjau pendaftaran <ArrowRight size={12} className="inline" /></Link>
            </div>
          </Card>
        ) : null}

        {workplans ? (
          <Card>
            <CardHeader title="Rencana kerja bidang" subtitle="Draf → diajukan → disetujui → berjalan / selesai / dibatalkan" action={<Badge tone="neutral">Bidang</Badge>} />
            <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3">
              {[
                ["Draf", workplans.draft_count],
                ["Diajukan", workplans.submitted_count],
                ["Disetujui", workplans.approved_count],
                ["Berjalan", workplans.active_count],
                ["Selesai", workplans.completed_count],
                ["Dibatalkan", workplans.cancelled_count],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[10px] border border-line bg-paper p-3">
                  <div className="text-[10px] text-muted">{label}</div>
                  <div className="mt-1 text-[18px] font-semibold tabular-nums text-ink">{countLabel(Number(value))}</div>
                </div>
              ))}
            </div>
            <div className="border-t border-line px-4 py-3">
              <Link href="/app/pengurus/program" className="text-[11px] font-semibold text-primary-700">Buka program & rencana kerja <ArrowRight size={12} className="inline" /></Link>
            </div>
          </Card>
        ) : null}

        {orders ? (
          <Card>
            <CardHeader title="Pesanan usaha" subtitle="Draf → dikonfirmasi → diproses → siap → terpenuhi / dibatalkan" action={<Badge tone="neutral">Usaha</Badge>} />
            <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3">
              {[
                ["Draf", orders.draft_count],
                ["Dikonfirmasi", orders.confirmed_count],
                ["Diproses", orders.processing_count],
                ["Siap", orders.ready_count],
                ["Terpenuhi", orders.fulfilled_count],
                ["Dibatalkan", orders.cancelled_count],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[10px] border border-line bg-paper p-3">
                  <div className="text-[10px] text-muted">{label}</div>
                  <div className="mt-1 text-[18px] font-semibold tabular-nums text-ink">{countLabel(Number(value))}</div>
                </div>
              ))}
            </div>
            <div className="border-t border-line px-4 py-3">
              <Link href="/app/bidang/usaha/pesanan" className="text-[11px] font-semibold text-primary-700">Buka register pesanan <ArrowRight size={12} className="inline" /></Link>
            </div>
          </Card>
        ) : null}
      </div>

      {!finance && !membership && !workplans && !orders && !unavailable ? (
        <Card className="mt-4 p-5">
          <EmptyState title="Tidak ada antrean yang tersedia untuk akun ini" body="Hak akses saat ini tidak mencakup antrean workflow organisasi." />
        </Card>
      ) : null}

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Notice tone="warning" title="Konfigurasi workflow generik belum tersedia">
          Role approver, urutan tahapan, SLA, delegasi, ambang nilai, dan notifikasi per workflow belum memiliki registry konfigurasi khusus. Status di atas berasal dari aturan pada server action dan skema domain.
        </Notice>
        <Notice tone="info" title="Pemisahan tanggung jawab">
          Halaman ini hanya memantau antrean. Keputusan tetap dilakukan di modul sumber dengan pemeriksaan permission, validasi transisi, dan pencatatan audit.
        </Notice>
      </div>
    </div>
  );
}
