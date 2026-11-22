import Link from "next/link";
import type { Metadata } from "next";
import { MEMBERS, LETTERS } from "@/data/organization";
import { FIELDS } from "@/config/fields";
import { ORG } from "@/config/org";
import { Avatar, Badge, Card, CardHeader, Notice, PageHeader, StatCard, Tabs } from "@/components/ui";
import { formatDateID } from "@/lib/format";

export const metadata: Metadata = { title: "Buku Induk Anggota" };

export default async function BukuIndukPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const active = status ?? "aktif";
  const list = MEMBERS.filter((m) => m.status === active);
  const count = (s: string) => MEMBERS.filter((m) => m.status === s).length;

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Sekretariat"
        title="Buku induk anggota"
        description="Catatan induk keanggotaan: identitas dasar, lingkup, bidang, dan status. Inilah sumber kebenaran data anggota — aplikasi lain hanya membaca."
        actions={<Link href="/studio/data" className="sb-btn sb-btn-outline">Struktur data</Link>}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Anggota aktif" value={count("aktif")} note={`${MEMBERS.length} nomor induk`} tone="success" />
        <StatCard label="Menunggu verifikasi" value={count("menunggu")} note="Pendaftaran baru" tone="warning" />
        <StatCard label="Nonaktif" value={count("nonaktif")} note="Arsip — riwayat tetap disimpan" tone="neutral" />
      </div>

      <div className="mt-4">
        <Tabs
          active={active}
          tabs={[
            { key: "aktif", label: `Aktif (${count("aktif")})`, href: "/app/sekretariat/anggota?status=aktif" },
            { key: "menunggu", label: `Menunggu (${count("menunggu")})`, href: "/app/sekretariat/anggota?status=menunggu" },
            { key: "nonaktif", label: `Nonaktif (${count("nonaktif")})`, href: "/app/sekretariat/anggota?status=nonaktif" },
          ]}
        />
      </div>

      <div className="mt-4">
        <Card>
          <CardHeader
            title={active === "aktif" ? "Anggota aktif" : active === "menunggu" ? "Antrean verifikasi" : "Arsip anggota"}
            subtitle={`${list.length} baris`}
            action={<Badge tone="neutral">Data demo berlabel</Badge>}
          />
          {list.length ? (
            <div className="sb-scroll">
              <table className="sb-table min-w-[880px]">
                <thead>
                  <tr><th>No. induk</th><th>Nama</th><th>Peran</th><th>Bidang</th><th>Desa</th><th>Bergabung</th><th>Kontak</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {list.map((m) => {
                    const f = FIELDS.find((x) => x.slug === m.field);
                    return (
                      <tr key={m.id}>
                        <td className="whitespace-nowrap font-mono text-[11px] text-muted">{m.id}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <Avatar name={m.name} size={26} />
                            <span className="font-medium text-ink">{m.name}</span>
                          </div>
                        </td>
                        <td className="text-ink2">{m.role}</td>
                        <td className="text-muted">{f?.shortName ?? "—"}</td>
                        <td className="text-muted">{m.village}</td>
                        <td className="whitespace-nowrap text-muted">{formatDateID(m.joined, "short")}</td>
                        <td className="whitespace-nowrap text-muted">{m.phone}</td>
                        <td><Badge tone={m.status === "aktif" ? "success" : m.status === "menunggu" ? "warning" : "neutral"}>{m.status}</Badge></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-4 py-10 text-center text-[12.5px] text-muted">Tidak ada anggota pada status ini.</div>
          )}
        </Card>
      </div>

      <div className="mt-5">
        <Notice tone="info" title="Privasi data anggota">
          Nomor telepon ditampilkan karena ini lingkungan demo. Pada penggunaan nyata, akses data pribadi dibatasi menurut peran
          (§13.4) dan tercatat pada audit akses. Ketentuan iuran: <strong>{ORG.duesStatus}</strong>.
          Surat resmi terkait keanggotaan tercatat di <Link href="/app/sekretariat/surat" className="font-semibold text-primary-700">registrasi surat</Link> —{" "}
          {LETTERS.length} surat saat ini.
        </Notice>
      </div>
    </div>
  );
}
