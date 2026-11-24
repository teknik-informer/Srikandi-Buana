import type { Metadata } from "next";
import { MessagesSquare, ShieldCheck } from "lucide-react";
import { Card, CardHeader, Notice, PageHeader } from "@/components/ui";
import { requireIdentity } from "@/lib/session";

export const metadata: Metadata = { title: "Komunitas Anggota" };

export default async function KomunitasPage() {
  await requireIdentity("member:self");

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Portal Anggota"
        title="Komunitas & ruang diskusi"
        description="Ruang berbagi antaranggota yang akan terhubung ke akun dan tata kelola organisasi."
      />
      <Card>
        <CardHeader title="Forum anggota" action={<MessagesSquare size={16} className="text-muted2" />} />
        <div className="px-4 py-9 text-center">
          <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-paper text-muted2">
            <MessagesSquare size={20} />
          </div>
          <h2 className="mt-3 text-[13px] font-semibold text-ink">Forum belum diaktifkan</h2>
          <p className="mx-auto mt-1.5 max-w-lg text-[11.5px] leading-5 text-muted">
            Sistem belum memiliki penyimpanan percakapan, identitas penulis, moderasi, dan kontrol pelaporan
            yang terhubung ke akun anggota. Diskusi contoh telah disembunyikan agar tidak tampak sebagai
            percakapan nyata.
          </p>
        </div>
      </Card>
      <div className="mt-4">
        <Notice tone="info" title="Privasi dan moderasi">
          Forum hanya akan dibuka setelah akses per anggota, penghapusan/pelaporan konten, aturan moderasi,
          dan catatan tindakan pengurus tersedia. Data pribadi anggota tidak boleh tampil tanpa persetujuan.
        </Notice>
      </div>
      <div className="mt-4 flex items-start gap-2 rounded-sb-sm border border-line bg-paper px-3.5 py-3 text-[11px] leading-5 text-muted">
        <ShieldCheck size={14} className="mt-0.5 shrink-0" />
        Untuk saat ini gunakan komunikasi resmi organisasi yang sudah ditetapkan pengurus.
      </div>
    </div>
  );
}
