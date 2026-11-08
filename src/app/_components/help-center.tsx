"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { roles, type Role } from "@/lib/permissions";
import { futureModules, operationalTemplates, templateDestinations } from "@/features/agriculture/templates.mjs";
import { ArrowUpRight, BookOpen, ClipboardList, FileCheck2, ShieldCheck } from "lucide-react";
import Link from "next/link";

const roleGuides: Record<Role, { summary: string; steps: { title: string; detail: string; href: string }[] }> = {
  admin: {
    summary: "Kelola akun, konfigurasi, keanggotaan, persetujuan, dan tata kelola seluruh ruang kerja. Akses data tetap mengikuti tujuan dan batas privasi.",
    steps: [
      { title: "Verifikasi dasar organisasi", detail: "Pastikan data anggota, pengurus, dan dokumen rujukan memiliki sumber serta status pemeriksaan yang jelas.", href: "/dashboard/anggota" },
      { title: "Tinjau hak akses", detail: "Buat atau nonaktifkan akses berdasarkan penugasan yang sah; tinjau kembali akses saat tugas berakhir.", href: "/dashboard/akun" },
      { title: "Pantau pekerjaan", detail: "Gunakan monitoring dan laporan untuk menemukan pekerjaan yang tertunda, bukan membuat angka contoh.", href: "/dashboard/monitoring" },
    ],
  },
  ketua: {
    summary: "Fokus pada keputusan organisasi, persetujuan, pengawasan pelaksanaan, dan tindak lanjut keputusan.",
    steps: [
      { title: "Tinjau keputusan rapat", detail: "Pastikan keputusan memiliki catatan, penanggung jawab, tenggat, dan hasil yang bisa diperiksa.", href: "/dashboard/musyawarah" },
      { title: "Pantau tugas", detail: "Periksa tugas yang menunggu verifikasi, terlambat, atau memerlukan keputusan.", href: "/dashboard/tindaklanjut" },
      { title: "Baca laporan", detail: "Tinjau perkembangan program dan laporan aktual sesuai periode.", href: "/dashboard/laporan" },
    ],
  },
  sekretaris: {
    summary: "Jaga ketertiban keanggotaan, surat, notulen, agenda, daftar hadir, register, dan arsip organisasi.",
    steps: [
      { title: "Perbarui administrasi anggota", detail: "Catat informasi seperlunya dan bedakan data belum diverifikasi dengan data terverifikasi.", href: "/dashboard/anggota" },
      { title: "Catat rapat dan surat", detail: "Simpan keputusan, disposisi, penanggung jawab, tenggat, dan lampiran sumber.", href: "/dashboard/surat" },
      { title: "Catat kegiatan", detail: "Kelola jadwal, kehadiran, hasil, dan dokumentasi yang telah mendapat izin.", href: "/dashboard/kegiatan" },
    ],
  },
  bendahara: {
    summary: "Catat transaksi yang benar-benar terjadi, kelola bukti, buku besar, dan inventaris sesuai pemisahan tugas.",
    steps: [
      { title: "Catat transaksi kas", detail: "Pisahkan dana organisasi, program, dan usaha. Simpan bukti penerimaan atau pengeluaran.", href: "/dashboard/kas" },
      { title: "Periksa jurnal", detail: "Pastikan setiap jurnal seimbang dan setiap koreksi memiliki jejak pembalikan, bukan menghapus sejarah.", href: "/dashboard/akuntansi" },
      { title: "Periksa aset", detail: "Kelola kondisi dan penanggung jawab aset secara terpisah dari stok produk.", href: "/dashboard/aset" },
    ],
  },
  koordinator: {
    summary: "Kelola program yang ditugaskan, kegiatan lapangan, hasil aktual, bukti, dan tindak lanjut dalam lingkup penugasan.",
    steps: [
      { title: "Periksa program tugas", detail: "Catat perkembangan nyata, kendala, dukungan yang diperlukan, serta periode laporan.", href: "/dashboard/program" },
      { title: "Rencanakan kegiatan", detail: "Masukkan tanggal, lokasi, pelaksana, peserta aktual, dan hasil.", href: "/dashboard/kegiatan" },
      { title: "Perbarui tindak lanjut", detail: "Selesaikan tugas dengan hasil aktual dan bukti sebelum mengajukan verifikasi.", href: "/dashboard/tindaklanjut" },
    ],
  },
  anggota: {
    summary: "Gunakan portal untuk melihat informasi pribadi, kegiatan yang tersedia, dan mengajukan pembaruan atau kebutuhan kepada pengurus.",
    steps: [
      { title: "Periksa akun dan data pribadi", detail: "Pastikan kontak dan informasi profil akurat; ajukan koreksi kepada pengurus bila diperlukan.", href: "/dashboard/akun-saya" },
      { title: "Lihat kegiatan", detail: "Periksa agenda yang dipublikasikan untuk anggota dan status kegiatan.", href: "/dashboard/kegiatan" },
      { title: "Kirim pengajuan", detail: "Gunakan pengajuan untuk menyampaikan kebutuhan atau perubahan tanpa mengubah data resmi sendiri.", href: "/dashboard/pengajuan" },
    ],
  },
};

