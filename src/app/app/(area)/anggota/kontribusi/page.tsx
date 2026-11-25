import type { Metadata } from "next";
import { Info, ShieldCheck, Wallet } from "lucide-react";
import { PageHeader, Card, CardHeader, EmptyState, Notice, StatCard, Badge } from "@/components/ui";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { requireIdentity } from "@/lib/session";
import { formatDateID, formatIDR } from "@/lib/format";

export const metadata: Metadata = { title: "Kontribusi Saya" };

interface ContributionRow {
  id: string;
  reference_no: string;
  journal_date: string;
  description: string;
  member_number: string | null;
  allocation_amount: string;
  note: string | null;
}

export default async function KontribusiPage() {
  const identity = await requireIdentity("member:self");
  let contributions: ContributionRow[] = [];
  let total = 0;
  let unavailable = false;

  try {
    const sql = getV9Sql();
    const result = await sql`
      SELECT
        allocation.id::text AS id,
        journal.reference_no,
        journal.journal_date::text AS journal_date,
        journal.description,
        membership.member_number,
        allocation.allocation_amount::text AS allocation_amount,
        allocation.note
      FROM v9.user_accounts AS account
      INNER JOIN v9.memberships AS membership
        ON membership.person_id = account.person_id
        AND membership.organization_id = ${identity.organizationId}
      INNER JOIN v9.finance_contribution_allocations AS allocation
        ON allocation.membership_id = membership.id
        AND allocation.organization_id = membership.organization_id
      INNER JOIN v9.finance_journals AS journal
        ON journal.id = allocation.journal_id
        AND journal.organization_id = allocation.organization_id
        AND journal.status = 'posted'
      WHERE account.id = ${identity.userId}
      ORDER BY journal.journal_date DESC, allocation.created_at DESC
      LIMIT 200
    `;
    contributions = rowsFromResult<ContributionRow>(result);
    total = contributions.reduce((sum, item) => sum + Number(item.allocation_amount), 0);
  } catch (reason) {
    unavailable = true;
    const errorType = reason instanceof Error && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(reason.name)
      ? reason.name
      : "UnknownError";
    console.warn("[member-contributions] Source unavailable", errorType);
  }

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Portal Anggota"
        title="Kontribusi saya"
        description="Riwayat kontribusi yang telah dialokasikan ke keanggotaan Anda oleh pengelola Keuangan berdasarkan jurnal organisasi yang sudah terposting."
        actions={<Badge tone={unavailable ? "warning" : "success"}>{unavailable ? "Sumber data tidak tersedia" : "Data terhubung"}</Badge>}
      />

      {unavailable ? (
        <div className="mb-4">
          <Notice tone="warning" title="Riwayat kontribusi belum dapat dimuat">
            Koneksi ke buku besar sedang tidak tersedia. Nilai dan catatan pribadi disembunyikan sampai sumber data pulih.
          </Notice>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard
          label="Total kontribusi tercatat"
          value={unavailable ? "—" : formatIDR(total)}
          note="Hanya alokasi dari jurnal terposting"
          tone="success"
          icon={<Wallet size={17} />}
        />
        <StatCard
          label="Catatan kontribusi"
          value={unavailable ? "—" : contributions.length}
          note="Maksimal 200 entri terbaru"
          tone="info"
          icon={<ShieldCheck size={17} />}
        />
      </div>

      <Card className="mt-5">
        <CardHeader title="Riwayat kontribusi" subtitle="Bukan tagihan atau daftar tunggakan iuran" />
        {contributions.length ? (
          <div className="divide-y divide-line">
            {contributions.map((item) => (
              <article key={item.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10px] text-muted2">{item.reference_no}</span>
                    <Badge tone="success">Jurnal terposting</Badge>
                  </div>
                  <div className="mt-1 text-[12px] font-semibold text-ink">{item.description}</div>
                  <div className="mt-0.5 text-[10.5px] text-muted2">
                    {formatDateID(item.journal_date, "short")}
                    {item.member_number ? ` · ${item.member_number}` : ""}
                  </div>
                  {item.note ? <div className="mt-1 text-[10.5px] text-muted">Catatan: {item.note}</div> : null}
                </div>
                <div className="text-right">
                  <div className="text-[9.5px] text-muted">Nilai kontribusi</div>
                  <div className="text-[13px] font-semibold tabular-nums text-ink">{formatIDR(Number(item.allocation_amount))}</div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="p-5">
            <EmptyState
              title={unavailable ? "Data belum tersedia" : "Belum ada kontribusi yang dialokasikan"}
              body={unavailable
                ? "Riwayat tidak dapat dimuat saat ini."
                : "Catatan akan muncul setelah pengelola Keuangan menghubungkan kontribusi yang telah tercatat di buku besar dengan keanggotaan Anda. Tidak ada nilai perkiraan yang ditampilkan."}
              icon={<Info size={24} />}
            />
          </div>
        )}
      </Card>

      <div className="mt-4">
        <Notice tone="info" title="Kontribusi tidak sama dengan iuran wajib">
          Sistem belum menetapkan tarif, kewajiban, tunggakan, atau tanggal jatuh tempo. Halaman ini hanya menampilkan alokasi kontribusi yang sudah diverifikasi melalui jurnal organisasi.
        </Notice>
      </div>
    </div>
  );
}
