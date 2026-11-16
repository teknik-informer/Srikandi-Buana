import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { roles, canReadKind, canReadSection, canWriteKind, type Principal, type Role } from "@/lib/permissions";
import { ArrowUpRight, CheckCircle2, ClipboardCheck, ShieldCheck } from "lucide-react";
import Link from "next/link";

const roleOrder: Role[] = ["ketua", "sekretaris", "bendahara", "koordinator", "anggota", "admin"];
const domains = [
  { label: "Keanggotaan", kind: "anggota", section: "anggota" },
  { label: "Rapat dan notulen", kind: "musyawarah", section: "musyawarah" },
  { label: "Surat-menyurat", kind: "surat", section: "surat" },
  { label: "Program kerja", kind: "program", section: "program" },
  { label: "Pengelolaan pertanian", kind: "pertanian", section: "pertanian" },
  { label: "Tugas dan tindak lanjut", kind: "tindaklanjut", section: "tindaklanjut" },
  { label: "Kas dan keuangan", kind: "kas", section: "kas" },
  { label: "Aset", kind: "aset", section: "aset" },
  { label: "Publikasi", kind: "publikasi", section: "publikasi" },
  { label: "Kemitraan eksternal", kind: "akses-eksternal", section: "akses-eksternal" },
  { label: "Pengaturan akun", kind: "akun", section: "akun" },
] as const;

function principalFor(role: Role): Principal {
  return {
    accountId: "qa-policy-inspector",
    userId: "qa-policy-inspector",
    email: "qa-policy-inspector@invalid.local",
    displayName: "Pemeriksaan kebijakan",
    fullName: "Pemeriksaan kebijakan",
    role,
    memberId: null,
    position: "Mode pemeriksaan",
    programIds: ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
    architectFullAccess: role === "admin" && typeof process !== "undefined" && process.env.VERCEL_ENV === "preview" && process.env.VERCEL_GIT_COMMIT_REF === "feat/architect-identity-console-2026-11-15",
  };
}

function permission(role: Role, kind: string, section: string) {
  const principal = principalFor(role);
  const read = canReadSection(principal, section) || canReadKind(principal, kind);
  const write = canWriteKind(principal, kind);
  return { read, write };
}

