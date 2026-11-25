import Link from "next/link";
import type { Metadata } from "next";
import { orgSummary } from "@/lib/org-summary";
import { FIELDS } from "@/config/fields";
import { ORG } from "@/config/org";
import { Avatar, Badge, Card, CardHeader, Notice, PageHeader, StatCard } from "@/components/ui";
import { formatDateID } from "@/lib/format";

export const metadata: Metadata = { title: "Struktur & Kepengurusan" };

const INTI_ROLES = ["Ketua", "Sekretaris", "Bendahara"];

export default async function StrukturPage() {
  // Susunan dibaca dari buku induk bersama: promosi/jabatan yang tercatat di
  // sana langsung tampil di sini.
  const { members: MEMBERS } = await orgSummary();
  const inti = MEMBERS.filter((m) => INTI_ROLES.includes(m.role));
  // A person is linked to a field through `field`, not through a job title (§8.2).
  const pengampuBidang = MEMBERS.filter((m) => m.field);
  const anggotaLain = MEMBERS.filter((m) => !INTI_ROLES.includes(m.role) && !m.field);

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Pengurus Harian"
        title="Struktur & kepengurusan"
        description="Susunan pengurus periode berjalan beserta lingkup mandatnya. Perubahan susunan hanya sah melalui dokumen keputusan yang tercatat."
        actions={<Link href="/app/sekretariat/sk" className="sb-btn sb-btn-outline">Dokumen SK</Link>}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Pengurus inti" value={inti.length} note="Ketua, Sekretaris, Bendahara" />
        <StatCard label="Pengampu bidang" value={pengampuBidang.length} note={`Dari ${FIELDS.length} bidang resmi`} tone="info" />
        <StatCard label="Anggota terdaftar" value={MEMBERS.length} note={`Total termasuk ${anggotaLain.length} anggota biasa`} tone="success" />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <Card>
          <CardHeader
            title="Pengurus inti"
            subtitle="Mandat organisasi & keputusan"
            action={<Badge tone="success">Aktif</Badge>}
          />
          <ul className="divide-y divide-line">
            {inti.map((m) => (
              <li key={m.id} className="flex items-start gap-3 px-4 py-3">
                <Avatar name={m.name} size={38} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13.5px] font-semibold text-ink">{m.name}</span>
                    <Badge tone="accent">{m.role}</Badge>
                  </div>
                  <div className="mt-0.5 text-[11.5px] text-muted">
                    {m.scope} · Desa {m.village} · sejak {formatDateID(m.joined, "long")}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {m.interests.map((i) => (
                      <span key={i} className="rounded-full bg-surface2 px-2 py-0.5 text-[10.5px] text-ink2">{i}</span>
                    ))}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader
            title="Pengampu bidang"
            subtitle="Satu bidang resmi = satu aplikasi operasional"
            action={<Link href="/app/pengurus/bidang" className="text-[11.5px] font-semibold text-primary-700">Lintas bidang →</Link>}
          />
          <ul className="divide-y divide-line">
            {pengampuBidang.map((m) => {
              const field = FIELDS.find((f) => f.slug === m.field);
              return (
                <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                  <Avatar name={m.name} size={34} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] font-semibold text-ink">{m.name}</div>
                    <div className="text-[11px] text-muted">{field?.shortName ?? m.scope}</div>
                  </div>
                  {field ? (
                    <Link href={field.appHref} className="sb-btn sb-btn-outline !px-2.5 !py-1 text-[11px]">Buka</Link>
                  ) : (
                    <Badge tone="warning">Belum ditetapkan</Badge>
                  )}
                  {FIELDS.every((f) => f.slug !== m.field) ? <Badge tone="warning">Bidang tak terdaftar</Badge> : null}
                </li>
              );
            })}
          </ul>
          <div className="border-t border-line px-4 py-2.5 text-[11px] text-muted2">
            Penanggung jawab bidang ditetapkan oleh pengurus. Bidang resmi tercatat di registry dan tidak dapat diubah tanpa tata cara perubahan (§8.3); jabatan tidak otomatis berarti bidang (§8.2).
          </div>
        </Card>
      </div>

      <div className="mt-5">
        <Card>
          <CardHeader
            title="Anggota & kepemimpinan lain"
            subtitle={`${anggotaLain.length} anggota dengan peran pendukung`}
            action={<Link href="/app/sekretariat/anggota" className="text-[11.5px] font-semibold text-primary-700">Buku induk →</Link>}
          />
          <div className="sb-scroll">
            <table className="sb-table min-w-[640px]">
              <thead>
                <tr><th>Nama</th><th>Peran</th><th>Lingkup</th><th>Desa</th><th>Bergabung</th><th>Status</th></tr>
              </thead>
              <tbody>
                {anggotaLain.map((m) => (
                  <tr key={m.id}>
                    <td className="font-medium text-ink">{m.name}</td>
                    <td className="text-ink2">{m.role}</td>
                    <td className="text-muted">{m.scope}</td>
                    <td className="text-muted">{m.village}</td>
                    <td className="whitespace-nowrap text-muted">{formatDateID(m.joined, "short")}</td>
                    <td><Badge tone={m.status === "aktif" ? "success" : m.status === "menunggu" ? "warning" : "neutral"}>{m.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="mt-5">
        <Notice tone="warning" title="Periode kepengurusan">
          {ORG.legalName} — masa bakti dan tata cara pergantian pengurus mengikuti AD/ART serta dokumen keputusan resmi.
          Data susunan di halaman ini adalah <strong>data demo berlabel</strong>, bukan salinan dokumen legal.
        </Notice>
      </div>
    </div>
  );
}
