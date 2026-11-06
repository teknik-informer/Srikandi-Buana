"use client";
import ImagePicker from "./image-picker";
import { WorkspaceDialogContent as DialogContent } from "./workspace-dialog";
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
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useRecordMutation } from "@/hooks/use-record-mutation";
import { useWorkspaceData } from "@/hooks/use-workspace-data";
import { cn } from "@/lib/cn";
import type { Principal } from "@/lib/permissions";
import {
  dateID,
  missions,
  modules,
  programs,
  rupiah,
  vision,
  type Data,
  type Row,
} from "@/lib/srikandi";
import { canDiscardChanges, markFormSaved } from "@/lib/unsaved-changes";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Download,
  FileText,
  Leaf,
  LogIn,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sprout,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Accounts from "./access/accounts";
import MyAccount from "./access/my-account";
import ManagementDashboard from "./management-dashboard";
import Attendance from "./attendance";
import FileManager from "./file-manager";
import Inbox from "./inbox";
import Reports from "./reports";
import SiteSettingsEditor from "./site-settings-editor";
import SourceReview from "./source-review";
import WorkspaceShell from "./workspace-shell";
import RecordTable from "./record-table";
import {
  WorkspacePageHeader,
  WorkspaceSearch,
  WorkspaceEmptyState,
  StatusBadge,
} from "./workspace-ui";
const href = (id: string) =>
  id === "profil"
    ? "/profil"
    : id === "ringkasan"
      ? "/dashboard"
      : `/dashboard/${id}`;
