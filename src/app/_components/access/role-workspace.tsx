"use client";
import ImagePicker from "../image-picker";
import { WorkspaceDialogContent as DialogContent } from "../workspace-dialog";
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
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
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
import {
  canReadSection,
  canWriteKind,
  roles,
  type Principal,
} from "@/lib/permissions";
import { modules, programs, type Row } from "@/lib/srikandi";
import { canDiscardChanges, markFormSaved } from "@/lib/unsaved-changes";
import { Download, Plus, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Attendance from "../attendance";
import FileManager from "../file-manager";
import EnterpriseReports from "../enterprise-reports";
import EnterpriseMonitoring from "../enterprise-monitoring";
import WorkspaceShell from "../workspace-shell";
import MyAccount from "./my-account";
import ManagementDashboard from "../management-dashboard";
import RecordTable from "../record-table";
import {
  WorkspacePageHeader,
  WorkspaceSearch,
  StatusBadge,
} from "../workspace-ui";
export default function RoleWorkspace({
  user,
  section,
  defaultSidebarOpen = true,
}: {
  user: Principal;
  section: string;
  defaultSidebarOpen?: boolean;
}) {
  const { rows, files, loading, error, unauthorized, load } =
    useWorkspaceData();
  const [page, setPage] = useState(1);
  const imageUploadPending = useRef(false);
  const [imageUploading, setImageUploading] = useState(false);
  function imageBusy(value: boolean) { imageUploadPending.current = value; setImageUploading(value); }
  const [query, setQuery] = useState(""),
    [editor, setEditor] = useState<{ kind: string; row?: Row } | null>(null),
    [detail, setDetail] = useState<Row | null>(null),
    [deleting, setDeleting] = useState<Row | null>(null);
  useEffect(() => {
    setQuery(
      new URLSearchParams(window.location.search).get("cari")?.slice(0, 200) ||
        "",
    );
    setPage(1);
    setEditor(null);
    setDetail(null);
  }, [section]);
  const module = modules[section],
    title =
      section === "ringkasan"
        ? "Pusat Kendali"
        : section === "akun-saya"
          ? "Akun saya"
          : section === "program"
            ? "Program kerja"
            : section === "kehadiran"
              ? "Kehadiran"
              : section === "laporan"
                ? "Laporan"
                : section === "monitoring"
                  ? "Monitoring Operasional"
                  : section === "dokumen"
                  ? "Arsip kerja"
                  : module?.title || "Ruang kerja";
  const {
    busy,
    error: mutationError,
    clearError,
    mutate,
  } = useRecordMutation(load);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editor || imageUploadPending.current) return;
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    if (
      await mutate(editor.row?.id ? "PUT" : "POST", {
        kind: editor.kind,
        id: editor.row?.id,
        expectedUpdated: editor.row?.updated,
        data,
      })
    ) {
      markFormSaved(form);
      setEditor(null);
    }
  }
  const displayed = (loading || error ? [] : rows).filter(
    (r) =>
      r.kind === section &&
      JSON.stringify(r.data).toLowerCase().includes(query.toLowerCase()),
  );
  const totalPages = Math.max(1, Math.ceil(displayed.length / 25));
  const currentPage = Math.min(page, totalPages);
  const formFields =
    editor?.kind === "program"
      ? [
          {
            key: "programId",
            label: "Nomor program",
            required: true,
            options: programs
              .filter(
                (p) =>
                  user.role !== "koordinator" || user.programIds.includes(p.id),
              )
              .map((p) => p.id),
          },
          { key: "name", label: "Nama program", required: true },
          {
            key: "status",
            label: "Status",
            options: [
              "Rancangan",
              "Disepakati",
              "Berjalan",
              "Selesai",
              "Ditunda",
            ],
          },
          {
            key: "notes",
            label: "Catatan keputusan / hasil",
            type: "textarea",
          },
        ]
      : editor
        ? modules[editor.kind]?.fields.map((field) =>
            field.key === "programId" && user.role === "koordinator"
              ? { ...field, options: field.options?.filter((option) => user.programIds.includes(option)) }
              : field,
          )
        : [];
  function exportCSV() {
    if (!module) return;
    const quote = (s: unknown) =>
      '"' +
      String(s ?? "")
        .replace(/^[=+@\-]/, "'$&")
        .replaceAll('"', '""') +
      '"';
    const fields = module.fields.filter((f) =>
      displayed.some((r) => f.key in r.data),
    );
    const url = URL.createObjectURL(
      new Blob(
        [
          "\uFEFF" +
            [
              fields.map((f) => quote(f.label)).join(","),
              ...displayed.map((r) =>
                fields.map((f) => quote(r.data[f.key])).join(","),
              ),
            ].join("\r\n"),
        ],
        { type: "text/csv;charset=utf-8" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "srikandi-" + section + ".csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <WorkspaceShell
      user={user}
      section={section}
      title={title}
      defaultSidebarOpen={defaultSidebarOpen}
    >
      <section
        className="workspace workspace-role workspace-page"
        aria-labelledby="workspace-title"
        aria-busy={loading}
      >
        {!["monitoring", "laporan"].includes(section) && (
        <WorkspacePageHeader
          title={title}
          eyebrow="Ruang anggota & pengurus"
          description={
            section === "monitoring"
              ? "Pantau tugas, agenda, tenggat, dan kondisi operasional sesuai lingkup akses " + roles[user.role] + "."
              : (user.position || roles[user.role]) +
                " · " +
                (user.role === "koordinator"
                  ? "Program " + user.programIds.join(", ")
                  : "Srikandi Buana")
          }
          actions={
            <>
              {module && (
                <Button
                  variant="outline"
                  disabled={loading || !!error}
                  onClick={exportCSV}
                >
                  <Download data-icon="inline-start" />
                  Ekspor CSV
                </Button>
              )}
              {module && canWriteKind(user, section) && (
                <Button
                  disabled={loading || !!error}
                  onClick={() => {
                    clearError();
                    setEditor({ kind: section });
                  }}
                >
                  <Plus data-icon="inline-start" />
                  Tambah
                </Button>
              )}
              <Button
                aria-label="Muat ulang data"
                variant="outline"
                onClick={load}
              >
                <RefreshCw />
              </Button>
            </>
          }
        />
        )}
        {error && (
          <Alert variant="destructive">
            <AlertTitle>
              {unauthorized ? "Sesi masuk berakhir" : "Data belum dapat dimuat"}
            </AlertTitle>
            <AlertDescription>
              {error}
              <div className="flex gap-2 flex-wrap mt-3">
                <Button variant="outline" onClick={load}>
                  Coba lagi
                </Button>
                <Button variant="outline" asChild>
                  <Link
                    href={
                      "/masuk?return_to=" +
                      encodeURIComponent("/dashboard/" + section)
                    }
                  >
                    Masuk kembali
                  </Link>
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}
        {loading && !["ringkasan", "monitoring"].includes(section) && <Skeleton className="h-20 w-full" />}
        {section === "ringkasan" && (
          <ManagementDashboard
            rows={rows}
            files={files}
            user={user}
            loading={loading}
            error={error}
            onSaved={load}
          />
        )}
        {section === "monitoring" && (
          <EnterpriseMonitoring
            rows={rows}
            files={files}
            user={user}
            loading={loading}
            error={error}
            onRefresh={() => void load()}
          />
        )}
        {section === "akun-saya" && <MyAccount />}
        {section === "laporan" && !loading && !error && (
          <EnterpriseReports rows={rows} user={user} />
        )}
        {section === "kehadiran" && user.role === "sekretaris" && (
          <Attendance rows={rows} onSaved={load} />
        )}
        {section === "kehadiran" && user.role !== "sekretaris" && (
          <Card>
            <CardHeader>
              <CardTitle>Daftar hadir tercatat</CardTitle>
              <CardDescription>
                Riwayat kehadiran kegiatan kelompok.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {rows
                .filter((r) => r.kind === "kehadiran")
                .map((r) => (
                  <Button
                    key={r.id}
                    variant="outline"
                    onClick={() => setDetail(r)}
                  >
                    {String(r.data.name)}
                  </Button>
                ))}
            </CardContent>
          </Card>
        )}
        {section === "dokumen" && (
          <FileManager
            files={files.filter((f) => f.uploader_id === user.accountId)}
            onChange={load}
            loading={loading}
            loadError={error}
          />
        )}
        {section === "program" && (
          <div className="grid gap-4 lg:grid-cols-2">
            {programs
              .filter(
                (p) =>
                  user.role !== "koordinator" || user.programIds.includes(p.id),
              )
              .map((p) => {
                const row = rows.find(
                  (r) => r.kind === "program" && r.data.programId === p.id,
                );
                return (
                  <Card key={p.id}>
                    <CardHeader>
                      <StatusBadge value={row?.data.status || "Rancangan"} />
                      <CardTitle>
                        {p.id}. {p.name}
                      </CardTitle>
                      <CardDescription>{p.goal}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm mb-4">
                        {String(
                          row?.data.notes || "Belum ada perkembangan tercatat.",
                        )}
                      </p>
                      {canWriteKind(user, "program") && (
                        <Button
                          variant="outline"
                          disabled={loading || !!error}
                          onClick={() => {
                            clearError();
                            setEditor({
                              kind: "program",
                              row: row || {
                                id: "",
                                kind: "program",
                                data: {
                                  programId: p.id,
                                  name: p.name,
                                  status: "Rancangan",
                                  notes: "",
                                },
                                created: "",
                                updated: "",
                              },
                            });
                          }}
                        >
                          Perbarui perkembangan
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        )}
        {user.role === "anggota" && section === "anggota" && (
          <Card>
            <CardHeader>
              <CardTitle>Layanan keanggotaan saya</CardTitle>
              <CardDescription>
                Periksa status data, perbarui informasi akun, atau kirim kebutuhan kepada pengurus tanpa mengubah data keanggotaan resmi secara langsung.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href="/dashboard/akun-saya">Perbarui profil akun</Link>
              </Button>
              <Button asChild>
                <Link href="/dashboard/pengajuan">Ajukan perubahan atau kebutuhan</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link href="/dashboard/portal">Kembali ke portal anggota</Link>
              </Button>
            </CardContent>
          </Card>
        )}
        {module && (
          <Card>
            <CardHeader>
              <CardTitle>
                {user.role === "anggota" && section === "anggota"
                  ? "Data keanggotaan saya"
                  : module.title}
              </CardTitle>
              <CardDescription>
                {loading
                  ? "Memuat catatan…"
                  : error
                    ? "Data belum berhasil dimuat"
                    : displayed.length + " catatan sesuai akses Anda."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="table-tools">
                <WorkspaceSearch
                  label="Cari catatan"
                  placeholder={"Cari " + module.singular + "…"}
                  value={query}
                  onChange={(value) => {
                    setQuery(value);
                    setPage(1);
                  }}
                  className="max-w-md flex-1"
                />
              </div>
              {!loading && !error && displayed.length > 0 && (
                <RecordTable
                  label={module.title}
                  rows={displayed.slice(
                    (currentPage - 1) * 25,
                    currentPage * 25,
                  )}
                  fields={module.fields.slice(0, section === "kas" ? 5 : 4)}
                  files={files}
                  onView={setDetail}
                  actions={(r) => (
                    <div className="flex flex-wrap gap-2">
                      {section === "musyawarah" && (
                        <Button asChild variant="outline">
                          <Link href={"/dashboard/cetak-notulen/" + encodeURIComponent(r.id)} target="_blank" rel="noopener noreferrer">Cetak notulen</Link>
                        </Button>
                      )}
                      <Button variant="outline" onClick={() => setDetail(r)}>
                        Rincian
                      </Button>
                      {canWriteKind(user, section) && (
                        <>
                          <Button
                            variant="outline"
                            onClick={() => {
                              clearError();
                              setEditor({ kind: section, row: r });
                            }}
                          >
                            Edit
                          </Button>
                          {user.role !== "ketua" && (
                            <Button
                              variant="destructive"
                              onClick={() => {
                                clearError();
                                setDeleting(r);
                              }}
                            >
                              Hapus
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                />
              )}
              {loading && <Skeleton className="mt-4 h-40 w-full" />}
              {displayed.length > 25 && (
                <nav
                  aria-label="Halaman catatan"
                  className="flex flex-wrap gap-3 items-center justify-end py-4"
                >
                  <Button
                    variant="outline"
                    disabled={currentPage === 1}
                    onClick={() => setPage(currentPage - 1)}
                  >
                    Sebelumnya
                  </Button>
                  <span aria-live="polite">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage(currentPage + 1)}
                  >
                    Berikutnya
                  </Button>
                </nav>
              )}
              {!displayed.length && !loading && !error && (
                <Empty>
                  <EmptyHeader>
                    <EmptyTitle>
                      {query ? "Catatan tidak ditemukan" : "Belum ada catatan"}
                    </EmptyTitle>
                    <EmptyDescription>
                      {query
                        ? "Coba kata pencarian lain atau hapus pencarian."
                        : "Catatan sesuai hak akses Anda akan tampil di sini."}
                    </EmptyDescription>
                  </EmptyHeader>
                  {query && (
                    <Button variant="outline" onClick={() => setQuery("")}>
                      Hapus pencarian
                    </Button>
                  )}
                </Empty>
              )}
            </CardContent>
          </Card>
        )}
      </section>
      <Dialog
        open={!!detail}
        onOpenChange={(v) => {
          if (!v) setDetail(null);
        }}
      >
        <DialogContent className="workspace-dialog max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {String(detail?.data.name || "Rincian catatan")}
            </DialogTitle>
            <DialogDescription>
              Informasi sesuai hak akses Anda.
            </DialogDescription>
          </DialogHeader>
          <dl className="flex flex-col gap-3">
            {detail &&
              Object.entries(detail.data)
                .filter(([k]) => !["attachmentId", "fileId"].includes(k))
                .map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-sm text-muted-foreground">
                      {modules[detail.kind]?.fields.find((f) => f.key === k)
                        ?.label || k}
                    </dt>
                    <dd className="whitespace-pre-wrap break-words">
                      {String(v ?? "—")}
                    </dd>
                  </div>
                ))}
            {detail &&
              ["attachmentId", "fileId"]
                .filter((k) => detail.data[k])
                .map((k) => (
                  <Button asChild variant="outline" key={k}>
                    <a
                      href={
                        "/api/files?id=" +
                        encodeURIComponent(String(detail.data[k]))
                      }
                    >
                      Unduh lampiran
                    </a>
                  </Button>
                ))}
          </dl>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!editor}
        onOpenChange={(v) => {
          if (!v && !busy && !imageUploadPending.current && canDiscardChanges()) setEditor(null);
        }}
      >
        <DialogContent className="workspace-dialog max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editor?.row?.id ? "Perbarui" : "Tambah"}{" "}
              {editor?.kind === "program"
                ? "program"
                : editor && modules[editor.kind]?.singular}
            </DialogTitle>
            <DialogDescription>
              Isi sesuai keadaan nyata. Pilih nomor program untuk catatan yang
              dikelola koordinator.
            </DialogDescription>
          </DialogHeader>
          <form
            data-protect-unsaved
            key={editor?.row?.id || editor?.row?.data.programId || editor?.kind}
            onSubmit={save}
          >
            {mutationError && (
              <Alert variant="destructive">
                <AlertTitle>Belum tersimpan</AlertTitle>
                <AlertDescription>{mutationError}</AlertDescription>
              </Alert>
            )}
            <fieldset disabled={busy || imageUploading} className="min-w-0">
              <FieldGroup>
                {formFields?.map((f) => (
                  <Field key={f.key}>
                    <FieldLabel htmlFor={"edit-" + f.key}>
                      {f.label}
                      {f.required ? " *" : ""}
                    </FieldLabel>
                    {f.key === "fileId" ? (<ImagePicker id={"edit-" + f.key} name={f.key} files={files} defaultValue={String(editor?.row?.data[f.key] ?? "")} required={f.required} onBusyChange={imageBusy} disabled={busy} />) : ["attachmentId", "fileId"].includes(f.key) ? (
                      <NativeSelect
                        id={"edit-" + f.key}
                        name={f.key}
                        required={f.required}
                        defaultValue={String(editor?.row?.data[f.key] ?? "")}
                      >
                        <NativeSelectOption value="">
                          Tanpa lampiran
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
                        id={"edit-" + f.key}
                        name={f.key}
                        defaultValue={String(
                          editor?.row?.data[f.key] ?? f.options[0],
                        )}
                      >
                        {f.options
                          .filter(
                            (o) =>
                              f.key !== "programId" ||
                              user.role !== "koordinator" ||
                              user.programIds.includes(o),
                          )
                          .map((o) => (
                            <NativeSelectOption key={o} value={o}>
                              {o || "Tidak terkait program"}
                            </NativeSelectOption>
                          ))}
                      </NativeSelect>
                    ) : f.type === "textarea" ? (
                      <Textarea
                        id={"edit-" + f.key}
                        name={f.key}
                        defaultValue={editor?.row?.data[f.key] ?? ""}
                        required={f.required}
                        maxLength={5000}
                      />
                    ) : (
                      <Input
                        id={"edit-" + f.key}
                        name={f.key}
                        type={
                          f.type === "decimal" ? "number" : f.type || "text"
                        }
                        step={f.type === "decimal" ? "any" : undefined}
                        min={f.key === "amount" ? 1 : 0}
                        max={f.type === "number" ? 1e12 : undefined}
                        maxLength={5000}
                        defaultValue={editor?.row?.data[f.key] ?? ""}
                        required={f.required}
                      />
                    )}
                  </Field>
                ))}
                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (canDiscardChanges()) setEditor(null);
                    }}
                  >
                    Batal
                  </Button>
                  <Button type="submit" disabled={busy}>
                    {busy ? "Menyimpan…" : "Simpan catatan"}
                  </Button>
                </div>
              </FieldGroup>
            </fieldset>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!deleting}
        onOpenChange={(v) => {
          if (!v && !busy) setDeleting(null);
        }}
      >
        <DialogContent className="workspace-dialog">
          <DialogHeader>
            <DialogTitle>Hapus catatan?</DialogTitle>
            <DialogDescription>
              {String(deleting?.data.name || "")} akan dihapus. Riwayat daftar
              hadir kegiatan juga ikut dihapus.
            </DialogDescription>
          </DialogHeader>
          {mutationError && (
            <Alert variant="destructive">
              <AlertTitle>Belum dihapus</AlertTitle>
              <AlertDescription>{mutationError}</AlertDescription>
            </Alert>
          )}
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setDeleting(null)}
              disabled={busy}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={async () => {
                if (
                  deleting &&
                  (await mutate(
                    "DELETE",
                    {},
                    "/api/records?id=" + encodeURIComponent(deleting.id),
                  ))
                )
                  setDeleting(null);
              }}
            >
              Hapus
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </WorkspaceShell>
  );
}
