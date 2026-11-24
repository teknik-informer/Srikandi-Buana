import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ClipboardList, LockKeyhole, Wallet } from "lucide-react";
import { Badge, Card, CardHeader, EmptyState, Notice, PageHeader } from "@/components/ui";
import { requireIdentity } from "@/lib/session";

export const metadata: Metadata = { title: "Anggaran & Dana" };

export default async function AnggaranPage() {
  await requireIdentity("finance:read");

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Keuangan Native"
        title="Anggaran, komitmen & dana"
        description="Ruang kerja perencanaan dana organisasi. Data anggaran operasional belum terhubung ke basis data pada versi ini."
        actions={<Badge tone="warning">Belum diaktifkan</Badge>}
      />

      <div className="mb-4">
        <Notice tone="warning" title="Data anggaran belum tersedia sebagai catatan resmi">
          Versi sebelumnya menampilkan alokasi, sumber dana, status periode, dan pengajuan realisasi dari
          penyimpanan demo di browser. Data tersebut bukan anggaran yang disahkan dan tidak boleh digunakan
          sebagai dasar keputusan, sehingga tidak lagi ditampilkan atau dapat diajukan dari halaman ini.
        </Notice>
      </div>

      <Card>
        <div className="px-5 py-10">
          <EmptyState
            title="Belum ada anggaran yang tercatat"
            body="Belum tersedia sumber data persetujuan anggaran, komitmen belanja, maupun pemetaan realisasi per program dan sumber dana. Halaman ini tidak menampilkan plafon atau sisa anggaran rekaan."
            icon={<ClipboardList size={25} />}
          />
        </div>
      </Card>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Card>
          <CardHeader title="Yang harus tersedia" action={<LockKeyhole size={15} className="text-muted2" />} />
          <div className="space-y-2 px-4 pb-4 text-[11.5px] leading-relaxed text-muted">
            <p>Rencana anggaran yang disahkan, dengan periode, program, akun biaya, sumber dana, plafon, dan penanggung jawab.</p>
            <p>Komitmen dan realisasi belanja harus terhubung pada program serta sumber dana yang sama, dengan status persetujuan dan jejak audit.</p>
            <p>Jurnal realisasi hanya dapat dihitung setelah dimensi anggaran tersebut tersimpan pada transaksi keuangan.</p>
          </div>
        </Card>
        <Card>
          <CardHeader title="Modul keuangan yang sudah tersedia" action={<Wallet size={15} className="text-muted2" />} />
          <div className="divide-y divide-line">
            <Link href="/app/keuangan/jurnal" className="flex items-center justify-between gap-3 px-4 py-3 text-[11.5px] font-semibold text-ink2 hover:bg-paper">
              Jurnal & posting <ArrowRight size={13} />
            </Link>
            <Link href="/app/keuangan/laporan" className="flex items-center justify-between gap-3 px-4 py-3 text-[11.5px] font-semibold text-ink2 hover:bg-paper">
              Laporan keuangan <ArrowRight size={13} />
            </Link>
            <Link href="/app/keuangan/bagan-akun" className="flex items-center justify-between gap-3 px-4 py-3 text-[11.5px] font-semibold text-ink2 hover:bg-paper">
              Bagan akun <ArrowRight size={13} />
            </Link>
          </div>
        </Card>
      </div>

      <div className="mt-4">
        <Notice tone="info" title="Tidak ada perubahan transaksi">
          Halaman ini bersifat informatif dan baca-saja. Tidak membuat alokasi, memindahkan dana, mengirim
          permintaan pencairan, mengubah periode, atau memposting jurnal.
        </Notice>
      </div>
    </div>
  );
}
