import Link from "next/link";
import type { Metadata } from "next";
import { orgSummary } from "@/lib/org-summary";
import { FIELDS } from "@/config/fields";
import { ORG } from "@/config/org";
import { Avatar, Badge, Card, CardHeader, Notice, PageHeader, Progress, StatCard } from "@/components/ui";
import { formatDateID } from "@/lib/format";

export const metadata: Metadata = { title: "Anggota & Keanggotaan" };

export default async function KeanggotaanPage() {
  const { members: MEMBERS } = await orgSummary();
  const aktif = MEMBERS.filter((m) => m.status === "aktif");
  const menunggu = MEMBERS.filter((m) => m.status === "menunggu");
  const nonaktif = MEMBERS.filter((m) => m.status === "nonaktif");

  const perField = FIELDS.map((f) => ({
    field: f,
    list: aktif.filter((m) => m.field === f.slug),
  }));

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Pengurus Harian"
        title="Anggota & keanggotaan"
        description="Ringkasan keanggotaan menurut status dan bidang. Catatan rinci per orang — termasuk verifikasi pendaftaran — dikelola Sekretariat di buku induk."
        actions={<Link href="/app/sekretariat/anggota" className="sb-btn sb-btn-outline">Buku induk (Sekretariat)</Link>}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Anggota aktif" value={aktif.length} note={`${MEMBERS.length} tercatat keseluruhan`} tone="success" />
        <StatCard label="Menunggu verifikasi" value={menunggu.length} note="Perlu keputusan sekretariat" tone="warning" href="/app/sekretariat/anggota" />
        <StatCard label="Nonaktif" value={nonaktif.length} note="Keluar / pindah domisili" tone="neutral" />
        <StatCard label="Bidang resmi" value={FIELDS.length} note="Sesuai registry" tone="info" href="/app/pengurus/bidang" />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1.15fr]">
        <Card>
          <CardHeader title="Sebaran per bidang" subtitle="Satu anggota boleh terkait satu bidang operasional" />
          <ul className="divide-y divide-line">
            {perField.map(({ field, list }) => (
              <li key={field.fieldId} className="px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[12.5px] font-semibold text-ink">{field.shortName}</div>
                  <Badge tone="neutral">{list.length} orang</Badge>
                </div>
                <div className="mt-1.5">
                  <Progress value={Math.round((list.length / Math.max(1, aktif.filter((m) => m.field).length)) * 100)} />
                </div>
                {list.length ? (
                  <div className="mt-1.5 text-[11px] text-muted">{list.map((m) => m.name).join(" · ")}</div>
                ) : (
                  <div className="mt-1.5 text-[11px] text-muted2">Belum tercatat pengampu</div>
                )}
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader
            title="Menunggu verifikasi"
            subtitle="Pendaftaran yang belum diputuskan"
            action={<Badge tone={menunggu.length ? "warning" : "success"}>{menunggu.length} antrean</Badge>}
          />
          {menunggu.length ? (
            <ul className="divide-y divide-line">
              {menunggu.map((m) => (
                <li key={m.id} className="flex items-start gap-3 px-4 py-3">
                  <Avatar name={m.name} size={34} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] font-semibold text-ink">{m.name}</div>
                    <div className="text-[11px] text-muted">
                      Didaftarkan {formatDateID(m.joined, "long")} · {m.village}
                    </div>
                    <div className="mt-1 text-[11px] text-muted2">
                      Verifikasi dilakukan Sekretariat; keputusan tercatat di buku induk.
                    </div>
                  </div>
                  <Link href="/app/sekretariat/anggota" className="sb-btn sb-btn-outline !px-2.5 !py-1 text-[11px]">Tinjau</Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-8 text-center text-[12.5px] text-muted">Tidak ada pendaftaran menunggu.</div>
          )}
          <div className="border-t border-line px-4 py-2.5 text-[11px] text-muted2">
            Pengurus tidak mengubah data keanggotaan langsung — kewenangan pencatatan ada di Sekretariat (§9.3, §15.2).
          </div>
        </Card>
      </div>

      <div className="mt-5">
        <Card>
          <CardHeader title="Daftar anggota aktif" subtitle={`${aktif.length} orang · data demo berlabel`} />
          <div className="sb-scroll">
            <table className="sb-table min-w-[720px]">
              <thead>
                <tr><th>Nama</th><th>Peran</th><th>Lingkup</th><th>Desa</th><th>Bergabung</th><th>Status</th></tr>
              </thead>
              <tbody>
                {aktif.map((m) => (
                  <tr key={m.id}>
                    <td className="font-medium text-ink">{m.name}</td>
                    <td className="text-ink2">{m.role}</td>
                    <td className="text-muted">{m.scope}</td>
                    <td className="text-muted">{m.village}</td>
                    <td className="whitespace-nowrap text-muted">{formatDateID(m.joined, "short")}</td>
                    <td><Badge tone="success">aktif</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="mt-5">
        <Notice tone="info" title="Kebijakan keanggotaan">
          Ketentuan iuran, syarat penerimaan, dan hak suara anggota berstatus <strong>{ORG.duesStatus}</strong> sampai ada
          keputusan resmi organisasi. Modul tidak mengasumsikan adanya iuran wajib (§9.4.1).
        </Notice>
      </div>
    </div>
  );
}
