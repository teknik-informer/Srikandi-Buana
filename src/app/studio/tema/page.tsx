import type { Metadata } from "next";
import { Palette, ShieldCheck } from "lucide-react";
import { Badge, Card, CardHeader, PageHeader, ComingSoonBadge } from "@/components/ui";
import { DesignThemeEditor } from "@/components/studio/design-theme-editor";
import { getDesignThemeHistory, getDesignThemeSettings } from "@/lib/design-theme";
import { requireRoles } from "@/lib/session";

export const metadata: Metadata = { title: "Design & Theme Manager" };

export default async function TemaStudio() {
  const identity = await requireRoles(["platform_admin", "organization_admin"]);
  const [theme, history] = await Promise.all([
    getDesignThemeSettings(identity.organizationId),
    getDesignThemeHistory(identity.organizationId),
  ]);

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Design & Theme Manager"
        title="Sistem desain organisasi"
        description="Atur palet, preset, dan karakter komponen untuk seluruh website publik serta ruang kerja Srikandi Buana. Setiap perubahan divalidasi dan tercatat."
        actions={<div className="flex flex-wrap items-center gap-2"><Badge tone="success">Theme Manager aktif</Badge><ComingSoonBadge label="Density per aplikasi" /></div>}
      />
      <Card>
        <CardHeader
          title="Pengelola identitas visual"
          subtitle="Pengaturan organisasi berlaku pada tampilan publik dan seluruh dashboard setelah disimpan."
          action={<Palette size={16} className="text-muted2" />}
        />
        <div className="p-3 sm:p-4">
          <DesignThemeEditor initialTheme={theme} history={history} />
        </div>
      </Card>
      <div className="mt-4 rounded-2xl border border-line bg-white p-4 text-[11px] leading-relaxed text-muted sm:p-5">
        <div className="mb-1 flex items-center gap-2 font-semibold text-ink">
          <ShieldCheck size={14} className="text-success" /> Batas perubahan yang aman
        </div>
        Pengaturan tema hanya mengubah token visual. Hak akses, isi data, pengaturan fitur, serta status keputusan organisasi tidak berubah ketika preset atau warna disunting.
      </div>
    </div>
  );
}
