import Link from "next/link";
import type { Metadata } from "next";
import { DOCUMENTS, MEETINGS } from "@/data/organization";
import { FIELDS } from "@/config/fields";
import { ORG } from "@/config/org";
import { Badge, Card, CardHeader, Notice, PageHeader, StatCard } from "@/components/ui";
import { formatDateID } from "@/lib/format";

export const metadata: Metadata = { title: "Struktur & SK" };

export default function SKPage() {
  const sk = DOCUMENTS.filter((d) => d.category === "SK");
  const finalDocs = DOCUMENTS.filter((d) => d.status === "final");

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Sekretariat"
        title="Struktur & surat keputusan"
        description="Dasar hukum susunan organisasi dan bidang resmi. Setiap perubahan susunan wajib merujuk SK yang berlaku."
        actions={<Link href="/app/pengurus/struktur" className="sb-btn sb-btn-outline">Susunan pengurus</Link>}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="SK tercatat" value={sk.length} note="Pendirian & kepengurusan" />
        <StatCard label="Dokumen final" value={finalDocs.length} note={`${DOCUMENTS.length} di arsip`} tone="success" />
        <StatCard label="Bidang disahkan" value={FIELDS.length} note="Registry bidang (§8.3)" tone="info" href="/app/pengurus/pengaturan" />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.05fr_1fr]">
        <Card>
          <CardHeader title="Surat keputusan" subtitle="Dokumen dasar yang mengikat" />
          <ul className="divide-y divide-line">
            {sk.map((d) => (
              <li key={d.id} className="px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-ink">{d.title}</div>
                    <div className="mt-0.5 font-mono text-[10.5px] text-muted2">{d.number}</div>
                  </div>
                  <Badge tone={d.visibility === "publik" ? "success" : "info"}>{d.visibility}</Badge>
                </div>
                <div className="mt-1 text-[11px] text-muted">
                  Ditetapkan {formatDateID(d.date, "long")} · pemilik {d.owner} · status {d.status}
                </div>
              </li>
            ))}
          </ul>
          <div className="border-t border-line px-4 py-2.5 text-[11px] text-muted2">
            Berkas SK tidak dilampirkan pada demo; hanya metadata yang ditampilkan.
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Struktur yang disahkan" subtitle="Pengurus inti & bidang resmi" />
            <div className="divide-y divide-line">
              <div className="px-4 py-2.5">
                <div className="sb-label mb-1">Pengurus inti</div>
                <div className="text-[12.5px] text-ink2">Ketua · Sekretaris · Bendahara</div>
              </div>
              <div className="px-4 py-2.5">
                <div className="sb-label mb-1">Bidang resmi</div>
                <ul className="space-y-1">
                  {FIELDS.map((f) => (
                    <li key={f.fieldId} className="flex items-center justify-between gap-2 text-[12px]">
                      <span className="text-ink2">{f.name}</span>
                      <span className="font-mono text-[10.5px] text-muted2">{f.fieldId}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="px-4 py-2.5">
                <div className="sb-label mb-1">Masa bakti</div>
                <div className="text-[12.5px] italic text-muted2">Belum tercatat dalam dokumen demo</div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Rapat penetapan" subtitle="Forum yang mengesahkan dokumen" action={<Link href="/app/pengurus/rapat" className="text-[11.5px] font-semibold text-primary-700">Rapat →</Link>} />
            <ul className="divide-y divide-line">
              {MEETINGS.filter((m) => m.decisions.length).map((m) => (
                <li key={m.id} className="px-4 py-2.5">
                  <div className="text-[12px] font-medium text-ink">{m.title}</div>
                  <div className="text-[10.5px] text-muted2">{formatDateID(m.date, "short")} · {m.decisions.length} keputusan</div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <div className="mt-5">
        <Notice tone="warning" title={`Status badan hukum: ${ORG.legalStatus}`}>
          {ORG.legalName} belum mencatatkan status badan hukum pada dokumen demo ini. Susunan pengurus dan bidang resmi
          ditampilkan sebagai data demo berlabel, bukan pengganti dokumen legal.
        </Notice>
      </div>
    </div>
  );
}
