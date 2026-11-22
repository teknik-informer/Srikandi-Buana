import Link from "next/link";
import type { Metadata } from "next";
import { MEMBERS } from "@/data/organization";
import { Badge, Card, CardHeader, EmptyState, Notice, PageHeader, StatCard } from "@/components/ui";
import { formatDateID, daysUntil } from "@/lib/format";

export const metadata: Metadata = { title: "Pendaftaran & Verifikasi" };

const CHECKLIST = [
  "Identitas dan domisili sesuai data desa",
  "Bersedia mengikuti ketentuan organisasi",
  "Tidak merangkap keanggotaan kelompok tani lain di desa yang sama",
  "Persetujuan pencatatan data pribadi (demo: belum ada formulir resmi)",
];

export default function VerifikasiPage() {
  const menunggu = MEMBERS.filter((m) => m.status === "menunggu");
  const aktif = MEMBERS.filter((m) => m.status === "aktif");

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Sekretariat"
        title="Pendaftaran & verifikasi anggota"
        description="Antrean pendaftaran yang masuk dari formulir publik, beserta daftar periksa verifikasi. Keputusan dicatat ke buku induk dan tidak dapat dihapus."
        actions={<Link href="/app/sekretariat/anggota" className="sb-btn sb-btn-outline">Buku induk</Link>}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Menunggu keputusan" value={menunggu.length} note="Antrean aktif" tone={menunggu.length ? "warning" : "success"} />
        <StatCard label="Diterima periode ini" value={aktif.length} note="Tercatat sebagai anggota aktif" tone="success" />
        <StatCard label="Sla tinjauan" value="7 hari" note="Belum ditetapkan resmi — target demo" tone="neutral" />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <Card>
          <CardHeader
            title="Antrean verifikasi"
            subtitle="Pendaftaran dari halaman gabung publik"
            action={<Badge tone={menunggu.length ? "warning" : "success"}>{menunggu.length} menunggu</Badge>}
          />
          {menunggu.length ? (
            <div className="divide-y divide-line">
              {menunggu.map((m) => {
                const d = daysUntil(m.joined);
                return (
                  <div key={m.id} className="px-4 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold text-ink">{m.name}</div>
                        <div className="mt-0.5 text-[11px] text-muted">
                          Mendaftar {formatDateID(m.joined, "long")} · Desa {m.village} · {m.phone}
                        </div>
                        <div className="mt-1 text-[11px] text-muted2">
                          Minat: {m.interests.join(", ") || "Belum tercatat"}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <Badge tone="warning">menunggu</Badge>
                        <div className="mt-1 text-[10.5px] text-muted2">
                          {d <= 0 ? `${Math.abs(d)} hari di antrean` : `${d} hari`}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <button type="button" disabled title="Aksi keputusan memerlukan basis data dan jejak audit — tidak aktif pada demo." className="sb-btn sb-btn-primary !py-1 !px-2.5 text-[11px] opacity-60">
                        Terima
                      </button>
                      <button type="button" disabled title="Aksi keputusan memerlukan basis data dan jejak audit — tidak aktif pada demo." className="sb-btn sb-btn-outline !py-1 !px-2.5 text-[11px] opacity-60">
                        Minta perbaikan
                      </button>
                      <span className="text-[10.5px] text-muted2">Nonaktif pada demo — lihat catatan di bawah.</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-4 py-8">
              <EmptyState title="Antrean kosong" body="Semua pendaftaran sudah diputuskan." />
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Daftar periksa verifikasi" subtitle="Dipakai konsisten untuk setiap pendaftar" />
            <ul className="space-y-2 px-4 py-3">
              {CHECKLIST.map((c) => (
                <li key={c} className="flex items-start gap-2 text-[12px] text-ink2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--sb-primary-500)]" />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
            <div className="border-t border-line px-4 py-2.5 text-[11px] text-muted2">
              Syarat resmi penerimaan anggota <strong>belum ditetapkan</strong> oleh organisasi; daftar periksa ini adalah kerangka kerja demo.
            </div>
          </Card>

          <Notice tone="warning" title="Mengapa tombol keputusan nonaktif">
            Menerima atau menolak anggota mengubah buku induk dan harus meninggalkan jejak audit. Tanpa basis data dan
            autentikasi nyata, aksi semacam itu hanya akan menyesatkan — jadi ditampilkan nonaktif dengan alasan, bukan
            tombol yang berpura-pura bekerja.
          </Notice>
        </div>
      </div>
    </div>
  );
}
