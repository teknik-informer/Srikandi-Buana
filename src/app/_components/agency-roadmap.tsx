import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ClipboardList, Clock3, FileCheck2, ShieldCheck } from "lucide-react";
import { futureModules, operationalTemplates } from "@/features/agriculture/templates.mjs";

const readyTemplates = operationalTemplates.filter((item) => item.formStatus === "template_ready");
const plannedModules = futureModules;

export default function AgencyRoadmap() {
  return (
    <main className="workspace-page space-y-8" aria-labelledby="agency-roadmap-title">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          PERSIAPAN AGENCY & LAYANAN PETANI
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 id="agency-roadmap-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Template & Peta Pengembangan
          </h1>
          <Badge variant="outline">Tahap ToT</Badge>
        </div>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          Ruang persiapan formulir, prosedur dan modul Srikandi Buana. Template disiapkan lebih dahulu agar
          dapat disesuaikan dengan dokumen resmi setiap mitra saat diterima.
        </p>
      </header>

      <Card className="border-amber-500/30">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock3 className="size-5 text-amber-600" aria-hidden="true" />
            <CardTitle className="text-base">Status hubungan mitra saat ini</CardTitle>
            <Badge variant="outline">Belum ada perjanjian</Badge>
          </div>
          <CardDescription>
            Informasi ini mengikuti keterangan kelompok: hubungan masih pada tahap Training of Trainers (ToT).
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <p className="font-medium">Yang dapat dicatat sekarang</p>
            <p className="mt-1 text-muted-foreground">
              Penjajakan, sesi ToT yang benar-benar berlangsung, daftar hadir, materi, pembelajaran,
              rencana aksi dan dokumen yang diminta atau diterima.
            </p>
          </div>
          <div>
            <p className="font-medium">Yang belum boleh dianggap aktif</p>
            <p className="mt-1 text-muted-foreground">
              Perjanjian program, dana hibah, target penerima manfaat, anggaran, sertifikasi atau
              kewajiban pelaporan yang belum diterbitkan dan disetujui.
            </p>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-4" aria-labelledby="template-ready-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <FileCheck2 className="size-5 text-primary" aria-hidden="true" />
              <h2 id="template-ready-title" className="text-xl font-semibold">Template dasar yang sudah disiapkan</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Struktur kolom dan validasi awal sudah tersedia. Formulir digital, penyimpanan dan persetujuan belum diaktifkan.
            </p>
          </div>
          <Badge variant="secondary">{readyTemplates.length} template</Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {readyTemplates.map((template) => (
            <Card key={template.id} className="min-w-0">
              <CardHeader className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline">Template v{template.version}</Badge>
                  <span className="text-xs text-muted-foreground">{template.category}</span>
                </div>
                <CardTitle className="text-base">{template.name}</CardTitle>
                <CardDescription>{template.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <details className="group rounded-lg border px-3 py-2">
                  <summary className="cursor-pointer text-sm font-medium">
                    Lihat struktur isian ({template.fields.length})
                  </summary>
                  <div className="mt-3 space-y-3">
                    {template.sections.map((section) => {
                      const fields = template.fields.filter((item) => item.section === section.id);
                      if (!fields.length) return null;
                      return (
                        <div key={section.id}>
                          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {section.title}
                          </h3>
                          <ul className="mt-1 list-inside list-disc space-y-1 text-sm">
                            {fields.map((item) => (
                              <li key={item.key}>
                                {item.label}
                                {item.required ? <span className="text-destructive"> *</span> : null}
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                </details>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4" aria-labelledby="coming-soon-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <ClipboardList className="size-5 text-primary" aria-hidden="true" />
              <h2 id="coming-soon-title" className="text-xl font-semibold">Modul yang akan dikembangkan</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Kartu berikut adalah peta kemampuan. Belum dapat dibuka atau digunakan untuk memasukkan data.
            </p>
          </div>
          <Badge variant="secondary">{plannedModules.length} modul direncanakan</Badge>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {plannedModules.map((module) => (
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

      <section className="flex items-start gap-3 rounded-xl border p-4" aria-label="Prinsip pengembangan">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
        <div>
          <h2 className="font-semibold">Prinsip pengaktifan modul</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Modul baru dibuka setelah format resmi diperiksa, aturan akses ditetapkan, alur simpan dan audit diuji,
            serta lolos QA. Label “Segera hadir” tidak membuat tautan mati, data contoh atau tombol yang belum berfungsi.
          </p>
        </div>
      </section>
    </main>
  );
}
