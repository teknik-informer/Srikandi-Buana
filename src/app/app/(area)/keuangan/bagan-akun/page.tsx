import type { Metadata } from "next";
import { COA, ACCOUNT_TYPE_LABEL } from "@/data/coa";
import { computeBalances } from "@/lib/finance";
import { formatIDR } from "@/lib/format";
import { Badge, Card, CardHeader, Notice, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Bagan Akun (COA)" };

const TYPE_ORDER = ["aset", "kewajiban", "ekuitas", "pendapatan", "beban"];

export default function CoaPage() {
  const balances = computeBalances();

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Keuangan Native"
        title="Bagan akun (draf untuk reviu)"
        description="Struktur akun awal disusun sebagai usulan teknis. Akun final wajib disahkan bersama tenaga akuntansi organisasi sebelum dipakai untuk pembukuan resmi."
        actions={<Badge tone="warning">Draf — belum disahkan</Badge>}
      />

      <div className="space-y-4">
        {TYPE_ORDER.map((t) => {
          const rows = COA.filter((a) => a.type === t);
          return (
            <Card key={t}>
              <CardHeader title={ACCOUNT_TYPE_LABEL[t]} subtitle={`${rows.length} akun`} />
              <div className="sb-scroll">
                <table className="sb-table min-w-[620px]">
                  <thead><tr><th>Kode</th><th>Nama akun</th><th>Saldo normal</th><th>Kelompok</th><th className="num">Saldo saat ini</th><th>Catatan</th></tr></thead>
                  <tbody>
                    {rows.map((a) => {
                      const b = balances.find((x) => x.code === a.code);
                      return (
                        <tr key={a.code}>
                          <td className="font-mono text-[11.5px] text-muted">{a.code}</td>
                          <td className="font-medium text-ink">
                            {a.name}
                            {a.protected ? <span className="ml-1.5"><Badge tone="info">dilindungi</Badge></span> : null}
                          </td>
                          <td className="capitalize">{a.normal}</td>
                          <td className="text-muted">{a.group}</td>
                          <td className="num">{b && b.balance ? formatIDR(b.balance) : "—"}</td>
                          <td className="text-[11px] text-muted2">{a.note ?? "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="mt-5">
        <Notice tone="warning" title="Batas kustomisasi">
          Finance Builder hanya boleh mengubah konfigurasi aman (label tampilan, pengelompokan laporan
          yang disetujui). Pemetaan akun inti, aturan posting, dan invarian ledger dilindungi oleh
          domain service dan reviu developer (Blueprint §9.4.10, §16.6).
        </Notice>
      </div>
    </div>
  );
}
