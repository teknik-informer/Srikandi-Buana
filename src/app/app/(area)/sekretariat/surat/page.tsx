import type { Metadata } from "next";
import { LETTERS } from "@/data/organization";
import { Badge, Card, CardHeader, PageHeader, StatusBadge, Tabs } from "@/components/ui";
import { formatDateID } from "@/lib/format";

export const metadata: Metadata = { title: "Surat Masuk & Keluar" };

export default async function SuratPage({ searchParams }: { searchParams: Promise<{ arah?: string }> }) {
  const { arah } = await searchParams;
  const active = arah ?? "masuk";
  const list = LETTERS.filter((l) => l.direction === active);

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Sekretariat"
        title="Surat masuk & keluar"
        description="Registrasi surat, penanggung jawab tindak lanjut, dan status penyelesaian. Nomor surat dibuat oleh dokumen generator."
      />
      <Tabs
        active={active}
        tabs={[
          { key: "masuk", label: `Masuk (${LETTERS.filter((l) => l.direction === "masuk").length})`, href: "/app/sekretariat/surat?arah=masuk" },
          { key: "keluar", label: `Keluar (${LETTERS.filter((l) => l.direction === "keluar").length})`, href: "/app/sekretariat/surat?arah=keluar" },
        ]}
      />
      <Card className="mt-4">
        <CardHeader title={active === "masuk" ? "Surat masuk" : "Surat keluar"} subtitle="Diurutkan menurut tanggal terbaru" />
        <div className="sb-scroll">
          <table className="sb-table min-w-[720px]">
            <thead>
              <tr><th>Nomor</th><th>Perihal</th><th>Lawan transaksi</th><th>Tanggal</th><th>PIC</th><th>Status</th></tr>
            </thead>
            <tbody>
              {list.map((l) => (
                <tr key={l.id}>
                  <td className="whitespace-nowrap font-mono text-[11.5px] text-muted">{l.number}</td>
                  <td className="font-medium text-ink">{l.subject}</td>
                  <td className="text-muted">{l.counterpart}</td>
                  <td className="whitespace-nowrap text-muted">{formatDateID(l.date, "short")}</td>
                  <td>{l.assignee}</td>
                  <td><StatusBadge status={l.status === "baru" ? "Baru" : l.status === "diproses" ? "Diproses" : "Selesai"} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-line px-4 py-2.5">
          <Badge tone="neutral">Nomor surat otomatis</Badge>{" "}
          <span className="text-[11px] text-muted">Format penomoran mengikuti konfigurasi dokumen generator organisasi.</span>
        </div>
      </Card>
    </div>
  );
}
