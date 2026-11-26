import type { Metadata } from "next";
import { Building2, Network } from "lucide-react";
import { Badge, Card, CardHeader, EmptyState, Notice, PageHeader } from "@/components/ui";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { loadPublicData } from "@/lib/public-data";
import { PublicDataUnavailable } from "@/components/public-data-unavailable";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Profil Organisasi",
  description: "Identitas organisasi dan bidang yang terdaftar pada Srikandi Buana.",
};

interface PublicOrganization {
  legal_name: string;
  short_name: string;
  status: string;
  legal_status: string;
  address: string | null;
}
interface PublicField {
  field_key: string;
  name: string;
  short_name: string;
  mandate: string | null;
  unit_name: string | null;
}

export default async function ProfilPage() {
  const loaded = await loadPublicData(
    "public-organization-profile",
    async () => {
      const sql = getV9Sql();
      const [organizationResult, fieldResult] = await Promise.all([
        sql`
          SELECT legal_name, short_name, status, legal_status, address
          FROM v9.organizations
          WHERE slug = 'srikandi-buana'
            AND status = 'active'
          LIMIT 1
        `,
        sql`
          SELECT
            application.field_key,
            application.name,
            application.short_name,
            application.mandate,
            unit.name AS unit_name
          FROM v9.field_applications AS application
          INNER JOIN v9.organizations AS organization
            ON organization.id = application.organization_id
          LEFT JOIN v9.organization_units AS unit
            ON unit.id = application.unit_id
            AND unit.organization_id = application.organization_id
          WHERE organization.slug = 'srikandi-buana'
            AND organization.status = 'active'
            AND application.is_enabled = true
          ORDER BY application.display_order, application.name
        `,
      ]);
      return {
        organization: rowsFromResult<PublicOrganization>(organizationResult)[0] ?? null,
        fields: rowsFromResult<PublicField>(fieldResult),
      };
    },
    { organization: null as PublicOrganization | null, fields: [] as PublicField[] },
  );

  if (loaded.unavailable) {
    return (
      <div className="sb-shell py-12">
        <PageHeader eyebrow="Profil organisasi" title="Tentang Srikandi Buana" description="Informasi kelembagaan yang telah dicatat pada registry organisasi." />
        <PublicDataUnavailable resource="Profil organisasi" retryHref="/profil" />
      </div>
    );
  }

  const { organization, fields } = loaded.data;

  return (
    <div className="sb-shell py-12">
      <PageHeader
        eyebrow="Profil organisasi"
        title={organization?.short_name ?? "Srikandi Buana"}
        description="Identitas organisasi dan mandat bidang ditampilkan berdasarkan registry yang tersimpan. Informasi sejarah, jumlah anggota, dan susunan personal tidak diganti dengan catatan contoh."
      />

      {organization ? (
        <>
          <Card className="mt-6">
            <CardHeader title="Identitas kelembagaan" action={<Badge tone={organization.status === "active" ? "success" : "warning"}>{organization.status}</Badge>} />
            <dl className="divide-y divide-line">
              <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                <dt className="text-[11.5px] text-muted">Nama tercatat</dt>
                <dd className="text-right text-[12.5px] font-semibold text-ink">{organization.legal_name}</dd>
              </div>
              <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                <dt className="text-[11.5px] text-muted">Status hukum</dt>
                <dd className="text-right text-[12px] text-ink2">{organization.legal_status || "Belum tercatat"}</dd>
              </div>
              <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                <dt className="text-[11.5px] text-muted">Alamat pada registry</dt>
                <dd className="max-w-[70%] text-right text-[12px] text-ink2">{organization.address ?? "Belum dicatat"}</dd>
              </div>
            </dl>
          </Card>

          <section className="mt-8">
            <div className="flex items-center gap-2">
              <Network size={17} className="text-muted2" />
              <h2 className="font-display text-[22px] font-semibold text-ink">Bidang terdaftar</h2>
            </div>
            <p className="mt-1 text-[12px] text-muted">Nama dan mandat yang saat ini tercatat pada registry aplikasi bidang.</p>
            {fields.length ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {fields.map((field) => (
                  <Card key={field.field_key} className="p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-[13px] font-semibold text-ink">{field.name}</h3>
                      <Badge tone="success">Terdaftar aktif</Badge>
                    </div>
                    <p className="mt-1 text-[10.5px] text-muted">{field.unit_name ?? field.short_name}</p>
                    {field.mandate ? <p className="mt-3 text-[12px] leading-relaxed text-ink2">{field.mandate}</p> : null}
                  </Card>
                ))}
              </div>
            ) : (
              <div className="mt-4"><EmptyState title="Belum ada bidang aktif yang dipublikasikan" body="Registry organisasi belum menyediakan bidang aktif untuk ditampilkan." /></div>
            )}
          </section>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Notice tone="info" title="Sejarah organisasi">
              Riwayat pembentukan, tonggak kegiatan, dan dokumentasi kelembagaan akan diperbarui setelah catatan serta dokumentasi resmi disetujui untuk publikasi.
            </Notice>
            <Notice tone="warning" title="Struktur pengurus">
              Nama pengurus, masa jabatan, nomor/tanggal keputusan, dan penugasan personal tidak ditampilkan pada halaman ini sampai ada data pengangkatan yang sah dan cakupan publikasinya disetujui.
            </Notice>
          </div>
        </>
      ) : (
        <div className="mt-6">
          <EmptyState icon={<Building2 size={24} />} title="Profil organisasi belum tersedia" body="Tidak ditemukan organisasi aktif dengan identitas publik pada registry." />
        </div>
      )}
    </div>
  );
}
