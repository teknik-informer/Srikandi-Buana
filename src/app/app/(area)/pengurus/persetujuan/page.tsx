import type { Metadata } from "next";
import { APPROVALS } from "@/data/organization";
import { Badge, Card, CardHeader, PageHeader, StatusBadge, Tabs, Notice } from "@/components/ui";
import { formatIDR, formatDateID } from "@/lib/format";

export const metadata: Metadata = { title: "Persetujuan" };

export default async function PersetujuanPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const active = tab ?? "menunggu";
  const list = APPROVALS.filter((a) => (active === "semua" ? true : a.status === active));

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Pengurus Harian"
        title="Kotak persetujuan"
        description="Setiap keputusan mencatat aktor, waktu, alasan, dan tahap. Pengguna tidak dapat menyetujui transaksi sendiri jika aturan pemisahan tugas melarangnya."
      />

      <Tabs
        active={active}
        tabs={[
          { key: "menunggu", label: `Menunggu (${APPROVALS.filter((a) => a.status === "menunggu").length})`, href: "/app/pengurus/persetujuan?tab=menunggu" },
          { key: "revisi", label: `Revisi (${APPROVALS.filter((a) => a.status === "revisi").length})`, href: "/app/pengurus/persetujuan?tab=revisi" },
          { key: "disetujui", label: `Disetujui (${APPROVALS.filter((a) => a.status === "disetujui").length})`, href: "/app/pengurus/persetujuan?tab=disetujui" },
          { key: "semua", label: "Semua", href: "/app/pengurus/persetujuan?tab=semua" },
        ]}
      />

      <div className="mt-4 space-y-3">
        {list.map((a) => (
          <Card key={a.id}>
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-surface2 px-1.5 py-0.5 font-mono text-[10.5px] text-ink2">{a.id}</span>
                  <Badge tone="neutral">{a.kind}</Badge>
                  <StatusBadge status={a.status === "menunggu" ? "Menunggu" : a.status === "revisi" ? "Revisi" : "Disetujui"} />
                </div>
                <h2 className="mt-1.5 font-display text-[17px] font-semibold text-ink">{a.title}</h2>
                <div className="mt-0.5 text-[11.5px] text-muted">{a.bidang} · diajukan {a.submittedBy} · {formatDateID(a.submittedAt)}</div>
              </div>
              <div className="text-right">
                {a.amount ? <div className="font-display text-[20px] font-semibold text-primary-800">{formatIDR(a.amount)}</div> : <div className="text-[12px] text-muted">Non-finanial</div>}
                <div className="text-[10.5px] text-muted2">Tahap: {a.currentStep}</div>
              </div>
            </div>
            <div className="px-4 py-3">
              <div className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">Riwayat keputusan</div>
              <ol className="mt-2 space-y-2">
                {a.history.map((h, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-400" />
                    <div className="text-[12px]">
                      <span className="font-semibold text-ink">{h.actor}</span>{" "}
                      <span className="text-ink2">{h.action.toLowerCase()}</span>{" "}
                      <span className="text-muted2">· {h.at}</span>
                      {h.note ? <div className="text-[11px] text-muted">{h.note}</div> : null}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            {a.status === "menunggu" && (
              <div className="flex flex-wrap items-center gap-2 border-t border-line bg-paper px-4 py-2.5">
                <button type="button" className="sb-btn sb-btn-primary !py-1.5 text-[12px]" disabled title="Keputusan persetujuan menulis ke workflow engine dan audit log — belum aktif pada demo.">Setujui</button>
                <button type="button" className="sb-btn sb-btn-danger !py-1.5 text-[12px]" disabled title="Keputusan persetujuan menulis ke workflow engine dan audit log — belum aktif pada demo.">Tolak / minta revisi</button>
                <span className="text-[10.5px] text-muted2">Aksi persetujuan dinonaktifkan pada demo — alur kerja nyata menulis ke workflow engine &amp; audit log.</span>
              </div>
            )}
          </Card>
        ))}
        {list.length === 0 && <Card className="px-5 py-10 text-center text-[13px] text-muted">Tidak ada pengajuan pada kategori ini.</Card>}
      </div>

      <div className="mt-5">
        <Notice tone="info" title="Aturan yang dijaga sistem">
          Status hanya dapat berpindah melalui transisi yang sah. Notifikasi ulang tidak boleh
          menghasilkan tugas atau transaksi ganda. Delegasi tercatat dengan masa berlaku.
        </Notice>
      </div>
    </div>
  );
}
