"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Download,
  FileBarChart,
  Printer,
  ShieldCheck,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { canReadSection, type Principal } from "@/lib/permissions";
import { createCSV } from "@/lib/csv";
import { modules, type Row } from "@/lib/srikandi";
import {
  getVisibleReportGroups,
  selectReportRows,
  summarizeReportRows,
  type ReportGroup,
  type ReportGroupId,
} from "@/lib/enterprise-reporting";
import { jakartaDate, taskIsOpen, validDate } from "@/lib/management-insights";
import { buildProgramEvaluations } from "@/lib/program-evaluation";
import CashReports from "./reports";
import { StatusBadge, WorkspaceMetric } from "./workspace-ui";

const kindLabels: Record<string, string> = {
  program: "Program",
  laporan_program: "Laporan program",
  tindaklanjut: "Tugas",
  kegiatan: "Kegiatan",
  musyawarah: "Musyawarah",
  kehadiran: "Kehadiran",
  anggota: "Keanggotaan",
  pengurus: "Pengurus",
  persetujuan: "Persetujuan",
  register: "Register",
  sumber: "Sumber",
  kelembagaan: "Kepatuhan",
  transkripsi: "Verifikasi",
  dokumen: "Dokumen",
  kas: "Buku kas",
  aset: "Aset",
  lotkopi: "Lot",
  usaha: "Kajian usaha",
  kemitraan: "Kemitraan",
  publikasi: "Konten",
  galeri: "Galeri",
};

function rowDate(row: Row) {
  return String(row.data.date || row.data.dueDate || row.created || "—");
}

function attentionCount(group: ReportGroup, rows: Row[]) {
  const today = jakartaDate();
  if (group.id === "keanggotaan") {
    return rows.filter((row) =>
      row.data.verification !== "Terverifikasi" ||
      row.data.consent !== "Terdokumentasi",
    ).length;
  }
  if (group.id === "operasional") {
    return rows.filter((row) => {
      if (row.kind === "laporan_program") {
        return row.data.status === "Terkendala" || Boolean(String(row.data.blockers || "").trim() || String(row.data.supportNeeded || "").trim());
      }
      if (row.kind === "tindaklanjut") {
        return taskIsOpen(row) && validDate(row.data.dueDate) && row.data.dueDate < today;
      }
      return row.kind === "kegiatan" &&
        validDate(row.data.date) &&
        row.data.date < today &&
        !["Selesai", "Ditunda"].includes(String(row.data.status));
    }).length;
  }
  if (group.id === "administrasi") {
    return rows.filter((row) =>
      ["Perlu verifikasi", "Perlu perbaikan", "Perlu pembaruan", "Belum diperiksa"].includes(
        String(row.data.status),
      ),
    ).length;
  }
  if (group.id === "keuangan") {
    return rows.filter((row) => !String(row.data.attachmentId || "").trim()).length;
  }
  if (group.id === "usaha") {
    return rows.filter((row) =>
      ["Perlu perawatan", "Rusak", "Perlu verifikasi", "Menunggu pemeriksaan", "Ditahan", "Ditolak"].includes(
        String(row.data.condition || row.data.status),
      ),
    ).length;
  }
  return rows.filter((row) =>
    row.data.status === "Draf" ||
    (Boolean(row.data.fileId) && row.data.publicationPermission !== "Dikonfirmasi"),
  ).length;
}

function completionCount(group: ReportGroup, rows: Row[]) {
  if (group.id === "keanggotaan") {
    return rows.filter((row) => row.data.status === "Aktif" && row.data.verification === "Terverifikasi").length;
  }
  if (group.id === "publikasi") {
    return rows.filter((row) => row.data.status === "Terbit").length;
  }
  if (group.id === "operasional") {
    return rows.filter((row) => row.kind === "tindaklanjut" && row.data.status === "Selesai").length;
  }
  if (group.id === "usaha") {
    return rows.filter((row) => row.data.status === "Diterima" || row.data.condition === "Baik").length;
  }
  return rows.filter((row) =>
    ["Selesai", "Aktif", "Terverifikasi", "Disahkan internal", "Diterima"].includes(
      String(row.data.status),
    ),
  ).length;
}

