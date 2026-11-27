import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Network } from "lucide-react";
import {
  Badge, Card, CardHeader, EmptyState, Notice, PageHeader, StatCard,
} from "@/components/ui";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { requireRoles } from "@/lib/session";

export const metadata: Metadata = { title: "Modul & Ekstensi" };

interface FieldApplicationRow {
  field_key: string;
  name: string;
  short_name: string;
  route: string;
  is_enabled: boolean;
  unit_active: boolean | null;
}

function safeErrorType(reason: unknown): string {
  return reason instanceof Error && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(reason.name)
    ? reason.name
    : "UnknownError";
}

export default async function ModulStudio() {
  const identity = await requireRoles(["platform_admin", "organization_admin"]);;
  let fields: FieldApplicationRow[] = [];
  let unavailable = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      SELECT
        application.field_key,
        application.name,
        application.short_name,
        application.route,
        application.is_enabled,
        unit.is_active AS unit_active
      FROM v9.field_applications AS application
      LEFT JOIN v9.organization_units AS unit
        ON unit.id = application.unit_id
        AND unit.organization_id = application.organization_id
      WHERE application.organization_id = ${identity.organizationId}
      ORDER BY application.display_order, application.name
    `;
    fields = rowsFromResult<FieldApplicationRow>(result);
  } catch (reason) {
    unavailable = true;
    console.warn("[module-studio] Registry unavailable", safeErrorType(reason));
  }

  const enabled = fields.filter((field) => field.is_enabled).length;
  const inactiveUnits = fields.filter((field) => field.unit_active === false).length;

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Module & Extension Manager"
        title="Status aplikasi bidang"
        description="Status yang tersedia pada registry saat ini adalah status aplikasi bidang dan unit organisasi. Pengaturan on/off untuk modul anak tidak disimpan atau dikelola dari halaman ini."
        actions={<Link href="/studio/aplikasi" className="sb-btn sb-btn-outline">Application Studio <ArrowRight size={13} /></Link>}
      />

      {unavailable ? (
        <Notice tone="danger" title="Registry modul belum dapat dimuat">
          Status aplikasi tidak diganti dengan sakelar atau daftar modul contoh.
        </Notice>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Aplikasi bidang" value={fields.length} note="Baris registry" tone="info" icon={<Network size={17} />} />
        <StatCard label="Aplikasi aktif" value={enabled} note="field_applications.is_enabled" tone="success" />
        <StatCard label="Unit nonaktif" value={inactiveUnits} note="organization_units.is_active = false" tone="warning" />
      </div>

      <Card className="mt-5">
        <CardHeader title="Status modul tingkat aplikasi" subtitle="Aplikasi dan unit ditampilkan secara terpisah" />
        {fields.length ? (
          <div className="divide-y divide-line">
            {fields.map((field) => (
              <article key={field.field_key} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="text-[12.5px] font-semibold text-ink">{field.name}</div>
                  <div className="mt-0.5 text-[10px] text-muted2">{field.field_key} · {field.short_name}</div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge tone={field.unit_active ? "success" : "warning"}>{field.unit_active ? "Unit aktif" : "Unit nonaktif"}</Badge>
                  <Badge tone={field.is_enabled ? "success" : "warning"}>{field.is_enabled ? "Aplikasi aktif" : "Aplikasi nonaktif"}</Badge>
                  <Link href={field.route} className="ml-1 text-[10.5px] font-semibold text-primary-700">Buka <ArrowRight size={11} className="inline" /></Link>
                </div>
              </article>
            ))}
          </div>
        ) : !unavailable ? (
          <div className="p-4"><EmptyState title="Belum ada aplikasi terdaftar" body="Status modul akan tampil setelah registry bidang dibuat." /></div>
        ) : null}
      </Card>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Notice tone="info" title="Nonaktifkan aplikasi tidak menghapus data">
          Status unit organisasi dan status aplikasi teknis adalah dua hal berbeda. Catatan historis tetap disimpan pada modul domain sesuai kebijakan retensi.
        </Notice>
        <Notice tone="warning" title="Toggle submodul belum tersedia">
          Tidak ada tabel registry untuk sakelar Dashboard, Rencana, Program, Tugas, Dokumen, Anggaran, dan modul turunan. Tidak ada tombol aktif/nonaktif yang akan mengubah tampilan semu tanpa penyimpanan dan audit.
        </Notice>
      </div>
    </div>
  );
}
