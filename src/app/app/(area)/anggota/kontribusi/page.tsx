import type { Metadata } from "next";
import { Wallet, Info, ShieldCheck } from "lucide-react";
import { requireIdentity } from "@/lib/session";
import { PageHeader, Card, CardHeader, Notice } from "@/components/ui";

export const metadata: Metadata = { title: "Kontribusi Saya" };

export default async function KontribusiPage() {
  await requireIdentity("member:self");

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Portal Anggota"
        title="Kontribusi saya"
        description="Informasi kontribusi anggota akan ditampilkan setelah transaksi keuangan memiliki tautan resmi ke identitas anggota."
      />

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader
            title="Riwayat kontribusi"
            subtitle="Belum ada sumber transaksi anggota yang dapat diverifikasi"
            action={<Wallet size={16} className="text-muted2" />}
          />
          <div className="px-4 py-8 text-center">
            <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-paper text-muted2">
              <Info size={20} />
            </div>
            <h2 className="mt-3 text-[13px] font-semibold text-ink">Riwayat belum tersedia</h2>
            <p className="mx-auto mt-1.5 max-w-md text-[11.5px] leading-5 text-muted">
              Buku besar organisasi sudah memiliki jurnal, tetapi transaksi kontribusi belum ditautkan
              ke akun/keanggotaan secara terstruktur. Karena itu, sistem tidak menampilkan nominal atau
              riwayat perkiraan.
            </p>
          </div>
        </Card>

        <div className="space-y-4">
          <Notice tone="warning" title="Iuran wajib belum ditetapkan">
            Sistem tidak menetapkan sendiri besaran iuran atau kewajiban anggota. Kebijakan dan tanggal
            berlakunya harus diputuskan organisasi terlebih dahulu.
          </Notice>
          <Card>
            <CardHeader title="Pemisahan catatan keuangan" action={<ShieldCheck size={15} className="text-muted2" />} />
            <div className="px-4 py-3 text-[11.5px] leading-5 text-muted">
              Pencatatan transaksi resmi tetap berada pada aplikasi Keuangan. Setelah relasi pembayaran
              anggota, bukti transaksi, dan jurnal disahkan, riwayat pribadi dapat ditampilkan di sini
              tanpa menyalin angka demo atau mengubah buku besar.
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
