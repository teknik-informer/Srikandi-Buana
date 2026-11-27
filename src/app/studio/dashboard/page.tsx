import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, ChartNoAxesCombined, LayoutDashboard } from "lucide-react";
import { Card, CardHeader, Notice, PageHeader } from "@/components/ui";

import { requireRoles } from "@/lib/session";

export const metadata: Metadata = { title: "Dashboard Builder" };

const dashboards = [
  { name: "Dashboard Pengurus", audience: "Pengurus harian", href: "/app/pengurus", description: "Ringkasan organisasi, program, keuangan sesuai izin, tugas dan audit." },
  { name: "Dashboard Sekretariat", audience: "Sekretaris dan staf", href: "/app/sekretariat", description: "Surat, dokumen, notulen dan agenda organisasi." },
  { name: "Dashboard Keuangan", audience: "Bendahara dan pemeriksa", href: "/app/keuangan", description: "Jurnal, buku besar, kas/bank dan laporan dari data terposting." },
  { name: "Portal Anggota", audience: "Anggota", href: "/app/anggota", description: "Profil, agenda, tugas dan informasi anggota." },
  { name: "Dashboard Pertanian", audience: "Bidang Pertanian", href: "/app/bidang/pertanian", description: "Lahan, kegiatan, produksi dan catatan lapangan." },
  { name: "Dashboard Pelatihan", audience: "Bidang Pelatihan", href: "/app/bidang/pelatihan", description: "Sesi, pendaftaran, pelaksanaan dan evaluasi pelatihan." },
  { name: "Dashboard Usaha", audience: "Bidang Usaha", href: "/app/bidang/usaha", description: "Produk, persediaan, pesanan dan kemitraan." },
];

export default async function DashboardStudio() {
  await requireRoles(["platform_admin", "organization_admin"]);
  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Dashboard Builder"
        title="Dashboard organisasi"
        description="Halaman dashboard operasional yang sudah terpasang dan dapat dibuka sesuai kewenangan. Pengaturan grid dan widget per peran belum menjadi konfigurasi dinamis yang tersimpan."
      />

      <Card>
        <CardHeader
          title="Dashboard yang tersedia"
          subtitle="Tautan ke halaman aktif, bukan daftar widget contoh"
          action={<ChartNoAxesCombined size={16} className="text-muted2" />}
        />
        <div className="divide-y divide-line">
          {dashboards.map((dashboard) => (
            <Link key={dashboard.href} href={dashboard.href} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-paper">
              <span className="min-w-0">
                <span className="block text-[12px] font-semibold text-ink">{dashboard.name}</span>
                <span className="mt-0.5 block text-[10.5px] text-muted">{dashboard.audience} · {dashboard.description}</span>
              </span>
              <ArrowRight size={13} className="shrink-0 text-muted2" />
            </Link>
          ))}
        </div>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Notice tone="warning" title="Widget registry belum tersedia">
          Belum ada tabel layout dashboard, konfigurasi widget, filter, atau audience per komponen. Tampilan dashboard saat ini dirakit pada halaman domain dan memakai query server sesuai hak akses.
        </Notice>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-[12.5px] font-semibold text-ink">
            <LayoutDashboard size={15} className="text-muted2" />
            Prinsip keamanan dashboard
          </div>
          <p className="mt-2 text-[11.5px] leading-relaxed text-muted">
            Widget keuangan dan data pribadi tidak boleh dibagikan hanya karena sebuah kartu ditambahkan ke layout. Setiap query tetap wajib memeriksa permission dan lingkup organisasi.
          </p>
        </Card>
      </div>
    </div>
  );
}
