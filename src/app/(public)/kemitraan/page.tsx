import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Handshake, ShieldCheck } from "lucide-react";
import { Card, CardHeader, EmptyState, Notice, PageHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "Kemitraan",
  description: "Informasi kerja sama dan tata cara pengajuan kemitraan dengan Srikandi Buana.",
};

const discussionAreas = [
  ["Pendampingan teknis", "Budidaya, pascapanen, mutu, dan penguatan kelembagaan."],
  ["Pelatihan dan pemberdayaan", "Peningkatan keterampilan, kepemimpinan, dan kapasitas usaha."],
  ["Pemasaran hasil", "Penjajakan pembelian hasil dengan mutu, volume, dan kesepakatan tertulis."],
  ["Program dan hibah", "Dukungan program dengan sasaran, milestone, dan pelaporan yang jelas."],
  ["Riset dan pembelajaran", "Kegiatan kolaborasi dengan perlindungan data anggota dan persetujuan publikasi."],
];

export default function KemitraanPage() {
  return (
    <div className="sb-shell py-12">
      <PageHeader
        eyebrow="Kemitraan"
        title="Kerja sama yang jelas dan saling menghormati."
        description="Srikandi Buana terbuka untuk menerima usulan kolaborasi. Setiap kerja sama harus ditinjau pengurus dan dituangkan dalam kesepakatan sebelum dinyatakan sebagai kemitraan resmi."
      />

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader title="Ruang diskusi" action={<Handshake size={16} className="text-muted2" />} />
          <div className="divide-y divide-line">
            {discussionAreas.map(([title, detail]) => (
              <div key={title} className="px-4 py-3">
                <div className="text-[12px] font-semibold text-ink">{title}</div>
                <p className="mt-1 text-[11px] leading-relaxed text-muted">{detail}</p>
              </div>
            ))}
          </div>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader title="Tahapan pengajuan" action={<ShieldCheck size={16} className="text-muted2" />} />
            <ol className="space-y-3 px-4 py-4 text-[11.5px] text-ink2">
              {[
                "Sampaikan profil lembaga dan tujuan usulan kerja sama.",
                "Pengurus meninjau kesesuaian, risiko, manfaat, dan batas data yang dibagikan.",
                "Ruang lingkup, sumber daya, tanggung jawab, serta milestone dibahas bersama.",
                "Kerja sama hanya diumumkan setelah dokumen disahkan dan persetujuan publikasi dicatat.",
              ].map((item, index) => (
                <li key={item} className="flex gap-2.5">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-paper text-[10px] font-bold text-ink2">{index + 1}</span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </Card>
          <Notice tone="warning" title="Daftar mitra belum dibuka untuk publik">
            Registry mitra internal belum memiliki atribut persetujuan publikasi atau data-sharing consent. Nama mitra, kontak, milestone, dan rincian hubungan tidak ditampilkan pada halaman ini sampai mekanisme publikasinya tersedia.
          </Notice>
        </div>
      </div>

      <Card className="mt-5 p-5">
        <EmptyState
          title="Belum ada kemitraan yang disetujui untuk publikasi"
          body="Catatan mitra internal tidak otomatis menjadi portofolio publik. Informasi akan ditampilkan setelah pengurus menyetujui isi dan cakupan publikasinya."
        />
      </Card>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link href="/kontak?tujuan=kemitraan" className="sb-btn sb-btn-primary">Ajukan pembicaraan kemitraan <ArrowRight size={13} /></Link>
        <Link href="/dokumen" className="sb-btn sb-btn-outline">Lihat dokumen publik</Link>
      </div>
    </div>
  );
}
