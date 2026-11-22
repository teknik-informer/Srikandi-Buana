import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardHeader, PageHeader, Notice } from "@/components/ui";

export const metadata: Metadata = { title: "Buat Cepat" };

const ACTIONS = [
  { label: "Pengajuan kegiatan bidang", href: "/app/bidang/pertanian/formulir", note: "Formulir → workflow persetujuan" },
  { label: "Pengajuan anggaran", href: "/app/keuangan/pengaturan", note: "Bidang mengajukan, keuangan memposting" },
  { label: "Catatan panen", href: "/app/bidang/pertanian/data", note: "Petak, komoditas, berat, grade" },
  { label: "Penerimaan kas", href: "/app/keuangan/penerimaan", note: "Dengan dimensi program & dana" },
  { label: "Surat keluar", href: "/app/sekretariat/surat", note: "Nomor otomatis oleh generator" },
  { label: "Pesanan baru", href: "/app/bidang/usaha/data", note: "Kanal WhatsApp / mitra / POS" },
];

export default function CepatPage() {
  return (
    <div className="pb-10">
      <PageHeader eyebrow="Aksi cepat" title="Buat cepat" description="Pintasan ke formulir yang sah per domain. Setiap formulir memvalidasi di server dan menulis ke domain pemilik data." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ACTIONS.map((a) => (
          <Link key={a.label} href={a.href} className="sb-card group p-4 transition hover:-translate-y-0.5 hover:border-primary-300">
            <div className="text-[13px] font-semibold text-ink group-hover:text-primary-800">{a.label}</div>
            <div className="mt-0.5 text-[11px] text-muted">{a.note}</div>
          </Link>
        ))}
      </div>
      <div className="mt-4">
        <Notice tone="info" title="Bukan jalan pintas aturan">
          Aksi cepat tidak melewati validasi, persetujuan, atau pemisahan tugas. Formulir yang sama
          dipakai dari menu mana pun.
        </Notice>
      </div>
    </div>
  );
}
