import type { Metadata } from "next";
import { FIELDS } from "@/config/fields";
import { MEMBERS } from "@/data/organization";
import { Badge, Card, CardHeader, Notice, PageHeader, StatusBadge } from "@/components/ui";
import { FIELD_APP_STATUS_LABEL } from "@/lib/session";

export const metadata: Metadata = { title: "Organization Studio" };

export default function OrganisasiStudio() {
  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Organization Studio"
        title="Registry bidang & struktur"
        description="Dua status yang tidak boleh dicampur: status pengesahan organisasi dan status konfigurasi aplikasi. Menonaktifkan modul teknis tidak meniadakan unit organisasi."
      />

      <Card>
        <CardHeader title="Approved Field Registry" subtitle="Atribut yang tidak tercatat ditandai eksplisit — tidak dikarang" action={<Badge tone="neutral">{FIELDS.length} bidang</Badge>} />
        <div className="sb-scroll">
          <table className="sb-table min-w-[980px]">
            <thead>
              <tr>
                <th>Field ID</th><th>Nama resmi</th><th>Kode</th><th>Mandat</th><th>Dasar keputusan</th>
                <th>Koordinator</th><th>Status organisasi</th><th>Status aplikasi</th>
              </tr>
            </thead>
            <tbody>
              {FIELDS.map((f) => (
                <tr key={f.fieldId}>
                  <td className="font-mono text-[11px] text-muted">{f.fieldId}</td>
                  <td className="font-medium text-ink">{f.name}</td>
                  <td><Badge tone="neutral">{f.code}</Badge></td>
                  <td className="max-w-[260px] text-[11.5px] text-muted">{f.mandate}</td>
                  <td className="text-[11px]">
                    <div className="text-muted">{f.decision.kind}</div>
                    <div className="text-[var(--sb-warning)]">No. {f.decision.number} · {f.decision.date}</div>
                  </td>
                  <td className="text-[11.5px] text-[var(--sb-warning)]">{f.coordinator}</td>
                  <td><Badge tone="success">Bidang resmi</Badge></td>
                  <td><StatusBadge status={FIELD_APP_STATUS_LABEL[f.appStatus]} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-line bg-paper px-4 py-2.5 text-[10.5px] text-muted2">
          Perubahan nama, penggabungan, atau penghapusan bidang hanya melalui keputusan organisasi
          yang berwenang (Blueprint §1.3). Sistem menyimpan versi, tanggal efektif, pengesah, dan histori.
        </div>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Anggota & penugasan" subtitle="Satu orang, banyak konteks" />
          <div className="sb-scroll">
            <table className="sb-table min-w-[480px]">
              <thead><tr><th>Nama</th><th>Peran</th><th>Cakupan</th><th>Status</th></tr></thead>
              <tbody>
                {MEMBERS.slice(0, 8).map((m) => (
                  <tr key={m.id}>
                    <td className="font-medium text-ink">{m.name}</td>
                    <td>{m.role}</td>
                    <td className="text-muted">{m.scope}</td>
                    <td><StatusBadge status={m.status === "aktif" ? "Aktif" : m.status === "menunggu" ? "Menunggu" : "Nonaktif"} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Aturan perubahan struktur" />
            <ol className="space-y-2 px-4 py-3 text-[12px] text-ink2">
              {[
                "Catat keputusan perubahan (nomor, tanggal, pengesah).",
                "Nonaktifkan/arsipkan unit lama sesuai masa berlaku.",
                "Buat unit baru; tentukan field_id permanen.",
                "Pindahkan/akhiri penugasan anggota dengan histori.",
                "Perbarui app instance & permission scope.",
                "Data lama tetap terkait unit saat record dibuat.",
              ].map((s, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-100 text-[10px] font-bold text-primary-800">{i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
          </Card>
          <Notice tone="warning" title="Data belum tercatat">
            Nomor/tanggal SK bidang, koordinator definitif, dan masa berlaku bertanda “Belum tercatat”.
            Isi melalui proses administrasi organisasi; jangan menebak.
          </Notice>
        </div>
      </div>
    </div>
  );
}
