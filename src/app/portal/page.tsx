import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicSiteSettings } from "@/lib/public-site-settings";
import { Building2, ShieldCheck } from "lucide-react";
import { Card, CardHeader, EmptyState, Notice, Badge } from "@/components/ui";
import { AppBanner } from "@/components/dash-kit";
import { APP_IDENTITY } from "@/config/app-identity";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { requireRoles } from "@/lib/session";

export const metadata: Metadata = { title: "Portal Eksternal", robots: { index: false } };

interface OrganizationLabel {
  legal_name: string;
  short_name: string;
}

export default async function PortalEksternal() {
  const identity = await requireRoles([
    "platform_admin",
    "organization_admin",
    "chair",
    "government_viewer",
    "ngo_viewer",
    "partner_viewer",
  ]);
  const siteSettings = await getPublicSiteSettings();
  if (!siteSettings.features.externalPortal) notFound();

  let organization: OrganizationLabel | null = null;
  let organizationUnavailable = false;
  try {
    const sql = getV9Sql();
    organization = rowsFromResult<OrganizationLabel>(await sql`
      SELECT legal_name, short_name
      FROM v9.organizations
      WHERE id = ${identity.organizationId}
        AND status = 'active'
      LIMIT 1
    `)[0] ?? null;
  } catch (reason) {
    organizationUnavailable = true;
    console.warn("[external-portal-organization] Source unavailable", reason instanceof Error ? reason.name : "UnknownError");
  }

  return (
    <div className="sb-shell py-10">
      <AppBanner
        {...APP_IDENTITY.portal}
        badge={<Badge tone="neutral">Akses terbatas</Badge>}
        lead="Portal ini hanya menampilkan dataset yang memiliki persetujuan berbagi, penerima, tujuan penggunaan, dan masa akses yang tercatat."
        facts={[
          organizationUnavailable
            ? "Identitas organisasi belum dapat diverifikasi"
            : organization?.short_name ?? "Srikandi Buana",
          "Akses mengikuti peran akun",
          "Data dibatasi oleh persetujuan berbagi",
        ]}
      />

      {organizationUnavailable ? (
        <Notice tone="danger" title="Registry organisasi belum dapat dimuat">
          Identitas organisasi tidak dapat diverifikasi. Tidak ada dataset yang ditampilkan.
        </Notice>
      ) : (
        <div className="mt-5 grid gap-4 lg:grid-cols-[1.25fr_1fr]">
          <Card>
            <CardHeader
              title="Dataset yang dibagikan"
              subtitle="Hanya data dengan grant aktif dan cakupan penerima yang sesuai"
              action={<ShieldCheck size={17} className="text-muted2" />}
            />
            <div className="p-5">
              <EmptyState
                title="Belum ada dataset berbagi yang diaktifkan"
                body="Registri grant berbagi data, persetujuan, tujuan penggunaan, dan masa berlaku belum tersedia pada skema operasional saat ini. Karena itu, daftar program, capaian, dan dokumen tidak ditampilkan di portal ini."
              />
            </div>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader
                title="Identitas penerima"
                subtitle="Akses mengikuti role yang telah ditetapkan untuk akun"
                action={<Building2 size={17} className="text-muted2" />}
              />
              <div className="space-y-2 px-4 py-3">
                <div>
                  <div className="sb-label mb-1">Organisasi</div>
                  <div className="text-[13px] font-semibold text-ink">
                    {organization?.legal_name ?? "Belum tersedia"}
                  </div>
                </div>
                <div>
                  <div className="sb-label mb-1">Jenis akun</div>
                  <div className="text-[12px] text-ink2">{identity.role}</div>
                </div>
              </div>
            </Card>
            <Notice tone="warning" title="Batas akses dan privasi">
              Role viewer bukan grant berbagi data. Portal tidak membuka kas, jurnal, data pribadi anggota, dokumen internal, data program, atau capaian sebelum ada izin dataset yang tercatat dan masih berlaku.
            </Notice>
          </div>
        </div>
      )}
    </div>
  );
}
