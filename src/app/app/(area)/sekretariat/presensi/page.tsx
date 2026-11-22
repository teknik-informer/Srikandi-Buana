import Link from "next/link";
import type { Metadata } from "next";
import { MEETINGS, ATTENDANCE_MOCK } from "@/data/organization";
import { Badge, Card, CardHeader, Notice, PageHeader, StatCard } from "@/components/ui";
import { formatDateID } from "@/lib/format";

export const metadata: Metadata = { title: "Daftar Hadir" };

export default function PresensiPage() {
  const terlaksana = MEETINGS.filter((m) => m.attendees > 0);
  const totalHadir = terlaksana.reduce((s, m) => s + m.attendees, 0);

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Sekretariat"
        title="Daftar hadir rapat"
        description="Rekap kehadiran per rapat. Daftar hadir fisik ditandatangani; sistem menyimpan rekapnya sebagai lampiran notulen."
        actions={<Link href="/app/sekretariat/notulen" className="sb-btn sb-btn-outline">Notulen</Link>}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Rapat dengan daftar hadir" value={terlaksana.length} note="Terlaksana" />
        <StatCard label="Total kehadiran" value={totalHadir} note="Akumulasi orang-rapat" tone="info" />
        <StatCard label="Rata-rata kehadiran" value={terlaksana.length ? Math.round(totalHadir / terlaksana.length) : 0} note="Per rapat" tone="success" />
      </div>

      <div className="mt-5">
        <Card>
          <CardHeader title="Rekap per rapat" subtitle="Daftar hadir terarsip bersama notulen" />
          <div className="sb-scroll">
            <table className="sb-table min-w-[640px]">
              <thead>
                <tr><th>Rapat</th><th>Tanggal</th><th>Jenis</th><th className="num">Hadir</th><th>Notulen</th></tr>
              </thead>
              <tbody>
                {terlaksana.map((m) => (
                  <tr key={m.id}>
                    <td className="font-medium text-ink">{m.title}</td>
                    <td className="whitespace-nowrap text-muted">{formatDateID(m.date, "short")}</td>
                    <td className="text-muted">{m.type}</td>
                    <td className="num font-medium">{m.attendees}</td>
                    <td><Badge tone={m.notulenStatus === "final" ? "success" : "warning"}>{m.notulenStatus}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="mt-5">
        <Card>
          <CardHeader title="Contoh daftar hadir" subtitle={terlaksana[0] ? terlaksana[0].title : "Rapat terakhir"} action={<Badge tone="neutral">Format demo</Badge>} />
          <div className="sb-scroll">
            <table className="sb-table min-w-[520px]">
              <thead><tr><th>No</th><th>Nama</th><th>Jabatan</th><th>Tanda tangan</th></tr></thead>
              <tbody>
                {ATTENDANCE_MOCK.map((a, i) => (
                  <tr key={a.name}>
                    <td className="text-muted">{i + 1}</td>
                    <td className="font-medium text-ink">{a.name}</td>
                    <td className="text-muted">{a.role}</td>
                    <td className="text-muted2 italic">hadir</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="mt-5">
        <Notice tone="info" title="Batas demo">
          Daftar hadir di atas adalah <strong>contoh format</strong> dengan nama anggota demo, bukan salinan daftar hadir
          rapat sungguhan. Rekap angka pada tabel pertama berasal dari data rapat contoh.
        </Notice>
      </div>
    </div>
  );
}
