import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Network } from "lucide-react";
import {
  Badge, Card, CardHeader, EmptyState, Notice, PageHeader, StatCard,
} from "@/components/ui";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { requireRoles } from "@/lib/session";

export const metadata: Metadata = { title: "Application Studio" };

interface FieldApplicationRow {
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

export default async function AplikasiStudio() {
  const identity = await requireRoles(["platform_admin", "organization_admin"]);
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
        application.mandate,
        application.is_enabled,
        unit.name AS unit_name
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
    console.warn("[application-studio] Registry unavailable", safeErrorType(reason));
  }

  const enabled = fields.filter((field) => field.is_enabled).length;

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Application Studio"
        title="Registry aplikasi bidang"
        description="Status aplikasi bidang berasal dari registry organisasi. Daftar rute aplikasi inti dikelola melalui rilis kode; pembuatan instance, penggandaan template, dan perubahan menu belum tersedia sebagai operasi tersimpan."
        actions={<Link href="/studio/organisasi" className="sb-btn sb-btn-outline">Organization Studio <ArrowRight size={13} /></Link>}
      />

      {unavailable ? (
        <Notice tone="danger" title="Registry aplikasi belum dapat dimuat">
          Data aplikasi hanya ditampilkan dari registry organisasi yang tersimpan.
        </Notice>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Aplikasi bidang terdaftar" value={fields.length} note="Sumber field_applications" tone="info" icon={<Network size={17} />} />
        <StatCard label="Diaktifkan" value={enabled} note="Status aplikasi pada registry" tone="success" />
        <StatCard label="Nonaktif" value={fields.length - enabled} note="Tidak dihitung aktif secara teknis" tone="warning" />
      </div>

      <Card className="mt-5">
        <CardHeader title="Instance aplikasi bidang" subtitle="Data per organisasi · hanya ditampilkan setelah dibaca dari registry" />
        {fields.length ? (
          <div className="divide-y divide-line">
            {fields.map((field) => (
              <article key={field.field_key} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-[12.5px] font-semibold text-ink">{field.name}</h2>
                    <Badge tone={field.is_enabled ? "success" : "warning"}>{field.is_enabled ? "Aktif" : "Nonaktif"}</Badge>
                    <Badge tone="neutral">{field.field_key}</Badge>
                  </div>
                  <p className="mt-1 text-[10.5px] text-muted">{field.unit_name ?? field.short_name} · {field.route}</p>
                  {field.mandate ? <p className="mt-1 max-w-3xl text-[11px] leading-relaxed text-muted2">{field.mandate}</p> : null}
                </div>
                <Link href={field.route} className="shrink-0 text-[10.5px] font-semibold text-primary-700">Buka aplikasi <ArrowRight size={11} className="inline" /></Link>
              </article>
            ))}
          </div>
        ) : !unavailable ? (
          <div className="p-4"><EmptyState title="Belum ada aplikasi bidang" body="Instance bidang akan muncul setelah dicatat pada registry organisasi." /></div>
        ) : null}
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="text-[12.5px] font-semibold text-ink">Aplikasi inti</h2>
          <p className="mt-1 text-[11px] leading-relaxed text-muted">
            Pengurus, Sekretariat, Keuangan, Portal Anggota, POS, dan Portal Eksternal merupakan route aplikasi yang dikelola bersama codebase. Daftar ini tidak mewakili instance yang dapat dibuat atau dihapus dari layar ini.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {[
              ["Pengurus", "/app/pengurus"],
              ["Sekretariat", "/app/sekretariat"],
              ["Keuangan", "/app/keuangan"],
              ["Anggota", "/app/anggota"],
              ["POS", "/app/pos"],
              ["Portal", "/portal"],
            ].map(([name, href]) => (
              <Link key={href} href={href} className="rounded-full border border-line bg-white px-2.5 py-1 text-[10.5px] font-semibold text-ink2 hover:border-primary-300">{name}</Link>
            ))}
          </div>
        </Card>
        <Notice tone="warning" title="Template dan pengaturan instance belum dapat diubah">
          Registry template, cloning aplikasi, susunan menu per instance, serta status modul turunan belum memiliki penyimpanan konfigurasi dan riwayat perubahan pada platform. Studio tidak menampilkan tombol seolah-olah perubahan tersebut sudah tersimpan.
        </Notice>
      </div>
    </div>
  );
}