export default function ArchitectQaTestCenter() {
  return (
    <section className="workspace workspace-page space-y-6" aria-labelledby="qa-center-title">
      <div className="workspace-page-header">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-[.16em] text-muted-foreground">ARSITEK SISTEM · QUALITY ASSURANCE</p>
          <h1 id="qa-center-title" className="mt-2 text-2xl font-semibold tracking-tight">QA Test Center</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Pusat pemeriksaan akun, profil akses, dan batas kewenangan Srikandi Buana. Pada Preview QA, Arsitek Sistem memperoleh Full Access untuk menguji seluruh modul. Pada Production, hak teknis tetap dipisahkan dari data operasional organisasi.
          </p>
        </div>
        <Badge variant="outline" className="w-fit">Preview / QA</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Profil akses aplikasi</CardDescription>
            <CardTitle className="text-3xl tabular-nums">6</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Enam profil saat ini, termasuk Administrator Sistem yang terpisah dari kewenangan organisasi.</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Domain pemeriksaan</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{domains.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Ringkasan baca dan input/edit berdasarkan kebijakan server yang aktif.</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Identitas struktural</CardDescription>
            <CardTitle className="text-xl">Terpisah</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Nama jabatan seperti Wakil Sekretaris disimpan terpisah dari profil akses akun.</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-1 size-5 text-muted-foreground" />
            <div>
              <CardTitle>Pemisahan kewenangan</CardTitle>
              <CardDescription className="mt-1">Prinsip least privilege yang harus dipertahankan pada setiap akun.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border p-4">
            <p className="font-medium">Arsitek Sistem · Full Access QA</p>
            <p className="mt-1 text-sm text-muted-foreground">Pada Preview QA dapat membuka, membaca, membuat, mengubah, dan menghapus data uji seluruh modul. Hak ini hanya aktif pada cabang QA yang ditetapkan; tidak berlaku pada Production.</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="font-medium">Pengurus dan anggota</p>
            <p className="mt-1 text-sm text-muted-foreground">Menjalankan tugas sesuai profil akses organisasi. Setiap orang tetap memakai akun, kata sandi, sesi, dan jejak audit masing-masing.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Matriks kebijakan akses aktif</CardTitle>
          <CardDescription>Hasil pembacaan fungsi kebijakan yang dipakai server. “Input/edit” tidak mencakup persetujuan akhir atau penerbitan yang memiliki aturan khusus.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bidang</TableHead>
                  {roleOrder.map((role) => <TableHead key={role} className="text-center">{roles[role]}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {domains.map((domain) => (
                  <TableRow key={domain.kind}>
                    <TableCell className="min-w-40 font-medium">{domain.label}</TableCell>
                    {roleOrder.map((role) => {
                      const access = permission(role, domain.kind, domain.section);
                      return (
                        <TableCell key={role} className="text-center">
                          <span className="inline-flex min-w-14 flex-col items-center gap-1">
                            <span className={access.read ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground/50"} aria-label={access.read ? "Dapat membaca" : "Tidak dapat membaca"}>{access.read ? "Baca" : "—"}</span>
                            {access.write && <span className="text-xs text-sky-700 dark:text-sky-400">Input/edit</span>}
                          </span>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Matriks menggunakan kebijakan server aktif. Kolom Administrator Sistem akan menampilkan Full Access hanya ketika halaman dibuka pada Preview QA yang diizinkan; di Production akses operasional tetap ditolak.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <ClipboardCheck className="mt-1 size-5 text-muted-foreground" />
            <div>
              <CardTitle>Daftar skenario pengujian</CardTitle>
              <CardDescription className="mt-1">Skenario yang harus diverifikasi sebelum perubahan identitas disetujui untuk Production.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            ["Akun mandiri per orang", "Pastikan dua orang dengan profil akses sama tetap memiliki akun dan sesi berbeda."],
            ["Jabatan dan profil akses", "Pastikan jabatan Wakil Ketua/Wakil Sekretaris/Wakil Bendahara tidak otomatis mendapat hak penuh jabatan utama."],
            ["Aktivasi email", "Pastikan undangan menghasilkan email aktivasi yang dikirim ke alamat penerima, bukan sekadar menampilkan tautan."],
            ["Verifikasi WhatsApp", "Pastikan konfirmasi dilakukan manual oleh Administrator Sistem dan nomor cocok dengan data anggota."],
            ["Pemulihan akun", "Pastikan tautan satu kali, kedaluwarsa, audit, dan pencabutan sesi lama berjalan."],
            ["Full Access Arsitek Sistem di QA", "Pastikan seluruh modul dapat dibuka dan operasi CRUD berjalan pada Preview QA, tanpa membuka akses operasional pada Production."],
            ["Isolasi Administrator Sistem di Production", "Pastikan akun teknis tetap tidak dapat membaca atau mengubah data operasional organisasi pada Production."],
          ].map(([title, description]) => (
            <div key={title} className="flex gap-3 rounded-lg border p-3">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-sm font-medium">{title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                <Badge variant="outline" className="mt-2">Menunggu uji langsung</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Langkah pengujian berikutnya</CardTitle>
          <CardDescription>Gunakan pengelolaan akun QA dan lakukan pemeriksaan menggunakan akun uji yang berbeda.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Link href="/dashboard/qa-members" className="inline-flex min-h-10 items-center gap-2 rounded-md border px-4 text-sm font-medium hover:bg-muted">
            Laboratorium Anggota QA <ArrowUpRight className="size-4" />
          </Link>
          <Link href="/dashboard/akun" className="inline-flex min-h-10 items-center gap-2 rounded-md border px-4 text-sm font-medium hover:bg-muted">
            Buka pengelolaan akun <ArrowUpRight className="size-4" />
          </Link>
          <Link href="/dashboard" className="inline-flex min-h-10 items-center gap-2 rounded-md border px-4 text-sm font-medium hover:bg-muted">
            Kembali ke dashboard
          </Link>
        </CardContent>
      </Card>
    </section>
  );
}
