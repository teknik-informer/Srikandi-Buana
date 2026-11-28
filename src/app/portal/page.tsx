import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicSiteSettings } from "@/lib/public-site-settings";
import { Building2, ShieldCheck } from "lucide-react";
import { Card, CardHeader, EmptyState, Notice, Badge } from "@/components/ui";
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
  const audience = identity.roleKey === "government_viewer"
    ? { label: "Pemerintah & Dinas", title: "Ruang koordinasi pemerintahan", description: "Akses terbatas untuk pemantauan kelembagaan, data program, dan pelaporan yang telah mendapat persetujuan." }
    : identity.roleKey === "ngo_viewer"
      ? { label: "NGO & Lembaga Pendamping", title: "Ruang kolaborasi program", description: "Ruang kerja bagi lembaga pendamping untuk meninjau capaian, dokumen, serta pelaksanaan program sesuai mandat akses." }
      : { label: "Mitra & Mitra Usaha", title: "Ruang kemitraan organisasi", description: "Akses terukur bagi mitra yang bekerja sama dengan organisasi melalui lingkup data dan masa akses yang disetujui." };

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
      <section className="relative isolate mb-5 overflow-hidden rounded-[22px] bg-[#0d2e1b] shadow-[0_18px_45px_-30px_rgba(8,35,18,.55)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={APP_IDENTITY.portal.image} alt={APP_IDENTITY.portal.imageAlt} className="absolute inset-0 h-full w-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(7,31,17,.97)_0%,rgba(10,43,24,.90)_48%,rgba(11,45,26,.52)_100%)]" aria-hidden />
        <div className="relative grid gap-7 px-5 py-7 sm:px-8 sm:py-9 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-[700px]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/12 px-3 py-1 text-[9.5px] font-bold uppercase tracking-[.16em] text-[#e4f2e6] ring-1 ring-inset ring-white/15">{audience.label}</span>
              <Badge tone="neutral">Akses terbatas</Badge>
            </div>
            <h1 className="mt-4 font-display text-[28px] font-extrabold leading-tight tracking-[-.03em] text-white sm:text-[36px]">{audience.title}</h1>
            <p className="mt-3 max-w-[62ch] text-[12.5px] leading-relaxed text-[#d6e8da] sm:text-[13.5px]">{audience.description}</p>
          </div>
          <div className="grid min-w-[220px] gap-2 rounded-[14px] border border-white/15 bg-[#082315]/45 p-3 text-[10.5px] text-[#e4f2e6] backdrop-blur-sm">
            <div className="flex items-center justify-between gap-3"><span>Instansi / organisasi</span><strong className="text-right">{organization?.short_name ?? "Belum tersedia"}</strong></div>
            <div className="h-px bg-white/15" />
            <div className="flex items-center justify-between gap-3"><span>Jenis akses</span><strong>{identity.role}</strong></div>
            <div className="h-px bg-white/15" />
            <div className="flex items-center justify-between gap-3"><span>Status keamanan</span><strong>Berbasis persetujuan</strong></div>
          </div>
        </div>
        <div className="relative flex flex-wrap gap-x-5 gap-y-2 border-t border-white/15 px-5 py-3 text-[10.5px] font-semibold text-[#e5f1e7] sm:px-8">
          <span>Data sesuai izin</span><span>Lingkup akses tercatat</span><span>Privasi organisasi dijaga</span>
        </div>
      </section>

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
