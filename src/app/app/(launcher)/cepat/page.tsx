import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardHeader, EmptyState, PageHeader, Notice } from "@/components/ui";
import { getIdentity, can } from "@/lib/session";
import { canAccessApp } from "@/lib/app-access";
import { getV9Sql, rowsFromResult } from "@/lib/db";

export const metadata: Metadata = { title: "Pintasan Kerja" };

interface QuickLink {
  label: string;
  href: string;
  note: string;
  group: string;
}

interface FieldShortcutRow {
  field_key: string;
  name: string;
  short_name: string;
  route: string;
  is_enabled: boolean;
}


export default async function CepatPage() {
  const identity = await getIdentity();
  if (!identity) redirect("/masuk");

  const canReadOrganization = can(identity, "organization:read");
  const fieldScope = identity.field && can(identity, "field:" + identity.field + ":read")
    ? identity.field
    : null;
  let fieldRows: FieldShortcutRow[] = [];
  let fieldRegistryUnavailable = false;

  if (canReadOrganization || fieldScope) {
    try {
      const sql = getV9Sql();
      fieldRows = rowsFromResult<FieldShortcutRow>(await sql`
        SELECT field_key, name, short_name, route, is_enabled
        FROM v9.field_applications
        WHERE organization_id = ${identity.organizationId}
          AND is_enabled = true
          AND (${canReadOrganization} = true OR field_key = ${fieldScope})
        ORDER BY display_order, name
      `);
    } catch (reason) {
      fieldRegistryUnavailable = true;
      console.warn("[launcher-quick-links] Field registry unavailable", reason instanceof Error ? reason.name : "UnknownError");
    }
  }

  const knownFieldKeys = new Set(["organisasi", "pertanian", "pelatihan", "usaha"]);
  const fieldLinks = fieldRows.filter((field) =>
    knownFieldKeys.has(field.field_key) &&
    canAccessApp(identity, field.field_key as "organisasi" | "pertanian" | "pelatihan" | "usaha"),
  );

  const actions: QuickLink[] = [
    ...(can(identity, "organization:tasks:write")
      ? [{ label: "Tugas organisasi", href: "/app/pengurus/tugas", note: "Buat dan kelola penugasan organisasi", group: "Pengurus" }]
      : []),
    ...(can(identity, "secretariat:read")
      ? [
          { label: "Register surat", href: "/app/sekretariat/surat", note: "Akses pencatatan surat masuk dan keluar", group: "Sekretariat" },
          { label: "Agenda & rapat", href: "/app/sekretariat/rapat", note: "Akses register rapat dan agenda", group: "Sekretariat" },
        ]
      : []),
    ...(can(identity, "finance:read")
      ? [{ label: "Jurnal keuangan", href: "/app/keuangan/jurnal", note: "Tinjau jurnal dan proses sesuai kewenangan", group: "Keuangan" }]
      : []),
    ...(can(identity, "pos:sell")
      ? [{ label: "Pesanan draf POS", href: "/app/pos", note: "Membuat pesanan draf; pembayaran dan settlement belum aktif", group: "Usaha" }]
      : []),
    ...fieldLinks.map((field) => ({
      label: field.short_name || field.name,
      href: field.route?.startsWith("/app/bidang/") ? field.route : "/app/bidang/" + field.field_key,
      note: "Buka aplikasi bidang terdaftar sesuai lingkup akun",
      group: "Bidang",
    })),
  ];

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Workspace"
        title="Pintasan kerja"
        description="Akses cepat ke modul yang dapat dibuka akun Anda. Pencatatan, validasi, dan persetujuan tetap dilakukan di modul pemilik data."
      />
      {actions.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {actions.map((action) => (
            <Link key={action.href} href={action.href} className="sb-card group p-4 transition hover:-translate-y-0.5 hover:border-primary-300">
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted2">{action.group}</div>
              <div className="mt-1 text-[13px] font-semibold text-ink group-hover:text-primary-800">{action.label}</div>
              <div className="mt-0.5 text-[11px] leading-relaxed text-muted">{action.note}</div>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="p-6">
          <EmptyState title="Belum ada pintasan yang tersedia" body="Aplikasi dan tindakan akan muncul setelah hak akses diberikan oleh pengelola organisasi." />
        </Card>
      )}
      {fieldRegistryUnavailable ? (
        <div className="mt-4">
          <Notice tone="warning" title="Registry bidang belum dapat dimuat">
            Pintasan bidang disembunyikan sampai layanan registry dapat dihubungi.
          </Notice>
        </div>
      ) : null}
      <div className="mt-4">
        <Notice tone="info" title="Tetap mengikuti aturan modul">
          Pintasan tidak melewati pemeriksaan kewenangan, validasi, atau persetujuan. Status transaksi final hanya muncul setelah proses pada modul asal berhasil disimpan.
        </Notice>
      </div>
    </div>
  );
}
