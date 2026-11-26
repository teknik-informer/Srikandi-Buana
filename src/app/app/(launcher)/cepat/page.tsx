import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader, Notice } from "@/components/ui";
import { BuatCepatPanel, type QuickCreateField, type QuickCreateOption } from "./buat-panel";
import { getIdentity, can } from "@/lib/session";
import { canAccessApp } from "@/lib/app-access";
import { getV9Sql, rowsFromResult } from "@/lib/db";

export const metadata: Metadata = { title: "Buat Cepat" };

interface FieldRow {
  field_key: string;
  name: string;
  short_name: string;
  is_enabled: boolean;
}

const FIELD_KEYS = ["organisasi", "pertanian", "pelatihan", "usaha"] as const;
type FieldKey = typeof FIELD_KEYS[number];

const LABELS: Record<FieldKey, string> = {
  organisasi: "Organisasi & Keanggotaan",
  pertanian: "Pertanian & Produksi",
  pelatihan: "Pemberdayaan & Pelatihan",
  usaha: "Usaha & Kemitraan",
};

export default async function CepatPage({
  searchParams,
}: {
  searchParams: Promise<{ buat?: string }>;
}) {
  const identity = await getIdentity();
  if (!identity) redirect("/masuk");

  const canReadOrganization = can(identity, "organization:read");
  const fieldScope = identity.field && can(identity, `field:${identity.field}:read`)
    ? identity.field
    : null;

  let fieldRows: FieldRow[] = [];
  let registryUnavailable = false;
  if (canReadOrganization || fieldScope) {
    try {
      const sql = getV9Sql();
      fieldRows = rowsFromResult<FieldRow>(await sql`
        SELECT field_key, name, short_name, is_enabled
        FROM v9.field_applications
        WHERE organization_id = ${identity.organizationId}
          AND is_enabled = true
          AND (${canReadOrganization} = true OR field_key = ${fieldScope})
        ORDER BY display_order, name
      `).filter((row) => FIELD_KEYS.includes(row.field_key as FieldKey));
    } catch (error) {
      registryUnavailable = true;
      console.warn(
        "[quick-create] Field registry unavailable",
        error instanceof Error && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(error.name) ? error.name : "UnknownError",
      );
    }
  }

  const fields: QuickCreateField[] = fieldRows
    .filter((field) => canAccessApp(identity, field.field_key as FieldKey))
    .map((field) => ({
      slug: field.field_key,
      label: field.short_name || field.name || LABELS[field.field_key as FieldKey],
      canActivity: can(identity, `field:${field.field_key}:activity:write`),
      canProgram: can(identity, `field:${field.field_key}:program:write`),
      canTask: can(identity, `field:${field.field_key}:task:write`),
    }));

  const options: QuickCreateOption[] = [];
  if (canReadOrganization || can(identity, "field:organisasi:review")) {
    options.push({
      kind: "anggota",
      label: "Pengajuan anggota",
      description: "Catat minat bergabung untuk ditinjau; bukan aktivasi anggota atau akun login.",
    });
  }
  if (
    fieldRows.some((field) => field.field_key === "pertanian") &&
    can(identity, "field:pertanian:manage") &&
    can(identity, "field:pertanian:data:write")
  ) {
    options.push({
      kind: "lahan",
      label: "Petak lahan",
      description: "Catat petak garapan, pemilik, komoditas, dan luas secara terstruktur.",
    });
  }
  if (fields.some((field) => field.canActivity)) {
    options.push({
      kind: "agenda",
      label: "Agenda kegiatan",
      description: "Jadwalkan kegiatan bidang; catatan masuk ke kalender dan data bidang.",
    });
  }
  if (can(identity, "secretariat:letters:write")) {
    options.push({
      kind: "surat",
      label: "Registrasi surat",
      description: "Catat surat masuk atau keluar; nomor registrasi internal dibuat sistem.",
    });
  }
  if (fields.some((field) => field.canProgram)) {
    options.push({
      kind: "program",
      label: "Program kerja",
      description: "Catat program, tujuan, periode, dan usulan anggaran pada bidang terkait.",
    });
  }
  if (fields.some((field) => field.canTask)) {
    options.push({
      kind: "tugas",
      label: "Tugas",
      description: "Tugaskan pekerjaan dengan penanggung jawab, tenggat, dan prioritas.",
    });
  }

  const requested = (await searchParams).buat;
  const initialKind = options.some((option) => option.kind === requested)
    ? requested as QuickCreateOption["kind"]
    : undefined;

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Workspace"
        title="Buat"
        description="Pilih catatan yang akan dibuat. Setiap formulir menyimpan ke data organisasi melalui layanan server dan mengikuti hak akses akun Anda."
      />
      {registryUnavailable ? (
        <div className="mb-4">
          <Notice tone="warning" title="Registry bidang belum dapat dimuat">
            Formulir bidang disembunyikan sementara. Coba muat ulang setelah layanan data tersedia.
          </Notice>
        </div>
      ) : null}
      <div className="mb-4">
        <Notice tone="info" title="Data tersimpan pada sumber resmi">
          Pencatatan bidang, sekretariat, dan pengajuan anggota disimpan pada database organisasi. Pengajuan anggota tetap menunggu proses verifikasi dan tidak otomatis menjadi akun aktif.
        </Notice>
      </div>
      <BuatCepatPanel options={options} fields={fields} initialKind={initialKind} />
    </div>
  );
}
