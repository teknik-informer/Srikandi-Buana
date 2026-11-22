import type { Metadata } from "next";
import { STUDIO_PAGES } from "@/data/content";
import { Badge, Card, CardHeader, Notice, PageHeader, StatusBadge } from "@/components/ui";

const RELEASES = [
  { id: "REL-2026-11-20", scope: "Website — Beranda", type: "konten", by: "Sekretariat", status: "terbit", note: "Tambah blok kutipan & perbarui angka panen" },
  { id: "REL-2026-11-19", scope: "Katalog produk", type: "konfigurasi", by: "Bidang Usaha", status: "terbit", note: "Publikasikan 2 produk, sembunyikan 1 produk stok habis" },
  { id: "REL-2026-11-18", scope: "Dashboard Pengurus", type: "konfigurasi", by: "Pengurus", status: "terbit", note: "Tambah widget approval 2 kolom" },
  { id: "REL-2026-11-22", scope: "Halaman Kemitraan", type: "konten", by: "Sekretariat", status: "review", note: "Draf pembaruan daftar mitra menunggu persetujuan ketua" },
  { id: "REL-2026-11-22", scope: "Workflow pengajuan anggaran", type: "konfigurasi", by: "Bendahara", status: "draft", note: "Usulan ambang persetujuan — menunggu keputusan resmi" },
];

export default function RilisStudio() {
  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Release Manager"
        title="Rilis, pratinjau & riwayat"
        description="Perubahan konfigurasi memiliki draf, pratinjau, persetujuan, publikasi, riwayat, dan rollback. Rollback konfigurasi dibedakan dari migrasi data."
      />
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader title="Riwayat rilis" subtitle="Konfigurasi & konten" action={<Badge tone="neutral">5 entri</Badge>} />
          <div className="divide-y divide-line">
            {RELEASES.map((r, i) => (
              <div key={i} className="flex flex-wrap items-start justify-between gap-2 px-4 py-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10.5px] text-muted">{r.id}</span>
                    <Badge tone={r.type === "konten" ? "info" : "accent"}>{r.type}</Badge>
                  </div>
                  <div className="mt-0.5 text-[12.5px] font-semibold text-ink">{r.scope}</div>
                  <div className="text-[11px] text-muted">{r.note}</div>
                  <div className="text-[10.5px] text-muted2">oleh {r.by}</div>
                </div>
                <StatusBadge status={r.status === "terbit" ? "Terbit" : r.status === "review" ? "Review" : "Draf"} />
              </div>
            ))}
          </div>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader title="Status halaman" />
            <div className="divide-y divide-line">
              {STUDIO_PAGES.map((p) => (
                <div key={p.path} className="flex items-center justify-between gap-2 px-4 py-2">
                  <span className="font-mono text-[11px] text-ink2">{p.path}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10.5px] text-muted2">{p.revisions} revisi</span>
                    <StatusBadge status={p.status === "published" ? "Terbit" : p.status} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Notice tone="warning" title="Rollback vs migrasi">
            Rollback mengembalikan konfigurasi ke versi sebelumnya. Migrasi data bersifat satu arah dan
            memerlukan backup, validasi row count/checksum, serta rencana pemulihan.
          </Notice>
          <Card className="p-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Pratinjau</div>
            <p className="mt-1 text-[12px] leading-relaxed text-ink2">
              Perubahan berstatus draf/review tidak memengaruhi website live. Pratinjau memakai data
              yang sama dengan produksi tetapi tanpa mengubah konten publik.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
