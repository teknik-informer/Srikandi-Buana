import Link from "next/link";
import type { Metadata } from "next";
import { orgSummary } from "@/lib/org-summary";
import { halamanPublik, teksDari } from "@/lib/public-cms-server";
import { DataStamp } from "@/components/data-stamp";
import { formatDateID } from "@/lib/format";
import { Badge, Card, CardHeader, Notice } from "@/components/ui";

// Daftar mitra berasal dari dokumen bersama dan bisa berubah kapan saja,
// jadi halaman ini tidak boleh dibekukan saat build.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kemitraan",
  description: "Program kemitraan Srikandi Buana: mitra pemerintah, NGO, koperasi, usaha, dan akademik.",
};

const TYPE_LABEL: Record<string, string> = {
  pemerintah: "Pemerintah & desa",
  ngo: "NGO / filantropi",
  usaha: "Usaha / UMKM",
  koperasi: "Koperasi",
  akademik: "Akademik",
};

export default async function KemitraanPage() {
  // Pengurus bisa menambah/mengubah mitra (partner.create/update/delete),
  // jadi daftar ini harus berasal dari dokumen bersama — bukan konstanta.
  const { partners: PARTNERS, shared, updatedBy, updatedAt } = await orgSummary();
  const halaman = await halamanPublik("/kemitraan");
  const judul = teksDari(halaman.blocks, "rich-text", "headline", "Tumbuh bersama, dengan perjanjian yang jelas.");
  return (
    <div className="sb-shell py-12">
      <div className="sb-label mb-2">Kemitraan</div>
      <h1 className="font-display text-[34px] leading-tight font-semibold text-ink sm:text-[40px]">{judul}</h1>
      <p className="mt-2 max-w-2xl text-[13.5px] text-muted">
        Setiap kerja sama dicatat pada database mitra dengan milestone, dokumen, dan batas data
        sharing yang disepakati.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader title="Bentuk kerja sama yang kami buka" />
          <ul className="space-y-2.5 px-5 py-4 text-[13px] text-ink2">
            <li><span className="font-semibold text-ink">Pendampingan teknis</span> — budidaya, pascapanen, mutu produk.</li>
            <li><span className="font-semibold text-ink">Pelatihan &amp; peningkatan kapasitas</span> — narasumber atau fasilitator.</li>
            <li><span className="font-semibold text-ink">Pembelian hasil panen</span> — kontrak pembelian dengan mutu dan harga tertulis.</li>
            <li><span className="font-semibold text-ink">Hibah / program pemberdayaan</span> — dengan pelaporan milestone.</li>
            <li><span className="font-semibold text-ink">Riset &amp; pembelajaran</span> — dengan perlindungan data anggota.</li>
          </ul>
        </Card>
        <Card>
          <CardHeader title="Cara mengajukan" />
          <ol className="space-y-3 px-5 py-4 text-[13px] text-ink2">
            {[
              "Kirim surat/proposal ke surel resmi dengan ringkasan tujuan.",
              "Bidang Usaha & Kemitraan meninjau kelayakan dan batas data.",
              "Pertemuan pembahasan dan penetapan milestone.",
              "Pencatatan pada database mitra dan dokumen perjanjian.",
            ].map((s, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-100 text-[10.5px] font-bold text-primary-800">{i + 1}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
          <div className="px-5 pb-4"><Link href="/kontak" className="sb-btn sb-btn-primary">Ajukan kemitraan</Link></div>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader
          title="Mitra tercatat"
          subtitle="Hanya mitra yang menyetujui publikasi yang ditampilkan"
          action={<Badge tone="neutral">{PARTNERS.length} mitra</Badge>}
        />
        <div className="sb-scroll">
          <table className="sb-table min-w-[680px]">
            <thead>
              <tr><th>Mitra</th><th>Jenis</th><th>Mulai</th><th>Milestone berjalan</th><th>Status</th></tr>
            </thead>
            <tbody>
              {PARTNERS.map((p) => (
                <tr key={p.id}>
                  <td className="font-medium text-ink">{p.name}</td>
                  <td className="text-muted">{TYPE_LABEL[p.type]}</td>
                  <td className="whitespace-nowrap text-muted">{formatDateID(p.since)}</td>
                  <td className="text-muted">{p.milestone}</td>
                  <td><Badge tone={p.status === "aktif" ? "success" : "warning"}>{p.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-5">
        <Notice tone="warning" title="Batas data sharing">
          Akses mitra terhadap data anggota hanya melalui persetujuan tertulis dan data-sharing grant
          yang dapat dicabut. Portofolio mitra tidak membuka data transaksi internal.
        </Notice>
      </div>
      <DataStamp shared={shared} updatedBy={updatedBy} updatedAt={updatedAt} what="data mitra" />
    </div>
  );
}