function FarmArt() {
  return (
    <svg
      className="farm-art"
      viewBox="0 0 440 240"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="285" cy="85" r="64" fill="currentColor" opacity=".07" />
      <circle cx="285" cy="85" r="40" stroke="currentColor" opacity=".12" />
      <path
        d="M0 197Q130 69 274 160T470 157V280H0Z"
        fill="currentColor"
        opacity=".08"
      />
      <path
        d="M62 240Q194 130 440 190M108 250Q237 150 440 213M158 259Q295 178 455 239"
        stroke="currentColor"
        strokeWidth="2"
        opacity=".25"
      />
      <path
        d="M260 200V105M260 159Q220 158 221 123Q258 121 260 159ZM260 139Q295 139 300 102Q263 103 260 139Z"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        d="M200 215V159M200 190Q173 190 175 167Q197 166 200 190ZM200 179Q223 177 227 155Q203 154 200 179Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M322 218V158M322 188Q297 189 295 162Q320 162 322 188ZM322 175Q346 174 347 149Q324 149 322 175Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="365" cy="59" r="4" fill="currentColor" opacity=".5" />
      <path d="M177 63h16m-8-8v16" stroke="currentColor" opacity=".4" />
      <path d="M338 116h12m-6-6v12" stroke="currentColor" opacity=".4" />
    </svg>
  );
}
function NoData({
  title = "Belum ada catatan",
  text = "Mulai dengan menambahkan data pertama kelompok.",
  action,
}: {
  title?: string;
  text?: string;
  action?: () => void;
}) {
  return (
    <WorkspaceEmptyState title={title} description={text}>
      {action && (
        <Button variant="outline" onClick={action}>
          <Plus data-icon="inline-start" />
          Tambah catatan
        </Button>
      )}
    </WorkspaceEmptyState>
  );
}
function Box({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="box-heading">
          <div className="space-y-1">
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {action}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
export default function Workspace({
  section,
  principal,
  defaultSidebarOpen = true,
}: {
  section: string;
  principal: Principal;
  defaultSidebarOpen?: boolean;
}) {
  const router = useRouter();
  const { rows, files, audit, loading, error, unauthorized, load } =
    useWorkspaceData();
  const [page, setPage] = useState(1);
  const imageUploadPending = useRef(false);
  const [imageUploading, setImageUploading] = useState(false);
  function imageBusy(value: boolean) { imageUploadPending.current = value; setImageUploading(value); }
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState("Semua"),
    [month, setMonth] = useState(""),
    [fund, setFund] = useState("Semua pos"),
    [editor, setEditor] = useState<{
      kind: string;
      row?: Row;
      initial?: Data;
    } | null>(null),
    [deleteRow, setDeleteRow] = useState<Row | null>(null),
    [selectedProgram, setSelectedProgram] = useState<string | null>(null),
    [programStatus, setProgramStatus] = useState("Rancangan"),
    [programNotes, setProgramNotes] = useState("");
  useEffect(() => {
    setPage(1);
  }, [query, filter, month, fund, section]);
  useEffect(() => {
    setQuery(
      new URLSearchParams(window.location.search).get("cari")?.slice(0, 200) ||
        "",
    );
    setFilter("Semua");
    setMonth("");
    setFund("Semua pos");
  }, [section]);
  const records = (kind: string) => rows.filter((r) => r.kind === kind);
  const members = records("anggota");
  const events = records("kegiatan");
  const cash = records("kas").filter(
    (r) =>
      section !== "kas" ||
      ((!month || String(r.data.date).startsWith(month)) &&
        (fund === "Semua pos" || r.data.fund === fund)),
  );
  const incoming = cash
    .filter((r) => r.data.type === "Pemasukan")
    .reduce((s, r) => s + Number(r.data.amount), 0);
  const outgoing = cash
    .filter((r) => r.data.type === "Pengeluaran")
    .reduce((s, r) => s + Number(r.data.amount), 0);
  const completed = programs.filter(
    (p) =>
      records("program").find((r) => r.data.programId === p.id)?.data.status ===
      "Selesai",
  ).length;
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Jakarta",
  });
  const upcoming = events
    .filter(
      (r) =>
        String(r.data.date) >= today &&
        !["Selesai", "Ditunda"].includes(String(r.data.status)),
    )
    .sort((a, b) => String(a.data.date).localeCompare(String(b.data.date)));
  const title =
    modules[section]?.title ||
    {
      akun: "Akun & akses",
      "akun-saya": "Akun saya",
      ringkasan: "Ringkasan Operasional",
      program: "Program kerja",
      dokumen: "Arsip dokumen",
      profil: "Profil & arah bersama",
      pesan: "Pesan pengunjung",
      kehadiran: "Kehadiran",
      laporan: "Laporan Kas",
      pengaturan: "Pengaturan situs",
      sumber: "Referensi Dokumen",
      panduan: "Pusat bantuan",
    }[section] ||
    "Halaman tidak ditemukan";
  const {
    busy: saving,
    error: mutationError,
    clearError,
    mutate,
  } = useRecordMutation(load);
  const openEditor = (kind: string, row?: Row, initial?: Data) => {
    if (loading || error) return;
    clearError();
    setEditor({ kind, row, initial });
  };
  async function saveForm(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editor || imageUploadPending.current) return;
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    if (
      await mutate(editor.row ? "PUT" : "POST", {
        kind: editor.kind,
        id: editor.row?.id,
        expectedUpdated: editor.row?.updated,
        data,
      })
    ) {
      markFormSaved(form);
      if (editor.kind === "publikasi" && section === "kegiatan")
        router.push("/dashboard/publikasi");
      setEditor(null);
    }
  }
  async function remove() {
    if (
      deleteRow &&
      (await mutate(
        "DELETE",
        undefined,
        "/api/records?id=" + encodeURIComponent(deleteRow.id),
      ))
    )
      setDeleteRow(null);
  }
  function selectProgram(id: string) {
    if (loading || error) return;
    clearError();
    const r = records("program").find((r) => r.data.programId === id);
    setSelectedProgram(id);
    setProgramStatus(String(r?.data.status || "Rancangan"));
    setProgramNotes(String(r?.data.notes || ""));
  }
  async function saveProgram(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const p = programs.find((p) => p.id === selectedProgram);
    if (!p) return;
    const r = records("program").find((r) => r.data.programId === p.id);
    if (
      await mutate(r ? "PUT" : "POST", {
        id: r?.id,
        expectedUpdated: r?.updated,
        kind: "program",
        data: {
          programId: p.id,
          name: p.name,
          status: programStatus,
          notes: programNotes,
        },
      })
    ) {
      markFormSaved(form);
      setSelectedProgram(null);
    }
  }
  function exportCSV() {
    const data = displayed;
    const fields = modules[section]?.fields;
    if (!fields) return;
    const quote = (x: unknown) =>
      '"' +
      String(x ?? "")
        .replace(/^[=+@\-]/, "'$&")
        .replaceAll('"', '""') +
      '"';
    const csv =
      "\uFEFF" +
      [
        fields.map((f) => quote(f.label)).join(","),
        ...data.map((r) => fields.map((f) => quote(r.data[f.key])).join(",")),
      ].join("\r\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `srikandi-${section}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  const program = programs.find((p) => p.id === selectedProgram);
  const module = modules[section];
  const displayed = records(section).filter(
    (r) =>
      (section !== "kas" ||
        ((!month || String(r.data.date).startsWith(month)) &&
          (fund === "Semua pos" || r.data.fund === fund))) &&
      (filter === "Semua" ||
        r.data.status === filter ||
        r.data.type === filter) &&
      JSON.stringify(r.data).toLowerCase().includes(query.toLowerCase()),
  );
  const totalPages = Math.max(1, Math.ceil(displayed.length / 25));
  const currentPage = Math.min(page, totalPages);
  const statusFields = module?.fields.find(
    (f) => f.key === "status" || f.key === "type",
  )?.options;
  return (
    <WorkspaceShell
      user={principal}
      section={section}
      title={title}
      defaultSidebarOpen={defaultSidebarOpen}
    >
      {" "}
      <section
        className="workspace"
        aria-labelledby="workspace-title"
        aria-busy={loading}
      >
        <WorkspacePageHeader
          eyebrow="KELOMPOK WANITA TANI · NGADIMULYO"
          title={section === "ringkasan" ? "Dashboard organisasi" : title}
          description={
            module?.description ||
            (
              {
                ringkasan:
                  "Ringkasan keanggotaan, program, kegiatan, dan keuangan Srikandi Buana.",
                program:
                  "Sembilan prioritas, satu arah: tumbuh dan berdaya bersama.",
                dokumen:
                  "Simpan pengetahuan, keputusan, dan bukti perjalanan kelompok.",
                profil:
                  "Mengenal fondasi, nilai, dan cita-cita Srikandi Buana.",
                panduan:
                  "Mulai sederhana, catat dengan tertib, berkembang bersama.",
              } as Record<string, string>
            )[section]
          }
          actions={
            <>
              {module ? (
                <>
                  <Button
                    variant="outline"
                    onClick={exportCSV}
                    disabled={loading || !!error}
                  >
                    <Download data-icon="inline-start" />
                    Ekspor CSV
                  </Button>
                  <Button
                    onClick={() => openEditor(section)}
                    disabled={loading || !!error}
                  >
                    <Plus data-icon="inline-start" />
                    Tambah {module.singular}
                  </Button>
                </>
              ) : section === "ringkasan" ? (
                <Button
                  onClick={() => openEditor("kegiatan")}
                  disabled={loading || !!error}
                >
                  <Plus data-icon="inline-start" />
                  Catat kegiatan
                </Button>
              ) : null}
            </>
          }
        />
        {error && (
          <Alert variant="destructive">
            <AlertTitle>
              {unauthorized
                ? "Masuk untuk mengelola data"
                : "Data belum tersedia"}
            </AlertTitle>
            <AlertDescription>
              {error}
              <div className="flex gap-2 mt-3">
                {unauthorized ? (
                  <Button asChild>
                    <a
                      href={`/masuk?return_to=${encodeURIComponent(href(section))}`}
                      target="_top"
                    >
                      <LogIn data-icon="inline-start" />
                      Masuk ke administrasi
                    </a>
                  </Button>
                ) : (
                  <Button variant="outline" onClick={load}>
                    <RefreshCw data-icon="inline-start" />
                    Coba lagi
                  </Button>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}
        {section === "ringkasan" && (
          <ManagementDashboard
            rows={rows}
            files={files}
            user={principal}
            loading={loading}
            error={error}
            onSaved={load}
            audit={audit}
          />
        )}
        {section === "galeri" && (
          <div className="mb-6 space-y-3">
            <Alert>
              <ShieldCheck />
              <AlertTitle>Media privat dan izin publikasi</AlertTitle>
              <AlertDescription>
                Foto di pustaka media hanya dapat dilihat pengelola. Foto baru tampil di situs setelah ditautkan ke Galeri Foto atau konten yang berstatus Terbit, dan izin publikasi fotonya dikonfirmasi.
              </AlertDescription>
            </Alert>
            <FileManager files={files} onChange={load} loading={loading} loadError={error} mode="images" />
          </div>
        )}
        {module && (
          <>
            {section === "kas" && (
              <div className="cash-summary">
                <Box title="Pemasukan">
                  <strong>{rupiah(incoming)}</strong>
                </Box>
                <Box title="Pengeluaran">
                  <strong>{rupiah(outgoing)}</strong>
                </Box>
                <Box title={month ? "Selisih periode" : "Saldo tercatat"}>
                  <strong>{rupiah(incoming - outgoing)}</strong>
                </Box>
              </div>
            )}
            {section === "usaha" && (
              <Alert>
                <Sprout />
                <AlertTitle>
                  KUB dibentuk setelah anggota siap dan sepakat
                </AlertTitle>
                <AlertDescription>
                  Kajian ini belum menjadi komitmen penjualan atau pengelolaan
                  modal. Organisasi, dana program, dan uang usaha harus dicatat
                  terpisah.
                </AlertDescription>
              </Alert>
            )}
            {section === "kas" && (
              <p className="section-note">
                Ringkasan mengikuti bulan dan pos dana yang dipilih. Selisih
                periode adalah pemasukan dikurangi pengeluaran, tanpa saldo
                awal. Catat transaksi nyata beserta dasar persetujuan dan bukti
                pendukungnya.
              </p>
            )}
            <Box
              title={module.title}
              description={
                loading
                  ? "Memuat catatan…"
                  : error
                    ? "Data belum berhasil dimuat"
                    : `${displayed.length} catatan ditemukan`
              }
            >
              <div className="table-tools">
                <WorkspaceSearch
                  label={"Cari " + module.title}
                  placeholder={"Cari " + module.singular + "…"}
                  value={query}
                  onChange={setQuery}
                  className="max-w-md flex-1"
                />
                {statusFields && (
                  <NativeSelect
                    aria-label="Filter status"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  >
                    <NativeSelectOption>Semua</NativeSelectOption>
                    {statusFields.map((s) => (
                      <NativeSelectOption key={s}>{s}</NativeSelectOption>
                    ))}
                  </NativeSelect>
                )}
                {section === "kas" && (
                  <>
                    <Input
                      aria-label="Filter bulan transaksi"
                      type="month"
                      value={month}
                      onChange={(e) => setMonth(e.target.value)}
                      className="w-auto"
                    />
                    <NativeSelect
                      aria-label="Filter pos dana"
                      value={fund}
                      onChange={(e) => setFund(e.target.value)}
                    >
                      {["Semua pos", "Organisasi", "Program", "Usaha"].map(
                        (f) => (
                          <NativeSelectOption key={f}>{f}</NativeSelectOption>
                        ),
                      )}
                    </NativeSelect>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Muat ulang data"
                  onClick={load}
                >
                  <RefreshCw />
                </Button>
              </div>
              {loading ? (
                <Skeleton className="h-48 w-full" />
              ) : error ? (
                <p className="section-note">
                  Daftar catatan belum tersedia. Gunakan Coba lagi pada
                  pemberitahuan di atas.
                </p>
              ) : displayed.length ? (
                <RecordTable
                  label={module.title}
                  rows={displayed.slice(
                    (currentPage - 1) * 25,
                    currentPage * 25,
                  )}
                  fields={module.fields.slice(0, section === "kas" ? 5 : 4)}
                  files={files}
                  onView={(row) => openEditor(section, row)}
                  actions={(r) => (
                    <div className="flex gap-1">
                      {section === "musyawarah" && (
                        <Button asChild variant="outline" size="sm">
                          <Link href={"/dashboard/cetak-notulen/" + encodeURIComponent(r.id)} target="_blank" rel="noopener noreferrer" aria-label={"Cetak notulen " + r.data.name}>
                            <FileText className="size-4" /> Cetak
                          </Link>
                        </Button>
                      )}
                      {r.data.attachmentId && (
                        <Button asChild variant="ghost" size="icon">
                          <a
                            href={"/api/files?id=" + r.data.attachmentId}
                            aria-label={"Unduh lampiran " + r.data.name}
                          >
                            <Download />
                          </a>
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${r.data.name}`}
                        onClick={() => openEditor(section, r)}
                      >
                        <Pencil />
                      </Button>
                      {section === "kegiatan" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Buat draf publikasi ${r.data.name}`}
                          onClick={() =>
                            openEditor("publikasi", undefined, {
                              name: r.data.name,
                              category: "Kegiatan",
                              date: r.data.date,
                              location: r.data.location,
                              status: "Draf",
                              fileId: "",
                              summary: "",
                              notes: "",
                            })
                          }
                        >
                          <FileText />
                        </Button>
                      )}
                      {section === "publikasi" &&
                        r.data.status === "Terbit" && (
                          <Button asChild variant="ghost" size="icon">
                            <a
                              href={"/kabar/" + r.id}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={"Lihat publikasi " + r.data.name}
                            >
                              <ArrowUpRight />
                            </a>
                          </Button>
                        )}
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Hapus ${r.data.name}`}
                        onClick={() => {
                          clearError();
                          setDeleteRow(r);
                        }}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  )}
                />
              ) : (
                <NoData
                  title={
                    query || filter !== "Semua"
                      ? "Tidak ada hasil yang sesuai"
                      : `Belum ada ${module.singular} tercatat`
                  }
                  text={
                    query
                      ? "Coba kata pencarian lain."
                      : "Tambahkan catatan nyata kelompok melalui tombol di bawah."
                  }
                  action={() => openEditor(section)}
                />
              )}
            </Box>
            {displayed.length > 25 && (
              <div className="inbox-pagination">
                <Button
                  variant="outline"
                  disabled={currentPage === 1}
                  onClick={() => setPage(currentPage - 1)}
                >
                  Sebelumnya
                </Button>
                <span>
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage(currentPage + 1)}
                >
                  Berikutnya
                </Button>
              </div>
            )}
          </>
        )}
        {section === "program" && (
          <>
            <Alert>
              <ClipboardList />
              <AlertTitle>Rancangan untuk dimusyawarahkan</AlertTitle>
              <AlertDescription>
                Jadwal menggunakan bulan relatif tahun pertama, bukan tanggal
                pelaksanaan resmi. Perbarui status setelah keputusan atau
                pelaksanaan benar-benar tercatat.
              </AlertDescription>
            </Alert>
            <div className="program-grid">
              {programs.map((p) => (
                <Card key={p.id}>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <span className="program-index">0{p.id}</span>
                      <StatusBadge
                        value={
                          records("program").find(
                            (r) => r.data.programId === p.id,
                          )?.data.status || "Rancangan"
                        }
                      />
                    </div>
                    <CardTitle>{p.name}</CardTitle>
                    <CardDescription>
                      {p.category} · {p.period}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="program-goal">{p.goal}</p>
                    <Button
                      variant="outline"
                      onClick={() => selectProgram(p.id)}
                    >
                      Rincian & perkembangan{" "}
                      <ArrowUpRight data-icon="inline-end" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
        {section === "dokumen" && (
          <>
            <Alert>
              <ShieldCheck />
              <AlertTitle>Arsip terlindungi</AlertTitle>
              <AlertDescription>
                Berkas tersimpan untuk akun pengelola ini. Format PDF, DOCX,
                XLSX, PNG atau JPG; maksimal 3 MB per berkas.
              </AlertDescription>
            </Alert>
            <Box
              title="Dokumen acuan"
              description="Sumber informasi dan arah pengembangan kelompok"
            >
              <div className="document-row">
                <div className="file-icon">
                  <FileText />
                </div>
                <div>
                  <strong>Rancangan KWT Srikandi Buana</strong>
                  <small>Visi, misi, organisasi dan program kerja · DOCX</small>
                </div>
                <Button asChild variant="outline">
                  <a href="/dokumen/Rancangan_KWT_Srikandi_Buana.docx" download>
                    <Download data-icon="inline-start" />
                    Unduh
                  </a>
                </Button>
              </div>
            </Box>
            <FileManager
              files={files}
              onChange={load}
              loading={loading}
              loadError={error}
            />
          </>
        )}
        {section === "profil" && (
          <>
            <section className="welcome-banner profile-banner">
              <div>
                <Badge variant="outline">MENGENAL SRIKANDI BUANA</Badge>
                <h2>
                  Perempuan bertumbuh.
                  <br />
                  Keluarga berdaya.
                </h2>
                <p>
                  Desa Ngadimulyo, Kecamatan Kedu,
                  <br />
                  Kabupaten Temanggung, Jawa Tengah.
                </p>
              </div>
              <FarmArt />
            </section>
            <div className="profile-grid">
              <Box title="Visi yang menyatukan">
                <blockquote>{vision}</blockquote>
                <p className="section-note">
                  Visi ini adalah arah perjuangan melalui proses, kerja sama,
                  dan evaluasi berkelanjutan.
                </p>
              </Box>
              <Box title="Nilai dalam setiap langkah">
                <div className="values">
                  {[
                    "Gotong royong",
                    "Musyawarah",
                    "Keterbukaan",
                    "Kesetaraan",
                    "Tanggung jawab",
                    "Bertahap",
                  ].map((v) => (
                    <span key={v}>
                      <CheckCircle2 size={17} />
                      {v}
                    </span>
                  ))}
                </div>
              </Box>
            </div>
            <Box title="Enam misi, satu semangat">
              <div className="missions">
                {missions.map((m, i) => (
                  <div key={i}>
                    <span className="program-index">0{i + 1}</span>
                    <p>{m}</p>
                  </div>
                ))}
              </div>
            </Box>
            <Box
              title="Struktur yang saling menguatkan"
              description="Rancangan; susunan dan nama pengurus ditetapkan melalui musyawarah"
            >
              <div className="org-chart">
                <div>
                  Musyawarah Anggota<small>Pengambilan keputusan bersama</small>
                </div>
                <ArrowRight />
                <div>
                  Pengurus Harian<small>Ketua · Sekretaris · Bendahara</small>
                </div>
              </div>
              <div className="values">
                {[
                  "Organisasi & Keanggotaan",
                  "Pertanian & Produksi",
                  "Pemberdayaan & Pelatihan",
                  "Usaha & Kemitraan",
                ].map((v) => (
                  <span key={v}>
                    <Leaf size={16} />
                    {v}
                  </span>
                ))}
              </div>
              <p className="section-note">
                Pembina ditambahkan apabila disepakati. Nama pengurus dapat
                dicatat pada data anggota sesuai keputusan kelompok.
              </p>
            </Box>
            <Alert>
              <BookOpen />
              <AlertTitle>Status informasi: rancangan organisasi</AlertTitle>
              <AlertDescription>
                Dokumen acuan belum merupakan pengesahan program. Jumlah
                anggota, produksi, pendapatan dan mitra resmi ditetapkan setelah
                ada data atau kesepakatan yang mendukung.
              </AlertDescription>
            </Alert>
          </>
        )}
        {section === "akun" && <Accounts />}
        {section === "akun-saya" && <MyAccount />}
        {section === "sumber" && (
          <SourceReview refreshKey={rows.length} onImported={load} />
        )}
        {section === "pesan" && <Inbox />}
        {section === "pengaturan" && (
          <SiteSettingsEditor
            files={files}
            onSaved={() => {
              load();
              router.refresh();
            }}
          />
        )}
        {section === "kehadiran" && <Attendance rows={rows} onSaved={load} />}
        {section === "laporan" && !loading && !error && <Reports rows={rows} />}
        {section === "panduan" && (
          <>
            <Box title="Portal & layanan operasional">
              <p>Buka Portal Anggota untuk kebutuhan pribadi. Buat dan simpan draf pengajuan, lengkapi bukti, lalu kirim. Ketua atau administrator lain memeriksa pengajuan; petugas keuangan/aset atau sekretariat mencatat realisasinya. Pengaju tidak dapat menyetujui atau merealisasikan pengajuannya sendiri.</p>
              <p>Persetujuan biaya belum berarti pembayaran. Hubungkan realisasi dengan transaksi Pengeluaran yang nominal dan pos dananya sesuai serta memiliki bukti. Untuk pinjaman, aset dicadangkan saat disetujui dan dilepas setelah pengembalian dicatat.</p>
              <Button variant="outline" asChild><Link href="/dashboard/portal">Buka Portal Anggota</Link></Button>
            </Box>
            <Box title="Mulai dengan empat langkah sederhana">
              <div className="guide-steps">
                {[
                  {
                    title: "Kenali anggota",
                    text: "Catat identitas seperlunya, peran, potensi dan kebutuhan. Jelaskan tujuan pendataan dan minta persetujuan sebelum mencatat informasi pribadi.",
                    id: "anggota",
                  },
                  {
                    title: "Sepakati arah kelompok",
                    text: "Gunakan musyawarah untuk menetapkan pengurus, aturan kerja, pertemuan dan prioritas. Simpan hasil keputusan dan tindak lanjutnya.",
                    id: "musyawarah",
                  },
                  {
                    title: "Catat setiap kegiatan",
                    text: "Lengkapi tanggal, tempat, penanggung jawab, peserta dan hasil. Evaluasi program berdasarkan pekerjaan yang terlaksana.",
                    id: "kegiatan",
                  },
                  {
                    title: "Jaga keterbukaan keuangan",
                    text: "Pisahkan dana organisasi, program dan usaha. Catat penerimaan serta pengeluaran nyata, simpan bukti, dan sampaikan laporan berkala.",
                    id: "kas",
                  },
                ].map((s, i) => (
                  <Link href={href(s.id)} key={s.id}>
                    <span className="program-index">0{i + 1}</span>
                    <div>
                      <h3>{s.title}</h3>
                      <p>{s.text}</p>
                    </div>
                    <ArrowUpRight size={18} />
                  </Link>
                ))}
              </div>
            </Box>
            <Box title="Data & akses">
              <p>
                Ruang kerja ini menggunakan akun email pengelola. Data tersimpan
                pada server organisasi. Hak akses mengikuti akun, peran, dan
                penugasan. Halaman publik dapat diakses tanpa login. Dashboard
                dan data administrasi hanya dapat diakses akun pengelola yang
                terdaftar.
              </p>
              <p className="section-note">
                Ekspor JSON mencakup catatan, pesan, pengaturan, dan metadata
                berkas. Isi lampiran diunduh terpisah dari Arsip dokumen.
                Preferensi tema disimpan pada perangkat.
              </p>
              <div className="flex gap-3 flex-wrap mt-4">
                <Button asChild variant="outline">
                  <a href="/api/export" download>
                    <Download data-icon="inline-start" />
                    Ekspor semua catatan
                  </a>
                </Button>
                <Button asChild variant="outline">
                  <a href="/keluar" target="_top">
                    Keluar akun
                  </a>
                </Button>
              </div>
            </Box>
          </>
        )}
        {!module &&
          ![
            "akun",
            "akun-saya",
            "ringkasan",
            "program",
            "dokumen",
            "profil",
            "panduan",
            "pesan",
            "pengaturan",
            "kehadiran",
            "laporan",
            "sumber",
          ].includes(section) && (
            <NoData
              title="Halaman tidak ditemukan"
              text="Pilih menu di samping untuk kembali ke ruang kerja."
            />
          )}
      </section>
      <Dialog
        open={!!editor}
        onOpenChange={(v) => {
          if (!v && !saving && !imageUploadPending.current && canDiscardChanges()) setEditor(null);
        }}
      >
        <DialogContent className="workspace-dialog sm:max-w-xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editor?.row ? "Perbarui" : "Tambah"}{" "}
              {editor && modules[editor.kind]?.singular}
            </DialogTitle>
            <DialogDescription>
              Isi sesuai keadaan nyata kelompok. Tanda * wajib diisi. Publikasi
              dan galeri berstatus Terbit dapat dilihat siapa pun.
            </DialogDescription>
          </DialogHeader>
          <form
            data-protect-unsaved
            onSubmit={saveForm}
            key={editor?.row?.id || editor?.kind}
          >
            {mutationError && (
              <Alert variant="destructive">
                <AlertTitle>Belum tersimpan</AlertTitle>
                <AlertDescription>{mutationError}</AlertDescription>
              </Alert>
            )}
            <fieldset disabled={saving || imageUploading} className="min-w-0">
              <FieldGroup>
                {editor &&
                  modules[editor.kind]?.fields.map((f) => (
                    <Field key={f.key}>
                      <FieldLabel htmlFor={f.key}>
                        {f.label}
                        {f.required ? " *" : ""}
                      </FieldLabel>
                      {f.key === "fileId" ? (<ImagePicker id={f.key} name={f.key} files={files} defaultValue={String(editor.row?.data[f.key] ?? editor.initial?.[f.key] ?? "")} required={f.required} onBusyChange={imageBusy} disabled={saving} />) : ["fileId", "attachmentId"].includes(f.key) ? (
                        <NativeSelect
                          id={f.key}
                          name={f.key}
                          required={f.required}
                          defaultValue={String(
                            editor.row?.data[f.key] ??
                              editor.initial?.[f.key] ??
                              "",
                          )}
                        >
                          <NativeSelectOption value="">
                            Pilih berkas dari arsip / tanpa lampiran
                          </NativeSelectOption>
                          {files
                            .filter(
                              (file) =>
                                !file.deleted_at &&
                                (f.key === "attachmentId" ||
                                  ["image/png", "image/jpeg"].includes(
                                    file.mime,
                                  )),
                            )
                            .map((file) => (
                              <NativeSelectOption key={file.id} value={file.id}>
                                {file.name}
                              </NativeSelectOption>
                            ))}
                        </NativeSelect>
                      ) : f.options ? (
                        <NativeSelect
                          id={f.key}
                          name={f.key}
                          defaultValue={String(
                            editor.row?.data[f.key] ??
                              editor.initial?.[f.key] ??
                              f.options[0],
                          )}
                        >
                          {f.options.map((o) => (
                            <NativeSelectOption key={o}>{o}</NativeSelectOption>
                          ))}
                        </NativeSelect>
                      ) : f.type === "textarea" ? (
                        <Textarea
                          id={f.key}
                          name={f.key}
                          defaultValue={
                            editor.row?.data[f.key] ??
                            editor.initial?.[f.key] ??
                            ""
                          }
                          required={f.required}
                          maxLength={5000}
                          rows={3}
                        />
                      ) : (
                        <Input
                          id={f.key}
                          name={f.key}
                          type={
                            f.type === "decimal" ? "number" : f.type || "text"
                          }
                          min={f.key === "amount" ? 1 : 0}
                          step={f.type === "decimal" ? "any" : "1"}
                          max={f.type === "number" ? 1e12 : undefined}
                          defaultValue={
                            editor.row?.data[f.key] ??
                            editor.initial?.[f.key] ??
                            ""
                          }
                          required={f.required}
                          maxLength={5000}
                        />
                      )}
                    </Field>
                  ))}
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={saving}
                    onClick={() => {
                      if (canDiscardChanges()) setEditor(null);
                    }}
                  >
                    Batal
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? "Menyimpan…" : "Simpan catatan"}
                  </Button>
                </div>
              </FieldGroup>
            </fieldset>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!deleteRow}
        onOpenChange={(v) => {
          if (!v && !saving) setDeleteRow(null);
        }}
      >
        <DialogContent className="workspace-dialog">
          <DialogHeader>
            <DialogTitle>Hapus catatan ini?</DialogTitle>
            <DialogDescription>
              Catatan “{String(deleteRow?.data.name || "")}” akan dihapus. Jika
              berupa kegiatan, daftar hadirnya juga dihapus. Tindakan ini tidak
              dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          {mutationError && (
            <Alert variant="destructive">
              <AlertTitle>Belum dihapus</AlertTitle>
              <AlertDescription>{mutationError}</AlertDescription>
            </Alert>
          )}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              disabled={saving}
              onClick={() => setDeleteRow(null)}
            >
              Batal
            </Button>
            <Button variant="destructive" disabled={saving} onClick={remove}>
              {saving ? "Menghapus…" : "Hapus catatan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!program}
        onOpenChange={(v) => {
          if (!v && !saving && canDiscardChanges()) setSelectedProgram(null);
        }}
      >
        <DialogContent className="workspace-dialog sm:max-w-xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{program?.name}</DialogTitle>
            <DialogDescription>
              {program?.category} · {program?.period} · Rancangan tahun pertama
            </DialogDescription>
          </DialogHeader>
          <p>{program?.goal}</p>
          <ul className="program-tasks">
            {program?.tasks.map((t) => (
              <li key={t}>
                <Check size={15} />
                {t}
              </li>
            ))}
          </ul>
          <form data-protect-unsaved onSubmit={saveProgram}>
            {mutationError && (
              <Alert variant="destructive">
                <AlertTitle>Belum tersimpan</AlertTitle>
                <AlertDescription>{mutationError}</AlertDescription>
              </Alert>
            )}
            <fieldset disabled={saving} className="min-w-0">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="program-status">
                    Status perkembangan
                  </FieldLabel>
                  <NativeSelect
                    id="program-status"
                    value={programStatus}
                    onChange={(e) => setProgramStatus(e.target.value)}
                  >
                    {[
                      "Rancangan",
                      "Disepakati",
                      "Berjalan",
                      "Selesai",
                      "Ditunda",
                    ].map((s) => (
                      <NativeSelectOption key={s}>{s}</NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>
                <Field>
                  <FieldLabel htmlFor="program-notes">
                    Catatan keputusan / hasil evaluasi
                  </FieldLabel>
                  <Textarea
                    id="program-notes"
                    value={programNotes}
                    onChange={(e) => setProgramNotes(e.target.value)}
                    maxLength={5000}
                    rows={3}
                  />
                </Field>
                <Button type="submit" disabled={saving}>
                  {saving ? "Menyimpan…" : "Simpan perkembangan"}
                </Button>
              </FieldGroup>
            </fieldset>
          </form>
        </DialogContent>
      </Dialog>
    </WorkspaceShell>
  );
}
