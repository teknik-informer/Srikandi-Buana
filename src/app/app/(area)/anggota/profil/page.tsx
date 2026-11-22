import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getIdentity } from "@/lib/session";
import { MEMBERS } from "@/data/organization";
import { Card, CardHeader, PageHeader, Notice, Badge } from "@/components/ui";
import { formatDateID } from "@/lib/format";

export const metadata: Metadata = { title: "Profil Saya" };

export default async function ProfilAnggotaPage() {
  const identity = await getIdentity();
  if (!identity) redirect("/masuk");
  const me = MEMBERS.find((m) => m.id === identity.memberId);

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Portal Anggota"
        title="Profil saya"
        description="Tiga lapisan profil: data pribadi yang Anda kelola, data keanggotaan resmi, dan preferensi tampilan."
      />

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <Card>
          <CardHeader title="Data yang dapat Anda ubah" subtitle="Perubahan langsung tersimpan pada profil pribadi" />
          <div className="space-y-4 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="nama" className="mb-1 block text-[12px] font-semibold text-ink2">Nama tampilan</label>
                <input id="nama" className="sb-input" defaultValue={identity.name} />
              </div>
              <div>
                <label htmlFor="telp" className="mb-1 block text-[12px] font-semibold text-ink2">Nomor WhatsApp</label>
                <input id="telp" className="sb-input" defaultValue={me?.phone ?? ""} />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="minat" className="mb-1 block text-[12px] font-semibold text-ink2">Minat &amp; keterampilan</label>
                <input id="minat" className="sb-input" defaultValue={me?.interests.join(", ") ?? ""} />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="bio" className="mb-1 block text-[12px] font-semibold text-ink2">Tentang saya</label>
                <textarea id="bio" rows={3} className="sb-input" placeholder="Ceritakan lahan, pengalaman, atau keahlian Anda" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button type="button" className="sb-btn sb-btn-primary" disabled>Simpan perubahan</button>
              <span className="text-[10.5px] text-muted2">Penyimpanan dinonaktifkan pada demo.</span>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Data keanggotaan resmi" subtitle="Tidak dapat diubah sendiri" action={<Badge tone="warning">Read-only</Badge>} />
            <dl className="divide-y divide-line text-[12.5px]">
              {[
                ["ID anggota", me?.id ?? "—"],
                ["Nama resmi", me?.name ?? "—"],
                ["Peran", identity.role],
                ["Cakupan", identity.scope],
                ["Desa", me?.village ?? "—"],
                ["Tanggal bergabung", me ? formatDateID(me.joined) : "—"],
                ["Status", me?.status ?? "—"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between px-4 py-2.5"><dt className="text-muted">{k}</dt><dd className="font-medium text-ink">{v}</dd></div>
              ))}
            </dl>
            <div className="border-t border-line px-4 py-2.5 text-[10.5px] text-muted2">
              Perubahan data resmi melalui Bidang Organisasi &amp; Keanggotaan dengan jejak perubahan.
            </div>
          </Card>

          <Card>
            <CardHeader title="Privasi profil" subtitle="Kendali Anda atas keterlihatan data" />
            <ul className="divide-y divide-line text-[12px]">
              {[
                ["Nomor WhatsApp", "Hanya pengurus & tim bidang", true],
                ["Lokasi lahan", "Disembunyikan dari publik", true],
                ["Foto kegiatan", "Perlu persetujuan publikasi", true],
                ["Minat & keterampilan", "Terlihat oleh anggota", false],
              ].map(([k, v, active]) => (
                <li key={String(k)} className="flex items-center justify-between gap-2 px-4 py-2.5">
                  <div><div className="font-medium text-ink">{k}</div><div className="text-[10.5px] text-muted2">{v}</div></div>
                  <Badge tone={active ? "success" : "neutral"}>{active ? "Dibatasi" : "Dibuka"}</Badge>
                </li>
              ))}
            </ul>
          </Card>

          <Notice tone="info" title="Satu identitas, banyak konteks">
            Akun yang sama dapat memiliki peran berbeda pada cakupan berbeda. Pergantian konteks
            selalu eksplisit melalui menu akun — bukan otomatis.
          </Notice>
        </div>
      </div>
    </div>
  );
}
