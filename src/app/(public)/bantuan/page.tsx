import Link from "next/link";
import type { Metadata } from "next";
import { Card, CardHeader, Notice, Badge } from "@/components/ui";
import { DEMO_ACCOUNTS } from "@/lib/session";
import { BLUEPRINT_VERSION } from "@/config/org";

export const metadata: Metadata = {
  title: "Pusat Bantuan",
  description: "Panduan pengguna per peran untuk lingkungan demo Srikandi Buana V9.1.",
};

export default function BantuanPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="sb-label mb-2">Pusat bantuan</div>
      <h1 className="font-display text-[34px] leading-tight font-semibold text-ink sm:text-[40px]">Panduan per peran.</h1>
      <p className="mt-2 max-w-2xl text-[13.5px] text-muted">
        Lingkungan demo blueprint {BLUEPRINT_VERSION}. Akun demo di bawah dapat dipakai untuk
        menelusuri aplikasi sesuai peran dan cakupan aksesnya.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader title="Akun demo" subtitle="Kata sandi semua akun: demo1234" />
          <div className="divide-y divide-line">
            {DEMO_ACCOUNTS.map((a) => (
              <div key={a.key} className="flex items-center justify-between gap-3 px-5 py-2.5">
                <div className="min-w-0">
                  <div className="text-[12.5px] font-semibold text-ink">{a.label}</div>
                  <div className="truncate font-mono text-[11px] text-muted">{a.email}</div>
                </div>
                <Badge tone="neutral">{a.identity.scope}</Badge>
              </div>
            ))}
          </div>
          <div className="px-5 py-3"><Link href="/masuk" className="sb-btn sb-btn-primary !py-2 text-[12.5px]">Buka halaman masuk</Link></div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Peta cepat aplikasi" />
            <ul className="space-y-2 px-5 py-4 text-[13px]">
              <li><Link href="/app/pengurus" className="font-semibold text-primary-700 hover:underline">Pengurus Harian</Link> — persetujuan, lintas bidang, rapat.</li>
              <li><Link href="/app/sekretariat" className="font-semibold text-primary-700 hover:underline">Sekretariat</Link> — surat, notulen, dokumen.</li>
              <li><Link href="/app/keuangan" className="font-semibold text-primary-700 hover:underline">Keuangan</Link> — COA, jurnal, kas/bank, laporan.</li>
              <li><Link href="/app/bidang/pertanian" className="font-semibold text-primary-700 hover:underline">Bidang Pertanian</Link> — lahan, panen, kunjungan.</li>
              <li><Link href="/app/bidang/pelatihan" className="font-semibold text-primary-700 hover:underline">Bidang Pelatihan</Link> — kelas, peserta, asesmen.</li>
              <li><Link href="/app/bidang/usaha" className="font-semibold text-primary-700 hover:underline">Bidang Usaha</Link> — katalog, pesanan, mitra.</li>
              <li><Link href="/app/bidang/organisasi" className="font-semibold text-primary-700 hover:underline">Bidang Organisasi</Link> — anggota, usulan, partisipasi.</li>
              <li><Link href="/app/anggota" className="font-semibold text-primary-700 hover:underline">Portal Anggota</Link> — profil, agenda, tugas.</li>
              <li><Link href="/app/pos" className="font-semibold text-primary-700 hover:underline">POS</Link> — kasir dan transaksi lapangan.</li>
              <li><Link href="/studio" className="font-semibold text-primary-700 hover:underline">Studio Pengelola</Link> — website, aplikasi, tema.</li>
            </ul>
          </Card>
          <Notice tone="info" title="Batasan demo">
            Data bersifat contoh dan berlabel. Tidak ada data produksi, tidak ada pembayaran nyata,
            dan tidak ada dependensi akuntansi eksternal (Blueprint §33).
          </Notice>
        </div>
      </div>
    </div>
  );
}
