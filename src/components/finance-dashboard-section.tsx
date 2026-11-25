import Link from "next/link";
import { ArrowRight, BookOpenCheck, ClipboardList, Landmark, Scale } from "lucide-react";
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
import { requireIdentity } from "@/lib/session";

interface FinanceOverview {
  account_count: number;
  active_account_count: number;
  draft_journal_count: number;
  submitted_journal_count: number;
  approved_journal_count: number;
  posted_journal_count: number;
  posted_debit_total: string;
  posted_credit_total: string;
}

interface RecentJournal {
  id: string;
  reference_no: string;
  journal_date: string;
  description: string;
  status: "draft" | "submitted" | "approved" | "posted" | "rejected";
  total_debit: string;
  total_credit: string;
}

const statusLabel: Record<RecentJournal["status"], string> = {
  draft: "Draf",
  submitted: "Menunggu pemeriksaan",
  approved: "Siap posting",
  posted: "Terposting",
  rejected: "Perlu perbaikan",
};

const statusTone: Record<RecentJournal["status"], "neutral" | "warning" | "info" | "success" | "danger"> = {
  draft: "neutral",
  submitted: "warning",
  approved: "info",
  posted: "success",
  rejected: "danger",
};

function rupiah(value: string): string {
  const amount = Number(value);
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function dateLabel(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}

export async function FinanceDashboardSection() {
  const identity = await requireIdentity("finance:read");
  const sql = getV9Sql();

  const [overviewResult, recentResult] = await Promise.all([
    sql`
      SELECT
        (SELECT count(*)::int FROM v9.finance_accounts account
          WHERE account.organization_id = ${identity.organizationId}) AS account_count,
        (SELECT count(*)::int FROM v9.finance_accounts account
          WHERE account.organization_id = ${identity.organizationId}
            AND account.status = 'active') AS active_account_count,
        count(*) FILTER (WHERE status = 'draft')::int AS draft_journal_count,
        count(*) FILTER (WHERE status = 'submitted')::int AS submitted_journal_count,
        count(*) FILTER (WHERE status = 'approved')::int AS approved_journal_count,
        count(*) FILTER (WHERE status = 'posted')::int AS posted_journal_count,
        COALESCE(sum(total_debit) FILTER (WHERE status = 'posted'),0)::text AS posted_debit_total,
        COALESCE(sum(total_credit) FILTER (WHERE status = 'posted'),0)::text AS posted_credit_total
      FROM v9.finance_journals
      WHERE organization_id = ${identity.organizationId}
    `,
    sql`
      SELECT id::text AS id, reference_no, journal_date::text AS journal_date,
        description, status, total_debit::text AS total_debit, total_credit::text AS total_credit
      FROM v9.finance_journals
      WHERE organization_id = ${identity.organizationId}
      ORDER BY journal_date DESC, created_at DESC
      LIMIT 8
    `,
  ]);

  const overview = rowsFromResult<FinanceOverview>(overviewResult)[0] ?? {
    account_count: 0, active_account_count: 0, draft_journal_count: 0,
    submitted_journal_count: 0, approved_journal_count: 0, posted_journal_count: 0,
    posted_debit_total: "0", posted_credit_total: "0",
  };
  const recent = rowsFromResult<RecentJournal>(recentResult);

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Keuangan Native"
        title="Ringkasan keuangan"
        description="Pusat pencatatan akuntansi organisasi. Saldo buku besar hanya berasal dari jurnal yang telah disetujui dan diposting."
        actions={<Link href="/app/keuangan/jurnal" className="sb-btn sb-btn-primary">Buat jurnal</Link>}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Akun aktif" value={overview.active_account_count} note={`${overview.account_count} akun terdaftar`} tone="info" />
        <StatCard label="Jurnal terposting" value={overview.posted_journal_count} note="Menjadi sumber buku besar" tone="success" />
        <StatCard label="Menunggu pemeriksaan" value={overview.submitted_journal_count} note="Menunggu persetujuan pengurus" tone="warning" />
        <StatCard label="Draf jurnal" value={overview.draft_journal_count} note="Belum memengaruhi saldo" tone="neutral" />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(300px,0.7fr)]">
        <Card>
          <CardHeader title="Aktivitas jurnal terbaru" subtitle={`${recent.length} jurnal terbaru`} action={<BookOpenCheck size={16} className="text-muted" />} />
          {recent.length ? (
            <div className="divide-y divide-line">
              {recent.map((journal) => (
                <article key={journal.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[9.5px] text-muted2">{journal.reference_no}</span>
                      <Badge tone={statusTone[journal.status]}>{statusLabel[journal.status]}</Badge>
                    </div>
                    <h3 className="mt-1 text-[12px] font-semibold text-ink">{journal.description}</h3>
                    <p className="mt-1 text-[10px] text-muted">{dateLabel(journal.journal_date)}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-[11.5px] font-semibold tabular-nums text-ink">{rupiah(journal.total_debit)}</div>
                    <div className="text-[9.5px] text-muted2">Total debit · kredit sama bila seimbang</div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="px-5 py-10">
              <EmptyState title="Belum ada jurnal terposting" body="Buat jurnal draf, ajukan untuk pemeriksaan, lalu posting setelah disetujui." />
            </div>
          )}
          <div className="flex flex-wrap gap-2 border-t border-line p-3">
            <Link href="/app/keuangan/jurnal" className="sb-btn sb-btn-outline !h-8 !px-3 text-[10px]">Buka jurnal <ArrowRight size={12} /></Link>
            <Link href="/app/keuangan/buku-besar" className="sb-btn sb-btn-ghost !h-8 !px-3 text-[10px]">Buku besar <ArrowRight size={12} /></Link>
          </div>
        </Card>

        <div className="grid gap-3">
          <Card>
            <CardHeader title="Kontrol debit-kredit" action={<Scale size={16} className="text-muted" />} />
            <div className="space-y-3 p-4">
              <div className="flex items-center justify-between gap-2 text-[11px]"><span className="text-muted">Akumulasi debit terposting</span><strong className="tabular-nums text-ink">{rupiah(overview.posted_debit_total)}</strong></div>
              <div className="flex items-center justify-between gap-2 text-[11px]"><span className="text-muted">Akumulasi kredit terposting</span><strong className="tabular-nums text-ink">{rupiah(overview.posted_credit_total)}</strong></div>
              <div className="rounded-lg bg-paper px-3 py-2 text-[10.5px] leading-relaxed text-muted">
                Angka tersebut adalah total pergerakan debit/kredit jurnal terposting, bukan saldo kas atau uang tersedia.
              </div>
            </div>
          </Card>
          <Card>
            <CardHeader title="Akses cepat" action={<Landmark size={16} className="text-muted" />} />
            <div className="divide-y divide-line">
              <Link href="/app/keuangan/bagan-akun" className="flex items-center justify-between gap-2 px-4 py-3 text-[11.5px] font-semibold text-ink2 hover:bg-paper">
                Bagan akun <ArrowRight size={13} />
              </Link>
              <Link href="/app/keuangan/jurnal" className="flex items-center justify-between gap-2 px-4 py-3 text-[11.5px] font-semibold text-ink2 hover:bg-paper">
                Jurnal & posting <ArrowRight size={13} />
              </Link>
              <Link href="/app/keuangan/anggaran" className="flex items-center justify-between gap-2 px-4 py-3 text-[11.5px] font-semibold text-ink2 hover:bg-paper">
                Anggaran & dana <ArrowRight size={13} />
              </Link>
              <Link href="/app/keuangan/kas-bank" className="flex items-center justify-between gap-2 px-4 py-3 text-[11.5px] font-semibold text-ink2 hover:bg-paper">
                Kas & bank <ArrowRight size={13} />
              </Link>
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Notice tone="warning" title="Rancangan COA belum menjadi kebijakan resmi">
          Bagan akun awal berstatus draf. Ketua dan Bendahara perlu meninjau klasifikasi akun,
          termasuk rekening bank, dana terbatas, iuran, dan perlakuan pajak sebelum aktivasi.
        </Notice>
        <Notice tone="info" title="Batas tahap implementasi">
          Bagan akun, jurnal berpasangan, serta register Kas/Bank sudah tersedia. Rekonsiliasi rekening koran,
          anggaran, sub-ledger iuran per anggota, utang/piutang terperinci, dan posting otomatis dari POS atau transaksi usaha
          masih memerlukan alur serta kontrol data tersendiri.
        </Notice>
      </div>
    </div>
  );
}
