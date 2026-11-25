import Link from "next/link";
import type { Metadata } from "next";
import { MEETINGS as SEED_MEETINGS } from "@/data/organization";
import { orgSummary, hitungAnggota } from "@/lib/org-summary";
import { Card, CardHeader, Notice, PageHeader, StatCard } from "@/components/ui";
import { formatDateID } from "@/lib/format";

export const metadata: Metadata = { title: "Laporan Sekretariat" };

export default async function LaporanSekretariatPage() {
  // Angka keanggotaan mengikuti dokumen bersama — laporan tidak boleh
  // menyebut jumlah yang berbeda dari buku induk.
  const ringkas = await orgSummary();
  const anggota = hitungAnggota(ringkas.members);
  // Surat, dokumen, rapat, dan kehadiran semuanya dikelola sekretariat, jadi
  // angkanya dibaca dari dokumen bersama.
  const { letters: LETTERS, documents: DOCUMENTS } = ringkas;
  const { meetings: MEETINGS, meetingAttendance: KEHADIRAN } = ringkas;
  const rapatBerdaftar = MEETINGS.filter((m) => KEHADIRAN.some((a) => a.meetingId === m.id)).length;
  const orangHadir = KEHADIRAN.filter((a) => a.present).length;
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
        <StatCard label="Rapat tercatat" value={MEETINGS.length} note={`${MEETINGS.filter((m) => m.notulenStatus === "final").length} notulen final · ${rapatBerdaftar} berdaftar hadir`} tone="accent" />
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
                  <div className="text-[10.5px] text-muted2">
                    {formatDateID(m.date, "short")} · {m.attendees} hadir
                    {KEHADIRAN.some((a) => a.meetingId === m.id) ? " (daftar tercatat)" : ""}
                  </div>
                </div>
                <span className={`shrink-0 text-[11px] font-semibold ${m.notulenStatus === "final" ? "text-[var(--sb-success)]" : "text-[var(--sb-warning)]"}`}>
                  {m.notulenStatus === "final" ? "notulen final" : "notulen draf"}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader
            title="Kehadiran per orang"
            subtitle={orangHadir ? `${orangHadir} kehadiran tercatat di ${rapatBerdaftar} rapat` : "Belum ada daftar hadir yang diisi"}
          />
          {orangHadir === 0 ? (
            <p className="px-4 py-4 text-[12px] leading-relaxed text-muted">
              Daftar hadir per orang belum diisi. Buka{" "}
              <Link href="/app/sekretariat/presensi" className="font-semibold text-primary-800 underline">
                Daftar hadir rapat
              </Link>{" "}
              untuk menandai kehadiran anggota pada rapat tertentu.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {Array.from(
                KEHADIRAN.filter((a) => a.present).reduce((peta, a) => {
                  peta.set(a.memberName, (peta.get(a.memberName) ?? 0) + 1);
                  return peta;
                }, new Map<string, number>()),
              )
                .sort((a, b) => b[1] - a[1])
                .slice(0, 8)
                .map(([nama, jumlah]) => (
                  <li key={nama} className="flex items-center justify-between gap-2 px-4 py-2.5">
                    <span className="text-[12px] font-medium text-ink">{nama}</span>
                    <span className="text-[11px] text-muted2">{jumlah} rapat</span>
                  </li>
                ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Keanggotaan" subtitle="Catatan induk" />
          <ul className="divide-y divide-line">
            {[
              ["Terdaftar", anggota.total, "Seluruh nomor induk"],
              ["Aktif", anggota.aktif, "Berhak atas layanan anggota"],
              ["Menunggu verifikasi", anggota.menunggu, "Perlu keputusan"],
              ["Nonaktif", anggota.nonaktif, "Arsip, riwayat disimpan"],
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
