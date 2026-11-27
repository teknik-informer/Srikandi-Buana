import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, ToggleLeft, Menu, PanelsTopLeft } from "lucide-react";
import { Badge, Card, CardHeader, PageHeader, StatCard } from "@/components/ui";
import { PublicSiteSettingsEditor } from "@/components/studio/public-site-settings-editor";
import { PublicPoliciesEditor } from "@/components/studio/public-policies-editor";
import { getPublicPolicySettings } from "@/lib/public-policies";
import { getPublicSiteSettings } from "@/lib/public-site-settings";

export const metadata: Metadata = { title: "Website Studio" };

export default async function WebsiteStudio() {
  const [settings, policySettings] = await Promise.all([getPublicSiteSettings(), getPublicPolicySettings()]);
  const activeFeatures = Object.values(settings.features).filter(Boolean).length;
  const menuCount = settings.navigation.groups.filter((group) => group.enabled).length;
  const footerCount = settings.footer.groups.filter((group) => group.enabled).length;

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Website Studio"
        title="Pengaturan situs publik"
        description="Kelola identitas, konten utama, fitur publik, navigasi, footer, dan kanal komunikasi organisasi dari satu tempat."
        actions={<Link href="/" className="sb-btn sb-btn-outline">Lihat website <ArrowUpRight size={13} /></Link>}
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatCard label="Fitur publik aktif" value={activeFeatures} note="Dari seluruh kontrol fitur" tone="success" icon={<ToggleLeft size={16} />} />
        <StatCard label="Kelompok navigasi" value={menuCount} note="Header / mega-menu" tone="info" icon={<Menu size={16} />} />
        <StatCard label="Kelompok footer" value={footerCount} note="Tautan ringkas di footer" tone="neutral" icon={<PanelsTopLeft size={16} />} />
      </div>
      <Card>
        <CardHeader title="Konfigurasi website" subtitle="Perubahan tersimpan bersama untuk organisasi dan dicatat pada jejak audit." action={<Badge tone="success">Database organisasi</Badge>} />
        <div className="p-3 sm:p-4">
          <PublicSiteSettingsEditor initialSettings={settings} />
        </div>
      </Card>
      <Card className="mt-4">
        <CardHeader title="Dokumen & kebijakan utama" subtitle="Kelola legalitas situs, syarat penggunaan, privasi, cookie, keamanan, hak data, publikasi, pengaduan, dan pernyataan layanan." action={<Badge tone="success">Dikelola di Studio</Badge>} />
        <div className="p-3 sm:p-4">
          <PublicPoliciesEditor initialSettings={policySettings} />
        </div>
      </Card>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Card className="p-4">
          <div className="text-[12px] font-semibold text-ink">Kontrol fitur publik</div>
          <p className="mt-1 text-[11px] leading-relaxed text-muted">Fitur publik dapat ditampilkan atau disembunyikan tanpa menghapus data operasional. Pengelolaan produk, transaksi, dan persediaan internal tidak ikut dimatikan oleh sakelar Produk publik.</p>
        </Card>
        <Card className="p-4">
          <div className="text-[12px] font-semibold text-ink">Batas keamanan</div>
          <p className="mt-1 text-[11px] leading-relaxed text-muted">Pengaturan ini hanya mengubah presentasi situs publik dan tautan. Autentikasi, izin pengguna, keuangan, persetujuan, serta audit operasional tetap mengikuti aturan server dan tidak dapat dimatikan dari sini.</p>
        </Card>
      </div>
    </div>
  );
}
