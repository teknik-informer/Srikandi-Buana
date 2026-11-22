import type { Metadata } from "next";
import { Badge, Card, CardHeader, Notice, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Komunitas" };

const THREADS = [
  { id: "TH-01", title: "Tips penyimpanan kopi setelah panen", author: "Warsiti", group: "Kelompok Kopi", replies: 8, last: "2 hari lalu" },
  { id: "TH-02", title: "Jadwal giliran rumah jemur Desember", author: "Parmi", group: "Kelompok Kopi", replies: 5, last: "4 hari lalu" },
  { id: "TH-03", title: "Ide kemasan madu untuk kafe", author: "Suprapti", group: "Bidang Usaha", replies: 11, last: "6 hari lalu" },
  { id: "TH-04", title: "Pengalaman ikut Sekolah Tani pertama", author: "Ngatinem", group: "Umum", replies: 14, last: "1 minggu lalu" },
];

export default function KomunitasPage() {
  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Pusat Komunitas"
        title="Forum & ruang diskusi"
        description="Ruang komunikasi anggota yang melekat pada pekerjaan: kelompok minat, bidang, dan pekerjaan yang dibagikan."
      />
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader title="Diskusi terbaru" action={<Badge tone="neutral">4 topik</Badge>} />
          <div className="divide-y divide-line">
            {THREADS.map((t) => (
              <div key={t.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[13px] font-semibold text-ink">{t.title}</div>
                  <span className="text-[10.5px] text-muted2">{t.last}</span>
                </div>
                <div className="mt-0.5 text-[10.5px] text-muted2">{t.author} · {t.group} · {t.replies} balasan</div>
              </div>
            ))}
          </div>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader title="Aturan komunitas" />
            <ul className="space-y-2 px-4 py-3 text-[12px] text-ink2">
              {[
                "Hormati anggota lain; kritik ide, bukan orang.",
                "Jangan bagikan data pribadi anggota lain.",
                "Diskusi komersial melalui kanal resmi bidang usaha.",
                "Moderasi oleh pengurus dengan catatan tindakan.",
              ].map((r) => (
                <li key={r} className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-400" />{r}</li>
              ))}
            </ul>
          </Card>
          <Notice tone="info" title="Pesan pribadi">
            Pesan pribadi antar-anggota tersedia pada produksi dengan kontrol privasi. Pada demo ini
            kanal pesan dinonaktifkan untuk menghindari pengumpulan data nyata.
          </Notice>
        </div>
      </div>
    </div>
  );
}