const templateNotes: Record<string, string> = {
  "partner-engagement-log": "Input penjajakan dilakukan pada menu Kemitraan. Tahap hubungan dan catatan resmi harus mencerminkan komunikasi yang benar-benar terjadi.",
  "tot-session-record": "Pelaksanaan ToT dicatat pada menu Kegiatan. Field khusus laporan pelatihan masih memerlukan penyelarasan sebelum formulir digital lengkap.",
  "tot-attendance-roster": "Daftar hadir dikelola melalui menu Daftar Hadir. Jangan meminta NIK, rekening, atau data sensitif yang tidak diperlukan.",
  "tot-action-plan": "Tindak lanjut pasca-ToT dikelola pada menu Tugas dan Tindak Lanjut. Gunakan hasil aktual dan bukti untuk verifikasi.",
  "partner-document-register": "Register dokumen dikelola pada Administrasi → Register Dokumen. Status 'diterima' berbeda dari 'terverifikasi sumber/versi'.",
  "program-preparation-checklist": "Checklist dibahas pada menu Kemitraan. Checklist tidak mengaktifkan program, membuat anggaran, atau menyatakan adanya perjanjian.",
  "basic-member-intake": "Pendataan anggota dilakukan di menu Keanggotaan. Jelaskan tujuan dan persetujuan, lalu verifikasi sebelum data digunakan sebagai data resmi.",
};

