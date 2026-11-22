import Link from "next/link";
import type { Metadata } from "next";
import { LETTERS, DOCUMENTS, MEETINGS, MEMBERS } from "@/data/organization";
import { Card, CardHeader, Notice, PageHeader, StatCard } from "@/components/ui";
import { formatDateID } from "@/lib/format";

export const metadata: Metadata = { title: "Laporan Sekretariat" };

export default function LaporanSekretariatPage() {
  const masuk = LETTERS.filter((l) => l.direction === "masuk");
  const keluar = LETTERS.filter((l) => l.direction === "keluar");
  const selesai = LETTERS.filter((l) => l.status === "selesai");

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Sekretariat"
        title="Laporan kesekretariatan"
        description="Rekap surat, arsip, rapat, dan keanggotaan untuk periode berjalan. Angka dihitung dari catatan sekretariat, bukan dari aplikasi lain."
        actions={<Link href="/app/pengurus/laporan" className="sb-btn sb-btn-outline">Laporan organisasi</Link>}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Surat tercatat" value={LETTERS.length} note={`${masuk.length} masuk · ${keluar.length} keluar`} />
        <StatCard label="Surat selesai" value={selesai.length} note={`${LETTERS.length - selesai.length} masih berjalan`} tone="success" />
        <StatCard label="Dokumen diarsip" value={DOCUMENTS.length} note={`${DOCUMENTS.filter((d) => d.status === "final").length} final`} tone="info" href="/app/sekretariat/dokumen" />
        <StatCard label="Rapat tercatat" value={MEETINGS.length} note={`${MEETINGS.filter((m) => m.notulenStatus === "final").length} notulen final`} tone="accent" />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Rekap surat" subtitle="Per arah dan status" />
          <div className="sb-scroll">
            <table className="sb-table">
              <thead><tr><th>Arah</th><th className="num">Jumlah</th><th className="num">Baru</th><th className="num">Diproses</th><th className="num">Selesai</th></tr></thead>
              <tbody>
                {(["masuk", "keluar"] as const).map((dir) => {
                  const list = LETTERS.filter((l) => l.direction === dir);
                  const c = (s: string) => list.filter((l) => l.status === s).length;
                  return (
                    <tr key={dir}>
                      <td className="font-medium text-ink">{dir === "masuk" ? "Surat masuk" : "Surat keluar"}</td>
                      <td className="num">{list.length}</td>
                      <td className="num">{c("baru")}</td>
                      <td className="num">{c("diproses")}</td>
                      <td className="num">{c("selesai")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHeader title="Arsip per kategori" subtitle="Seluruh dokumen tercatat" />
          <div className="sb-scroll">
            <table className="sb-table">
              <thead><tr><th>Kategori</th><th className="num">Jumlah</th><th className="num">Final</th><th className="num">Draf</th></tr></thead>
              <tbody>
                {(["SK", "Laporan", "SOP", "Notulen", "Publikasi"] as const).map((cat) => {
                  const list = DOCUMENTS.filter((d) => d.category === cat);
                  if (!list.length) return null;
                  return (
                    <tr key={cat}>
                      <td className="font-medium text-ink">{cat}</td>
                      <td className="num">{list.length}</td>
                      <td className="num">{list.filter((d) => d.status === "final").length}</td>
                      <td className="num">{list.filter((d) => d.status === "draft").length}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Rapat & notulen" subtitle="Status dokumentasi" />
          <ul className="divide-y divide-line">
            {MEETINGS.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                <div className="min-w-0">
                  <div className="text-[12px] font-medium text-ink">{m.title}</div>
                  <div className="text-[10.5px] text-muted2">{formatDateID(m.date, "short")} · {m.attendees} hadir</div>
                </div>
                <span className={`shrink-0 text-[11px] font-semibold ${m.notulenStatus === "final" ? "text-[var(--sb-success)]" : "text-[var(--sb-warning)]"}`}>
                  {m.notulenStatus === "final" ? "notulen final" : "notulen draf"}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Keanggotaan" subtitle="Catatan induk" />
          <ul className="divide-y divide-line">
            {[
              ["Terdaftar", MEMBERS.length, "Seluruh nomor induk"],
              ["Aktif", MEMBERS.filter((m) => m.status === "aktif").length, "Berhak atas layanan anggota"],
              ["Menunggu verifikasi", MEMBERS.filter((m) => m.status === "menunggu").length, "Perlu keputusan"],
              ["Nonaktif", MEMBERS.filter((m) => m.status === "nonaktif").length, "Arsip, riwayat disimpan"],
            ].map(([k, v, note]) => (
              <li key={String(k)} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div>
                  <div className="text-[12px] font-medium text-ink">{k}</div>
                  <div className="text-[10.5px] text-muted2">{note}</div>
                </div>
                <span className="text-[13px] font-semibold tabular-nums text-ink">{v}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-5">
        <Notice tone="info" title="Batas laporan">
          Laporan ini merangkum registrasi sekretariat pada data demo. Ekspor PDF/Excel dan format resmi belum tersedia —
          menunggu penetapan format laporan organisasi.
        </Notice>
      </div>
    </div>
  );
}
