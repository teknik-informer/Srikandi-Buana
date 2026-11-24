import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Building2, Network, ShieldCheck } from "lucide-react";
import {
  Badge, Card, CardHeader, EmptyState, Notice, PageHeader, StatCard,
} from "@/components/ui";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { requireIdentity } from "@/lib/session";

export const metadata: Metadata = { title: "Pengaturan Organisasi" };

interface OrganizationRow {
  legal_name: string;
  short_name: string;
  status: string;
  legal_status: string;
  address: string | null;
}
interface FieldRow {
  field_key: string;
  name: string;
  short_name: string;
  route: string;
  mandate: string | null;
  is_enabled: boolean;
  unit_name: string | null;
}

function safeErrorType(reason: unknown): string {
  return reason instanceof Error && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(reason.name)
    ? reason.name
    : "UnknownError";
}

export default async function PengaturanOrganisasiPage() {
  const identity = await requireIdentity("organization:read");
  let organization: OrganizationRow | null = null;
  let fields: FieldRow[] = [];
  let unavailable = false;

  try {
    const sql = getV9Sql();
    const [organizationResult, fieldResult] = await Promise.all([
      sql`
        SELECT legal_name, short_name, status, legal_status, address
        FROM v9.organizations
        WHERE id = ${identity.organizationId}
        LIMIT 1
      `,
      sql`
        SELECT
          application.field_key,
          application.name,
          application.short_name,
          application.route,
          application.mandate,
          application.is_enabled,
          unit.name AS unit_name
        FROM v9.field_applications AS application
        LEFT JOIN v9.organization_units AS unit
          ON unit.id = application.unit_id
          AND unit.organization_id = application.organization_id
        WHERE application.organization_id = ${identity.organizationId}
        ORDER BY application.display_order, application.name
      `,
    ]);
    organization = rowsFromResult<OrganizationRow>(organizationResult)[0] ?? null;
    fields = rowsFromResult<FieldRow>(fieldResult);
  } catch (reason) {
    unavailable = true;
    console.warn("[pengurus-settings] Registry unavailable", safeErrorType(reason));
  }

  const enabledFields = fields.filter((field) => field.is_enabled).length;

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Pengurus Harian"
        title="Pengaturan organisasi"
        description="Identitas yang tercatat pada registry organisasi, status aplikasi bidang, dan batas kebijakan yang belum memiliki modul pencatatan tersendiri."
        actions={<Link href="/studio/organisasi" className="sb-btn sb-btn-outline">Organization Studio <ArrowRight size={13} /></Link>}
      />

      {unavailable ? (
        <div className="mb-4">
          <Notice tone="danger" title="Registry organisasi belum dapat dimuat">
            Data identitas dan aplikasi bidang disembunyikan sampai koneksi database pulih. Nilai dari konfigurasi atau data demo tidak ditampilkan sebagai catatan resmi.
          </Notice>
        </div>
      ) : null}

      {!unavailable && !organization ? (
        <div className="mb-4">
          <Notice tone="warning" title="Organisasi belum ditemukan">
            Tidak ada record organisasi yang terhubung dengan akun ini.
          </Notice>
        </div>
      ) : null}

      {organization ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Aplikasi bidang terdaftar" value={fields.length} note="Registry organisasi" tone="info" icon={<Network size={17} />} />
            <StatCard label="Aplikasi aktif" value={enabledFields} note="Diaktifkan pada registry" tone="success" icon={<ShieldCheck size={17} />} />
            <StatCard label="Aplikasi nonaktif" value={fields.length - enabledFields} note="Belum atau tidak diaktifkan" tone="warning" icon={<Network size={17} />} />
            <StatCard label="Status organisasi" value={organization.status} note={organization.legal_status} tone={organization.status === "active" ? "success" : "neutral"} icon={<Building2 size={17} />} />
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Identitas organisasi" subtitle="Dibaca langsung dari registry organisasi" />
              <dl className="divide-y divide-line">
                {[
                  ["Nama legal", organization.legal_name],
                  ["Nama singkat", organization.short_name],
                  ["Alamat sekretariat", organization.address ?? "Belum tercatat pada registry"],
                  ["Status organisasi", organization.status],
                  ["Status hukum", organization.legal_status || "Belum tercatat"],
                  ["Tahun berdiri", "Belum tersedia pada skema registry"],
                  ["Email / telepon resmi", "Belum tersedia pada skema registry"],
                  ["Jam layanan", "Belum tersedia pada skema registry"],
                ].map(([label, value]) => (
                  <div key={label} className="flex flex-wrap items-start justify-between gap-2 px-4 py-3">
                    <dt className="text-[11.5px] text-muted">{label}</dt>
                    <dd className="max-w-[65%] text-right text-[12px] font-medium text-ink">{value}</dd>
                  </div>
                ))}
              </dl>
            </Card>

            <Card>
              <CardHeader title="Kebijakan organisasi" subtitle="Belum ada formulir kebijakan dan alur pengesahan khusus pada platform" />
              <div className="divide-y divide-line">
                {[
                  ["Kebijakan iuran anggota", "Belum tersedia pada modul kebijakan"],
                  ["Masa bakti kepengurusan", "Belum tercatat sebagai periode organisasi"],
                  ["Hak suara dan kuorum", "Belum tersedia pada modul kebijakan"],
                  ["Kebijakan akuntansi", "Menunggu pengesahan organisasi"],
                  ["Format laporan resmi", "Belum ditetapkan"],
                  ["Ambang persetujuan keuangan", "Belum dikonfigurasi melalui keputusan resmi"],
                ].map(([label, value]) => (
                  <div key={label} className="flex flex-wrap items-start justify-between gap-2 px-4 py-3">
                    <span className="text-[11.5px] text-muted">{label}</span>
                    <Badge tone="warning">{value}</Badge>
                  </div>
                ))}
              </div>
              <div className="border-t border-line px-4 py-3">
                <Notice tone="info">
                  Sistem tidak membuat nominal iuran, aturan suara, masa jabatan, atau ambang persetujuan tanpa keputusan organisasi yang tercatat.
                </Notice>
              </div>
            </Card>
          </div>

          <Card className="mt-5">
            <CardHeader
              title="Registry bidang resmi"
              subtitle={fields.length + " aplikasi bidang tersimpan pada organisasi"}
              action={<Badge tone="neutral">Sumber: Neon</Badge>}
            />
            {fields.length ? (
              <div className="divide-y divide-line">
                {fields.map((field) => (
                  <div key={field.field_key} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[12.5px] font-semibold text-ink">{field.name}</span>
                        <Badge tone={field.is_enabled ? "success" : "warning"}>{field.is_enabled ? "Aktif" : "Nonaktif"}</Badge>
                        <Badge tone="neutral">{field.field_key}</Badge>
                      </div>
                      <p className="mt-1 text-[10.5px] text-muted">{field.unit_name ?? field.short_name} · {field.route}</p>
                      {field.mandate ? <p className="mt-1 max-w-3xl text-[10.5px] leading-relaxed text-muted2">{field.mandate}</p> : null}
                    </div>
                    <Link href={field.route} className="shrink-0 text-[10.5px] font-semibold text-primary-700">Buka aplikasi <ArrowRight size={11} className="inline" /></Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4">
                <EmptyState title="Belum ada aplikasi bidang" body="Registry bidang akan tampil setelah dicatat pada organisasi." />
              </div>
            )}
          </Card>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Sumber data platform" subtitle="Batas informasi teknis yang dapat dipastikan" />
              <div className="divide-y divide-line">
                {[
                  ["Penyimpanan operasional", "Database organisasi · Neon"],
                  ["Autentikasi", "Sesi server dan pemeriksaan hak akses"],
                  ["Sumber identitas", "Registry organizations dan organization_units"],
                  ["Sumber bidang", "Registry field_applications"],
                ].map(([label, value]) => (
                  <div key={label} className="flex flex-wrap items-start justify-between gap-2 px-4 py-3">
                    <span className="text-[11.5px] text-muted">{label}</span>
                    <span className="text-right text-[11.5px] font-medium text-ink">{value}</span>
                  </div>
                ))}
              </div>
            </Card>
            <Notice tone="warning" title="Pengaturan bukan pengganti keputusan organisasi">
              Perubahan nama legal, status hukum, unit, mandat, pengangkatan pengurus, role inti, dan kebijakan keuangan harus mengikuti dokumen serta kewenangan resmi. Halaman ini bersifat baca-saja dan tidak menerbitkan perubahan atau SK.
            </Notice>
          </div>
        </>
      ) : null}
    </div>
  );
}
