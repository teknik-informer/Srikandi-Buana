import Link from "next/link";
import type { Metadata } from "next";
import { orgSummary } from "@/lib/org-summary";
import { DataStamp } from "@/components/data-stamp";
import { formatDateID, relativeID } from "@/lib/format";
import { Badge, Card, Progress } from "@/components/ui";
import { halamanPublik, teksDari } from "@/lib/public-cms-server";

// Jadwal pelatihan dikelola pengurus (training.create/update/status), jadi
// halaman publik tidak boleh dibekukan saat build.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pelatihan",
  description: "Jadwal pelatihan dan kelas keterampilan untuk anggota dan warga Srikandi Buana, Kedu, Temanggung.",
};

export default async function PelatihanPage() {
  const _hp = await halamanPublik("/pelatihan");
  const judul = teksDari(_hp.blocks, "rich-text", "headline", "Kelas yang dibuka untuk anggota.");
  const pembuka = teksDari(_hp.blocks, "rich-text", "subheadline", "Jadwal terbuka Sekolah Tani Perempuan. Pendaftaran anggota melalui portal anggota; warga umum melalui formulir minat bergabung.");

  const { trainings, shared, updatedBy, updatedAt } = await orgSummary();
  const open = trainings.filter((t) => t.status !== "selesai");
  const done = trainings.filter((t) => t.status === "selesai");

  return (
    <div className="sb-shell py-12">
      <div className="sb-label mb-2">Pemberdayaan &amp; Pelatihan</div>
      <h1 className="font-display text-[34px] leading-tight font-semibold text-ink sm:text-[40px]">{judul}</h1>
      <p className="mt-2 max-w-2xl text-[13.5px] text-muted">{pembuka}</p>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {open.map((t) => (
          <Card key={t.id} className="flex flex-col p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Badge tone={t.status === "dibuka" ? "success" : "warning"}>{t.status === "dibuka" ? "Pendaftaran dibuka" : "Rencana"}</Badge>
                <h2 className="mt-2 font-display text-[19px] font-semibold leading-snug text-ink">{t.title}</h2>
              </div>
            </div>
            <div className="mt-2 text-[12px] text-muted">{formatDateID(t.date)} · {t.location}</div>
            <div className="mt-1 text-[12px] text-muted2">Narasumber: {t.trainer}</div>
            <div className="mt-4">
              <div className="mb-1 flex justify-between text-[11.5px] text-muted">
                <span>Peserta terdaftar</span>
                <span className="font-semibold text-ink2">{t.registered}/{t.seats}</span>
              </div>
              <Progress value={Math.round((t.registered / t.seats) * 100)} />
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
              <span className="text-[11.5px] text-muted2">{relativeID(t.date)}</span>
              <Link href="/masuk" className="text-[12px] font-semibold text-primary-700 hover:underline">Daftar via portal →</Link>
            </div>
          </Card>
        ))}
      </div>

      <h2 className="mt-12 font-display text-[21px] font-semibold text-ink">Sudah terlaksana</h2>
      <div className="mt-3 space-y-3">
        {done.map((t) => (
          <Card key={t.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <div className="text-[13.5px] font-semibold text-ink">{t.title}</div>
              <div className="text-[11.5px] text-muted">{formatDateID(t.date)} · {t.registered} peserta · {t.trainer}</div>
            </div>
            <div className="flex items-center gap-4 text-[11.5px]">
              {t.preScore && t.postScore ? (
                <span className="text-muted">Rata-rata skor: <span className="font-semibold text-ink2">{t.preScore} → {t.postScore}</span></span>
              ) : null}
              <Badge tone="success">Selesai</Badge>
            </div>
          </Card>
        ))}
      </div>
      <DataStamp shared={shared} updatedBy={updatedBy} updatedAt={updatedAt} what="jadwal pelatihan" />
    </div>
  );
}
