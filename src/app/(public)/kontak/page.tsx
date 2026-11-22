import type { Metadata } from "next";
import { ORG } from "@/config/org";
import { Card, CardHeader, Notice } from "@/components/ui";
import { Mail, MapPin, Clock, MessageCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Kontak",
  description: "Alamat, jam layanan, dan kanal komunikasi resmi KWT Srikandi Buana.",
};

export default async function KontakPage({ searchParams }: { searchParams: Promise<{ tujuan?: string }> }) {
  const { tujuan } = await searchParams;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="sb-label mb-2">Kontak</div>
      <h1 className="font-display text-[34px] leading-tight font-semibold text-ink sm:text-[40px]">Bicara langsung dengan sekretariat.</h1>
      <p className="mt-2 max-w-2xl text-[13.5px] text-muted">
        Untuk pertanyaan umum, kemitraan, atau permintaan informasi institusional.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader title="Kantor & balai pertemuan" />
          <div className="space-y-4 px-5 py-4 text-[13px]">
            <div className="flex gap-3"><MapPin size={17} className="mt-0.5 shrink-0 text-primary-600" /><div><div className="font-semibold text-ink">Alamat</div><p className="text-muted">{ORG.address}</p></div></div>
            <div className="flex gap-3"><Clock size={17} className="mt-0.5 shrink-0 text-primary-600" /><div><div className="font-semibold text-ink">Jam layanan</div><p className="text-muted">{ORG.hours}</p></div></div>
            <div className="flex gap-3"><Mail size={17} className="mt-0.5 shrink-0 text-primary-600" /><div><div className="font-semibold text-ink">Surel</div><p className="text-muted">{ORG.email}</p></div></div>
            <div className="flex gap-3"><MessageCircle size={17} className="mt-0.5 shrink-0 text-primary-600" /><div><div className="font-semibold text-ink">WhatsApp resmi</div><p className="text-muted">{ORG.whatsapp} · balasan 1×24 jam kerja</p></div></div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Permintaan informasi" subtitle={tujuan === "informasi" ? "Untuk institusi, peneliti, atau media" : "Pilih keperluan Anda"} />
          <div className="px-5 py-4">
            <ul className="space-y-2.5 text-[13px] text-ink2">
              <li><span className="font-semibold text-ink">Institusi / pemerintah:</span> permintaan data dan laporan program melalui portal eksternal setelah persetujuan.</li>
              <li><span className="font-semibold text-ink">NGO / funder:</span> dokumen kerja sama dan laporan milestone dikelola Bidang Usaha &amp; Kemitraan.</li>
              <li><span className="font-semibold text-ink">Media:</span> kutipan resmi hanya dari Ketua atau Sekretaris.</li>
              <li><span className="font-semibold text-ink">Calon anggota:</span> gunakan <a className="font-semibold text-primary-700 underline" href="/gabung">formulir minat bergabung</a>.</li>
            </ul>
            <div className="mt-4">
              <Notice tone="info">
                Lingkungan demo: formulir kontak tidak mengirim pesan keluar. Kanal resmi di atas
                adalah placeholder untuk tujuan demonstrasi.
              </Notice>
            </div>
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title="Lokasi" subtitle="Desa Ngadimulyo, Kecamatan Kedu, Kabupaten Temanggung" />
        <div className="relative overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={"/images/peta-desa.svg"} alt="Ilustrasi peta lokasi Desa Ngadimulyo, Kedu, Temanggung" className="aspect-[21/9] w-full bg-[var(--sb-primary-50)] object-contain" width={1400} height={600} loading="lazy" />
          <div className="absolute bottom-3 left-3 rounded-md border border-line bg-white/95 px-3 py-1.5 text-[11.5px] font-medium text-ink2 shadow-sm">
            Balai Pertemuan KWT Srikandi Buana · 7.2°S, 110.1°E (ilustrasi)
          </div>
        </div>
      </Card>
    </div>
  );
}
