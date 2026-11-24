import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, LockKeyhole, ShieldCheck } from "lucide-react";
import {
  Badge,
  Card,
  CardHeader,
  Notice,
  PageHeader,
} from "@/components/ui";
import { requireIdentity } from "@/lib/session";

export const metadata: Metadata = { title: "Kontrol Akuntansi" };

const implementedControls = [
  {
    title: "Validasi jurnal berpasangan",
    detail: "Saat pengajuan dan posting, database memeriksa minimal dua baris, akun aktif dan dapat diposting, total debit-kredit seimbang dan positif, serta total header cocok dengan rincian jurnal.",
  },
  {
    title: "Pemisahan pembuat dan pemeriksa",
    detail: "Jurnal tidak dapat disetujui oleh pembuatnya sendiri. Tindakan persetujuan memerlukan identitas pemeriksa yang berbeda.",
  },
  {
    title: "Alur status terkendali",
    detail: "Transisi dibatasi: draf → diajukan → disetujui atau ditolak; draf yang ditolak dapat dibuka kembali; hanya jurnal disetujui yang dapat diposting.",
  },
  {
    title: "Jurnal terposting tidak dapat diubah",
    detail: "Jurnal posted dan barisnya dilindungi. Koreksi dilakukan melalui jurnal pembalik, bukan mengedit atau menghapus histori.",
  },
  {
    title: "Idempotensi dan presisi nominal",
    detail: "Idempotency key unik per organisasi disimpan di database. Kolom nominal memakai numeric(18,2), bukan floating-point.",
  },
  {
    title: "Perlindungan bagan akun",
    detail: "Kode dan sifat akun dikunci setelah dipakai dalam jurnal. Akun yang memiliki histori posted tidak dapat diarsipkan atau dihapus.",
  },
  {
    title: "Jejak audit",
    detail: "Server action jurnal menulis peristiwa audit bersama perubahan status, termasuk aktor, referensi, nilai, dan keputusan yang relevan.",
  },
];

const pendingControls = [
  "Periode fiskal, penguncian tanggal transaksi, dan proses tutup buku.",
  "Anggaran yang disahkan, komitmen belanja, serta dimensi program/sumber dana pada jurnal.",
  "Sub-ledger invoice, piutang/utang per pihak, termin, dan umur tagihan.",
  "Import mutasi bank, pencocokan rekening koran, dan status rekonsiliasi.",
  "Alur lampiran bukti transaksi dan persetujuan laporan keuangan formal.",
];

export default async function KeuanganPengaturanPage() {
  await requireIdentity("finance:read");

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Keuangan Native"
        title="Kontrol akuntansi"
        description="Ringkasan mekanisme yang benar-benar ditegakkan pada server dan database, beserta bagian yang belum diaktifkan."
        actions={<Badge tone="success">Aturan server & database</Badge>}
      />

      <div className="mb-4">
        <Notice tone="info" title="Tidak ada status periode contoh">
          Daftar periode terbuka/terkunci dan versi aturan dari halaman lama merupakan data statis contoh.
          Halaman tersebut telah dihapus. Status periode fiskal tidak akan ditampilkan sebelum tersedia
          tabel, kebijakan penutupan, dan kontrol tanggal transaksi di server.
        </Notice>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[1.35fr_0.9fr]">
        <Card>
          <CardHeader
            title="Kontrol yang sudah diterapkan"
            subtitle="Ditegakkan melalui server action, constraint, dan trigger database"
            action={<ShieldCheck size={16} className="text-[var(--sb-success)]" />}
          />
          <div className="divide-y divide-line">
            {implementedControls.map((item) => (
              <article key={item.title} className="flex gap-3 px-4 py-3.5">
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--sb-success-bg)] text-[var(--sb-success)]">
                  <CheckCircle2 size={15} />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-[12.5px] font-semibold text-ink">{item.title}</h2>
                    <Badge tone="success">Diterapkan</Badge>
                  </div>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-muted">{item.detail}</p>
                </div>
              </article>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Belum tersedia"
              subtitle="Tidak ditampilkan sebagai kontrol aktif"
              action={<LockKeyhole size={15} className="text-muted2" />}
            />
            <div className="divide-y divide-line">
              {pendingControls.map((item) => (
                <div key={item} className="px-4 py-3 text-[11.5px] leading-relaxed text-muted">
                  <div className="mb-1"><Badge tone="warning">Belum diaktifkan</Badge></div>
                  {item}
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Akses modul" />
            <div className="divide-y divide-line">
              <Link href="/app/keuangan/jurnal" className="flex items-center justify-between gap-3 px-4 py-3 text-[11.5px] font-semibold text-ink2 hover:bg-paper">
                Jurnal & persetujuan <ArrowRight size={13} />
              </Link>
              <Link href="/app/keuangan/bagan-akun" className="flex items-center justify-between gap-3 px-4 py-3 text-[11.5px] font-semibold text-ink2 hover:bg-paper">
                Bagan akun <ArrowRight size={13} />
              </Link>
              <Link href="/app/keuangan/neraca-saldo" className="flex items-center justify-between gap-3 px-4 py-3 text-[11.5px] font-semibold text-ink2 hover:bg-paper">
                Neraca saldo <ArrowRight size={13} />
              </Link>
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-4">
        <Notice tone="warning" title="Status implementasi bukan pengesahan kebijakan organisasi">
          Kontrol teknis ini menjaga integritas jurnal. Kontrol tersebut tidak menggantikan keputusan organisasi
          tentang bagan akun final, pengakuan pendapatan/beban, periode fiskal, dana terbatas, perpajakan,
          atau pengesahan laporan.
        </Notice>
      </div>
    </div>
  );
}