function exportRows(group: ReportGroup, rows: Row[]) {
  if (group.id === "keanggotaan") {
    // Never export member names or contact details from the report center.
    const summary = summarizeReportRows(rows);
    const verification = rows.reduce((count, row) => count + Number(row.data.verification === "Terverifikasi"), 0);
    const consent = rows.reduce((count, row) => count + Number(row.data.consent === "Terdokumentasi"), 0);
    return createCSV([
      ["Jenis rekap", "Kategori", "Jumlah"],
      ...summary.map((item) => ["Status keanggotaan", item.status, item.count]),
      ["Verifikasi", "Terverifikasi", verification],
      ["Persetujuan pendataan", "Terdokumentasi", consent],
    ]);
  }
  return createCSV([
    group.id === "operasional"
      ? ["Tanggal / periode", "Modul", "Nama catatan", "Status", "Penanggung jawab", "Jumlah anggota ditandai hadir"]
      : ["Tanggal / periode", "Modul", "Nama catatan", "Status", "Penanggung jawab"],
    ...rows.map((row) => [
      rowDate(row),
      kindLabels[row.kind] || modules[row.kind]?.title || row.kind,
      row.data.name || "—",
      row.data.status || "Belum ditetapkan",
      row.data.pic || "—",
      ...(group.id === "operasional"
        ? [row.kind === "kehadiran" && Array.isArray(row.data.memberIds)
            ? row.data.memberIds.filter((id) => typeof id === "string").length
            : "—"]
        : []),
    ]),
  ]);
}

