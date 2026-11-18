import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  Database,
  FileCheck2,
  Layers3,
  LockKeyhole,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Principal } from "@/lib/permissions";
import {
  buildModuleAccessMatrix,
  coreApplicationModules,
  platformReadinessLabels,
  supportingPlatformModules,
} from "@/features/platform/module-registry";
import { platformApplications } from "@/features/platform/application-registry";
import { WorkspacePageHeader } from "./workspace-ui";
import PlatformModuleAccessManager from "./platform-module-access-manager";

const roles = ["Ketua", "Sekretaris", "Bendahara", "Koordinator", "Anggota", "Administrator Sistem"];

function ReadinessBadge({ value }: { value: keyof typeof platformReadinessLabels }) {
  const variant = value === "preview" ? "default" : value === "partial" ? "secondary" : "outline";
  return <Badge variant={variant}>{platformReadinessLabels[value]}</Badge>;
}

function metricLabel(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}

export default function PlatformModuleCenter({ user }: { user: Principal }) {
  const matrix = buildModuleAccessMatrix();
  const modulesWithRoutes = coreApplicationModules.filter((module) => module.route).length;

  return (
    <main className="workspace-page min-w-0">
      <WorkspacePageHeader
        title="Pusat Modul & Platform"
        eyebrow="PLATFORM CORE · SYSTEM ADMINISTRATION"
        description="Registri aplikasi, status layanan, dan pengaturan akses."
      />

      <PlatformModuleAccessManager />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Ringkasan platform">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Aplikasi utama</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{metricLabel(platformApplications.length)}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">Enam aplikasi dalam satu platform.</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Domain pendukung</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{metricLabel(supportingPlatformModules.length)}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">Layanan lintas aplikasi.</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Satu basis data saat ini</CardDescription>
            <CardTitle className="text-2xl">Neon</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">neondb · skema public dan workspace_v14, plus neon_auth</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Rute aplikasi utama</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{metricLabel(modulesWithRoutes)}/6</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">Rute terdaftar</CardContent>
        </Card>
      </section>

      <section className="space-y-3" aria-labelledby="canonical-applications-title">
        <div>
          <h2 id="canonical-applications-title" className="text-lg font-semibold">Arsitektur aplikasi utama · enam pilar</h2>
          <p className="text-sm text-muted-foreground">Pemetaan enam aplikasi utama dan ruang kerja terkait.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {platformApplications.map((application) => (
            <Card key={application.id} className="min-w-0">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <CardDescription className="text-[10px] font-semibold tracking-[0.12em]">{application.eyebrow}</CardDescription>
                    <CardTitle className="text-base">{application.name}</CardTitle>
                  </div>
                  <Badge variant={application.status === "preview" ? "default" : application.status === "partial" ? "secondary" : "outline"}>
                    {application.status === "preview" ? "Preview" : application.status === "partial" ? "Parsial" : "Fondasi"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm leading-6 text-muted-foreground">{application.description}</p>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Workspace lama yang dipetakan</p>
                  <p className="mt-1 text-xs leading-5">{application.legacyWorkspaces.length ? application.legacyWorkspaces.join(" · ") : "Layanan fondasi platform"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Domain pendukung</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{application.supportingDomains.join(" · ")}</p>
                </div>
                <div className="flex items-center justify-between gap-2 border-t pt-3">
                  <span className="truncate text-xs text-muted-foreground">{application.route}</span>
                  <Link href={application.route} className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary hover:underline">
                    Buka <ArrowUpRight className="size-3.5" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="platform-applications-title">
        <div>
          <h2 id="platform-applications-title" className="text-lg font-semibold">Registri enam aplikasi utama</h2>
          <p className="text-sm text-muted-foreground">Status mengikuti cakupan implementasi saat ini.</p>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {coreApplicationModules.map((module) => (
            <Card key={module.id} className="min-w-0">
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{module.name}</CardTitle>
                    <CardDescription>{module.owner}</CardDescription>
                  </div>
                  <ReadinessBadge value={module.readiness} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Yang sudah tersedia</p>
                  <p className="mt-1 text-sm leading-6">{module.implemented}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Batas implementasi saat ini</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{module.limitation}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Jejak data saat ini · masih dalam satu database</p>
                  <p className="mt-1 break-words text-xs leading-5 text-muted-foreground">{module.sourceFootprint}</p>
                </div>
                <div className="flex items-center justify-between gap-3 border-t pt-3">
                  <span className="text-xs text-muted-foreground">{module.route || "Belum ada route aplikasi"}</span>
                  {module.route && (
                    <Link href={module.route} className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary hover:underline">
                      Buka ruang kerja <ArrowUpRight className="size-3.5" />
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="module-access-title">
        <div>
          <h2 id="module-access-title" className="text-lg font-semibold">Ketersediaan fitur per peran</h2>
          <p className="text-sm text-muted-foreground">Ketersediaan fitur berdasarkan kebijakan akses.</p>
        </div>
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-48">Aplikasi</TableHead>
                  {roles.map((role) => <TableHead key={role} className="min-w-28 text-center">{role}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {matrix.map((row) => (
                  <TableRow key={row.moduleId}>
                    <TableCell className="font-medium">{row.moduleName}</TableCell>
                    {row.access.map((entry) => (
                      <TableCell key={entry.role} className="text-center">
                        {entry.catalogOnly
                          ? <Badge variant="outline">Katalog</Badge>
                          : entry.allowed
                            ? <Badge variant="secondary">Fitur tersedia</Badge>
                            : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <p className="text-xs leading-5 text-muted-foreground">
          Hak akses data mengikuti peran dan ruang lingkup penugasan.
        </p>
      </section>

      <section className="space-y-3" aria-labelledby="support-domains-title">
        <div>
          <h2 id="support-domains-title" className="text-lg font-semibold">Domain dan layanan pendukung</h2>
          <p className="text-sm text-muted-foreground">Layanan yang digunakan bersama oleh aplikasi utama.</p>
        </div>
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-48">Domain</TableHead>
                  <TableHead className="min-w-24">Kesiapan</TableHead>
                  <TableHead className="min-w-48">Pemilik data</TableHead>
                  <TableHead className="min-w-[28rem]">Cakupan dan batasan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {supportingPlatformModules.map((module) => (
                  <TableRow key={module.id}>
                    <TableCell>
                      <div className="font-medium">{module.name}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{module.route || "Belum menjadi ruang kerja mandiri"}</div>
                    </TableCell>
                    <TableCell><ReadinessBadge value={module.readiness} /></TableCell>
                    <TableCell className="text-sm">{module.owner}</TableCell>
                    <TableCell className="min-w-[28rem]">
                      <p className="text-sm">{module.implemented}</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{module.limitation}</p>
                      <p className="mt-2 break-words text-xs leading-5 text-muted-foreground">{module.sourceFootprint}</p>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Database className="size-4 text-primary" /> Batas database aktual</CardTitle>
            <CardDescription>Ringkasan skema Production dari pemeriksaan terakhir.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>Seluruh domain masih berada di satu database PostgreSQL Neon bernama <strong>neondb</strong>. Skema berbeda adalah pemisahan logis, belum database fisik independen.</p>
            <p>Keberadaan tabel domain pada <strong>workspace_v14</strong> belum membuktikan bahwa seluruh workflow memakai tabel tersebut sebagai sumber kebenaran tunggal.</p>
            <p>Production memiliki <strong>workspace_v14.role_grants</strong> untuk peran dan scope organisasi/program. Tabel tersebut bukan grant peluncuran aplikasi. Tabel <strong>platform_modules</strong>, <strong>workspace_module_settings</strong>, <strong>platform_module_access_grants</strong> dan <strong>platform_module_access_audit</strong> baru diterapkan pada database Preview QA melalui migrasi 020; belum ada di Production.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><LockKeyhole className="size-4 text-primary" /> Batas kewenangan sistem</CardTitle>
            <CardDescription>Pengaturan teknis dan kewenangan organisasi.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p><strong>Administrator Sistem</strong> dapat memeriksa registri, status implementasi dan kebijakan akses. Katalog aplikasi tidak memberikan hak membaca atau mengubah data organisasi.</p>
            <p><strong>Hak operasional</strong> tetap berasal dari policy role, permission fitur dan scope record yang diterapkan di server.</p>
            <p><strong>Kontrol akses persisten</strong> kini dapat diuji pada Preview QA. Perubahan Production tetap memerlukan persetujuan migrasi terpisah, pengujian pemulihan, dan rencana rollback.</p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Badge variant="outline"><Activity className="mr-1 size-3" /> Policy server</Badge>
              <Badge variant="outline"><FileCheck2 className="mr-1 size-3" /> Audit perubahan</Badge>
              <Badge variant="outline"><Workflow className="mr-1 size-3" /> Integrasi bertahap</Badge>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