export default function HelpCenter({ role }: { role: Role }) {
  const guide = roleGuides[role];
  return (
    <main className="workspace-page space-y-8" aria-labelledby="help-centre-title">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          PANDUAN PENGGUNAAN SRIKANDI BUANA
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 id="help-centre-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Pusat Bantuan
          </h1>
          <Badge variant="outline">{roles[role]}</Badge>
        </div>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          Panduan kerja, alur pengisian, dokumentasi template, dan pengenalan modul. Formulir operasional tetap dibuka dari menu yang mengelola datanya.
        </p>
      </header>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BookOpen className="size-5 text-primary" aria-hidden="true" />
            <CardTitle className="text-base">Panduan sesuai peran Anda</CardTitle>
          </div>
          <CardDescription>{guide.summary}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {guide.steps.map((step, index) => (
            <article key={step.title} className="min-w-0 rounded-xl border p-4">
              <p className="text-xs font-semibold text-muted-foreground">LANGKAH 0{index + 1}</p>
              <h2 className="mt-2 font-semibold">{step.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.detail}</p>
              <Link className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4" href={step.href}>
                Buka menu terkait <ArrowUpRight size={14} aria-hidden="true" />
              </Link>
            </article>
          ))}
        </CardContent>
      </Card>

      <section id="template" className="space-y-4 scroll-mt-24" aria-labelledby="template-guide-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <FileCheck2 className="size-5 text-primary" aria-hidden="true" />
              <h2 id="template-guide-title" className="text-xl font-semibold">Panduan dan rancangan formulir</h2>
            </div>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
              Bagian ini berisi dokumentasi kolom, tujuan, dan cara penggunaan tujuh template. Ini bukan menu input dan tidak menyimpan data.
            </p>
          </div>
          <Badge variant="secondary">{operationalTemplates.length} panduan template</Badge>
        </div>

        <Card className="border-amber-500/30">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-amber-600" aria-hidden="true" />
              <CardTitle className="text-base">Status kemitraan dan dokumen</CardTitle>
              <Badge variant="outline">Tahap ToT</Badge>
            </div>
            <CardDescription>
              Belum ada perjanjian program yang ditandatangani. Kelompok belum memiliki salinan digital dokumen program mitra. Panduan ini adalah rancangan internal, bukan formulir resmi mitra atau pemerintah.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="font-medium">Yang boleh dicatat</p>
              <p className="mt-1 text-muted-foreground">Penjajakan, ToT yang benar-benar berlangsung, daftar hadir, materi, pembelajaran, tindak lanjut, serta dokumen yang diminta atau diterima.</p>
            </div>
            <div>
              <p className="font-medium">Yang belum boleh diasumsikan</p>
              <p className="mt-1 text-muted-foreground">Kontrak, dana hibah, target penerima manfaat, anggaran, kewajiban pelaporan, sertifikasi, atau status mitra resmi yang belum memiliki sumber dan persetujuan.</p>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 xl:grid-cols-2">
          {operationalTemplates.map((template) => {
            const destination = templateDestinations[template.id];
            return (
              <Card key={template.id} className="min-w-0">
                <CardHeader className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge variant="outline">Panduan v{template.version}</Badge>
                    <span className="text-xs text-muted-foreground">{template.category}</span>
                  </div>
                  <CardTitle className="text-base">{template.name}</CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <details className="group rounded-lg border px-3 py-2">
                    <summary className="flex min-h-11 cursor-pointer items-center rounded-md text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2">
                      Lihat struktur kolom ({template.fields.length})
                    </summary>
                    <div className="mt-3 space-y-3">
                      {template.sections.map((section) => {
                        const fields = template.fields.filter((item) => item.section === section.id);
                        if (!fields.length) return null;
                        return (
                          <div key={section.id}>
                            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{section.title}</h3>
                            <ul className="mt-1 list-inside list-disc space-y-1 text-sm">
                              {fields.map((field) => (
                                <li key={field.key}>{field.label}{field.required ? <span className="text-destructive"> *</span> : null}</li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  </details>
                  <p className="text-sm leading-6 text-muted-foreground">{templateNotes[template.id] || "Gunakan menu pemilik data sesuai kewenangan."}</p>
                  {destination && (
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Menu input pemilik data</p>
                        <p className="text-sm font-medium">{destination.label}</p>
                        <Badge variant="secondary">{destination.inputStatus === "field_mapping_pending" ? "Penyelarasan kolom diperlukan" : "Form domain tersedia"}</Badge>
                      </div>
                      <Link href={destination.route} className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4">
                        Buka menu input <ArrowUpRight size={14} aria-hidden="true" />
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Catatan: tombol di atas hanya membuka modul kerja yang sudah ada. Kolom template yang belum dipetakan tidak dianggap sudah tersedia atau tersimpan sampai implementasi form domain dan uji QA selesai.
        </p>
      </section>

      <section className="space-y-4" aria-labelledby="future-module-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <ClipboardList className="size-5 text-primary" aria-hidden="true" />
              <h2 id="future-module-title" className="text-xl font-semibold">Peta modul yang akan dikembangkan</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Modul berikut belum aktif dan tidak memiliki formulir atau penyimpanan data.</p>
          </div>
          <Badge variant="secondary">{futureModules.length} modul direncanakan</Badge>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {futureModules.map((module) => (
            <article key={module.id} className="rounded-xl border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{module.area}</p>
                  <h3 className="mt-1 font-semibold leading-5">{module.name}</h3>
                </div>
                <Badge variant="outline" className="shrink-0">Segera hadir</Badge>
              </div>
              <p className="mt-2 text-sm leading-5 text-muted-foreground">{module.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2" aria-label="Kebijakan dan dukungan">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Privasi, persetujuan dan bukti</CardTitle>
            <CardDescription>Catat data seperlunya. Jangan mengunggah identitas atau dokumen pribadi ke area publik.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Link className="text-sm font-medium text-primary underline-offset-4 hover:underline" href="/privasi">Kebijakan privasi</Link>
            <Link className="text-sm font-medium text-primary underline-offset-4 hover:underline" href="/dashboard/persetujuan">Persetujuan data</Link>
            <Link className="text-sm font-medium text-primary underline-offset-4 hover:underline" href="/dashboard/dokumen">Arsip berkas</Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Butuh bantuan lebih lanjut?</CardTitle>
            <CardDescription>Hubungi pengelola melalui saluran organisasi apabila akses, data, atau panduan tidak sesuai dengan tugas Anda.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4" href="/kontak">
              Hubungi pengelola <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