function ProgramEvaluationPanel({
  rows,
  user,
  month,
}: {
  rows: Row[];
  user: Principal;
  month: string;
}) {
  const evaluations = useMemo(
    () => buildProgramEvaluations(rows, user, month),
    [rows, user, month],
  );
  const reported = evaluations.filter((item) => item.hasReportInPeriod).length;
  const blocked = evaluations.filter((item) => item.blocked).length;
  const tasksWithoutPic = evaluations.reduce((total, item) => total + item.tasksWithoutPic, 0);
  const tasksAwaitingReview = evaluations.reduce((total, item) => total + item.tasksAwaitingVerification, 0);

  return (
    <section className="space-y-3" aria-labelledby="program-evaluation-title">
      <div className="space-y-1">
        <h3 id="program-evaluation-title" className="text-base font-semibold">Evaluasi lintas program</h3>
        <p className="text-sm text-muted-foreground">
          Bandingkan target dan capaian dari laporan yang benar-benar masuk. Tidak ada persentase kemajuan yang dihitung dari uraian bebas.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <WorkspaceMetric title="Program dalam portofolio" value={evaluations.length} note="Daftar program strategis yang dapat diakses." icon={FileBarChart} />
        <WorkspaceMetric title="Ada laporan periode ini" value={reported} note={month ? "Laporan dengan tanggal pada bulan terpilih." : "Program dengan setidaknya satu laporan."} icon={CalendarDays} />
        <WorkspaceMetric title="Program perlu keputusan" value={blocked} note="Berdasarkan status atau kendala laporan terbaru." icon={ShieldCheck} />
        <WorkspaceMetric title="Tugas tanpa PIC" value={tasksWithoutPic} note={tasksAwaitingReview + " hasil selesai menunggu verifikasi."} icon={FileBarChart} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Perbandingan target, capaian, dan pelaksanaan</CardTitle>
          <CardDescription>
            Periode {month || "seluruh periode"}. Laporan terdahulu tetap ditampilkan sebagai pembanding; ketiadaan laporan bukan bukti bahwa program berhenti.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Program</TableHead>
                  <TableHead>Status laporan</TableHead>
                  <TableHead>Target periode</TableHead>
                  <TableHead>Capaian / realisasi</TableHead>
                  <TableHead>Perhatian tugas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {evaluations.map((item) => (
                  <TableRow key={item.programId}>
                    <TableCell className="min-w-56 align-top">
                      <div className="space-y-1">
                        <p className="font-medium">{item.programId}. {item.programName}</p>
                        <p className="text-xs text-muted-foreground">{item.goal}</p>
                        {item.latest ? (
                          <Link className="text-xs text-primary hover:underline" href={"/dashboard/laporan_program?cari=" + encodeURIComponent(String(item.latest.data.name || ""))}>
                            Buka laporan terakhir
                          </Link>
                        ) : (
                          <Link className="text-xs text-primary hover:underline" href="/dashboard/laporan_program">Buka laporan program</Link>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="min-w-48 align-top">
                      <div className="space-y-1">
                        <StatusBadge value={item.latest ? String(item.latest.data.status || "Belum ditetapkan") : "Belum ada laporan"} />
                        <p className="text-xs text-muted-foreground">
                          {item.latest ? String(item.latest.data.date || item.latest.created).slice(0, 10) : "Belum ada tanggal laporan"}
                        </p>
                        {month && !item.hasReportInPeriod && (
                          <p className="text-xs text-amber-700 dark:text-amber-400">Belum ada laporan pada periode terpilih</p>
                        )}
                        {item.unchangedProgress && (
                          <p className="text-xs text-amber-700 dark:text-amber-400">Uraian sama dengan laporan sebelumnya</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="min-w-56 align-top">
                      <p className="whitespace-pre-wrap text-sm">{item.target || "Target periode belum dicatat."}</p>
                    </TableCell>
                    <TableCell className="min-w-56 align-top">
                      <p className="whitespace-pre-wrap text-sm">{item.achievement || "Capaian belum dicatat."}</p>
                      {item.latest?.data.evaluation && (
                        <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">Evaluasi: {String(item.latest.data.evaluation)}</p>
                      )}
                    </TableCell>
                    <TableCell className="min-w-40 align-top">
                      <div className="space-y-1 text-sm">
                        <p>{item.openTasks.length} tugas terbuka</p>
                        {item.tasksWithoutPic > 0 && <p className="text-amber-700 dark:text-amber-400">{item.tasksWithoutPic} tanpa PIC</p>}
                        {item.tasksWithoutDueDate > 0 && <p className="text-muted-foreground">{item.tasksWithoutDueDate} tanpa tenggat</p>}
                        {item.tasksAwaitingVerification > 0 && <p>{item.tasksAwaitingVerification} menunggu verifikasi</p>}
                        {item.tasksNeedingCorrection > 0 && <p className="text-destructive">{item.tasksNeedingCorrection} perlu perbaikan</p>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function ReportTable({ group, rows }: { group: ReportGroup; rows: Row[] }) {
  if (group.id === "operasional") {
    const events = rows.filter((row) => row.kind === "kegiatan");
    const attendance = rows.filter((row) => row.kind === "kehadiran");
    const markedPresent = attendance.reduce((total, row) =>
      total + (Array.isArray(row.data.memberIds)
        ? row.data.memberIds.filter((id) => typeof id === "string").length
        : 0), 0);
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <WorkspaceMetric title="Kegiatan tercatat" value={events.length} note="Kegiatan dalam cakupan dan periode laporan." icon={CalendarDays} />
          <WorkspaceMetric title="Daftar hadir tersimpan" value={attendance.length} note="Kegiatan dengan catatan kehadiran tersimpan." icon={ShieldCheck} />
          <WorkspaceMetric title="Anggota ditandai hadir" value={markedPresent} note="Jumlah tanda hadir, bukan jumlah undangan atau seluruh anggota." icon={FileBarChart} />
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rincian program dan kegiatan</CardTitle>
            <CardDescription>Rekap menggunakan catatan kegiatan, tugas, rapat, dan daftar hadir yang dapat diakses. Nama anggota tidak ditampilkan dalam ringkasan kehadiran.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Tanggal / periode</TableHead><TableHead>Modul</TableHead><TableHead>Catatan</TableHead><TableHead>Status</TableHead><TableHead>Penanggung jawab</TableHead></TableRow></TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="whitespace-nowrap text-sm">{rowDate(row)}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{kindLabels[row.kind] || modules[row.kind]?.title || row.kind}</TableCell>
                      <TableCell className="min-w-48 font-medium"><Link className="hover:text-primary hover:underline" href={"/dashboard/" + row.kind + "?cari=" + encodeURIComponent(String(row.data.name || ""))}>{String(row.data.name || "Catatan tanpa judul")}</Link></TableCell>
                      <TableCell><StatusBadge value={row.data.status || "Tercatat"} /></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{String(row.data.pic || "—")}</TableCell>
                    </TableRow>
                  ))}
                  {!rows.length && <TableRow><TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">Tidak ada catatan yang cocok dengan periode ini.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  if (group.id === "keanggotaan") {
    const statuses = summarizeReportRows(rows);
    const verified = rows.filter((row) => row.data.verification === "Terverifikasi").length;
    const consented = rows.filter((row) => row.data.consent === "Terdokumentasi").length;
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <WorkspaceMetric title="Catatan anggota dalam cakupan" value={rows.length} note="Jumlah catatan yang boleh diakses." icon={ShieldCheck} />
          <WorkspaceMetric title="Terverifikasi" value={verified} note="Identitas dengan status terverifikasi." icon={ShieldCheck} />
          <WorkspaceMetric title="Persetujuan tercatat" value={consented} note="Persetujuan pendataan berstatus terdokumentasi." icon={FileBarChart} />
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rekap status keanggotaan</CardTitle>
            <CardDescription>Hanya agregat yang ditampilkan. Nama, nomor kontak, dan data pribadi anggota tidak dimasukkan ke tabel/ekspor laporan.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Status</TableHead><TableHead className="text-right">Jumlah catatan</TableHead></TableRow></TableHeader>
              <TableBody>
                {statuses.map((item) => (
                  <TableRow key={item.status}><TableCell><StatusBadge value={item.status} /></TableCell><TableCell className="text-right tabular-nums">{item.count}</TableCell></TableRow>
                ))}
                {!statuses.length && <TableRow><TableCell colSpan={2} className="py-8 text-center text-muted-foreground">Belum ada catatan pada periode ini.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Rincian {group.label.toLocaleLowerCase("id-ID")}</CardTitle>
        <CardDescription>{rows.length} catatan dalam cakupan hak akses dan periode yang dipilih. Rincian mengikuti pembatasan data per pengguna.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal / periode</TableHead>
                <TableHead>Modul</TableHead>
                <TableHead>Catatan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Penanggung jawab</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-nowrap text-sm">{rowDate(row)}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm">{kindLabels[row.kind] || modules[row.kind]?.title || row.kind}</TableCell>
                  <TableCell className="min-w-48 font-medium">
                    <Link className="hover:text-primary hover:underline" href={"/dashboard/" + row.kind + "?cari=" + encodeURIComponent(String(row.data.name || ""))}>
                      {String(row.data.name || "Catatan tanpa judul")}
                    </Link>
                  </TableCell>
                  <TableCell><StatusBadge value={row.data.status || "Belum ditetapkan"} /></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{String(row.data.pic || "—")}</TableCell>
                </TableRow>
              ))}
              {!rows.length && (
                <TableRow><TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">Tidak ada catatan yang cocok dengan periode ini.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export default function EnterpriseReports({
  rows,
  user,
}: {
  rows: Row[];
  user: Principal;
}) {
  const groups = useMemo(() => getVisibleReportGroups(user), [user]);
  const [active, setActive] = useState<ReportGroupId>("operasional");
  const [month, setMonth] = useState("");
  const currentGroup = groups.find((group) => group.id === active) || groups[0];
  const reportRows = useMemo(
    () => currentGroup ? selectReportRows(rows, user, currentGroup.id, month) : [],
    [rows, user, currentGroup, month],
  );
  const groupRows = useMemo(
    () => new Map(groups.map((group) => [
      group.id,
      selectReportRows(rows, user, group.id, month),
    ])),
    [groups, rows, user, month],
  );

  function download() {
    if (!currentGroup || currentGroup.id === "keuangan") return;
    const csv = exportRows(currentGroup, reportRows);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    try {
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "laporan-" + currentGroup.id + (month ? "-" + month : "") + ".csv";
      anchor.click();
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  if (!currentGroup) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Belum ada jenis laporan yang tersedia dalam hak akses akun ini.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="workspace-page min-w-0">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Pusat pelaporan</p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Laporan</h1>
          <Badge variant="outline">{groups.length} kelompok laporan tersedia</Badge>
        </div>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          Rekap berdasarkan catatan aplikasi yang tersimpan. Cakupan laporan mengikuti peran, kepemilikan data, dan penugasan pengguna.
        </p>
      </header>

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 space-y-1">
            <label htmlFor="report-period" className="text-xs font-medium">Periode laporan</label>
            <Input id="report-period" type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="w-full sm:w-56" />
            <p className="text-xs text-muted-foreground">{month ? "Menampilkan catatan yang tanggal/periodenya sesuai bulan terpilih." : "Semua periode · tanggal mengikuti tanggal catatan atau tenggat yang tersedia."}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {month && <Button variant="outline" onClick={() => setMonth("")}>Semua periode</Button>}
            <Button variant="outline" onClick={() => window.print()}>
              <Printer data-icon="inline-start" />
              Cetak
            </Button>
            {currentGroup.id !== "keuangan" && (
              <Button onClick={download} disabled={!reportRows.length}>
                <Download data-icon="inline-start" />
                Ekspor CSV
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <WorkspaceMetric title="Catatan terpilih" value={reportRows.length} note="Jumlah catatan pada kelompok laporan aktif." icon={FileBarChart} />
        <WorkspaceMetric title="Selesai / terverifikasi" value={completionCount(currentGroup, reportRows)} note="Status keberhasilan sesuai jenis laporan." icon={ShieldCheck} />
        <WorkspaceMetric title="Perlu perhatian" value={attentionCount(currentGroup, reportRows)} note="Penanda tindak lanjut berdasarkan status dan tenggat yang tercatat." icon={CalendarDays} />
      </div>

      <Tabs value={currentGroup.id} onValueChange={(value) => setActive(value as ReportGroupId)} className="min-w-0 gap-4">
        <div className="overflow-x-auto pb-1">
          <TabsList variant="line" aria-label="Kelompok laporan" className="h-auto min-h-10">
            {groups.map((group) => <TabsTrigger key={group.id} value={group.id}>{group.label}</TabsTrigger>)}
          </TabsList>
        </div>
        {groups.map((group) => {
          const data = groupRows.get(group.id) || [];
          return (
            <TabsContent key={group.id} value={group.id} className="space-y-4">
              <div>
                <h2 className="font-semibold">{group.label}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{group.description}</p>
              </div>
              {group.id === "keuangan" ? (
                <>
                  {canReadSection(user, "kas") && <CashReports rows={rows} />}
                  <Alert>
                    <AlertTitle>Batas konsolidasi keuangan</AlertTitle>
                    <AlertDescription>
                      Laporan ini memakai Buku Kas. Jurnal pada Akuntansi dan Buku Besar belum dikonsolidasikan otomatis dengan Buku Kas, sehingga keduanya tidak dijumlahkan sebagai satu laporan keuangan.
                    </AlertDescription>
                  </Alert>
                </>
              ) : (
                <>
                  {group.id === "operasional" && <ProgramEvaluationPanel rows={rows} user={user} month={month} />}
                  <ReportTable group={group} rows={data} />
                </>
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Angka laporan merupakan rekap catatan yang tersedia, bukan audit atau pengesahan otomatis. Periksa dokumen sumber, bukti transaksi, dan keputusan organisasi sebelum laporan ditandatangani atau dibagikan ke pihak luar.
      </p>
    </div>
  );
}
