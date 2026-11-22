import type { Metadata } from "next";
import { Card, CardHeader, Notice, PageHeader, Badge, StatCard } from "@/components/ui";

export const metadata: Metadata = { title: "Data & Form Builder" };

const FORM_FIELDS = [
  { name: "nama_peserta", type: "Teks", required: true, rules: "min 3 · wajib" },
  { name: "tanggal_kegiatan", type: "Tanggal", required: true, rules: "tidak di masa lalu" },
  { name: "bidang_terkait", type: "Pilihan", required: true, rules: "dari registry bidang" },
  { name: "jumlah_peserta", type: "Angka", required: true, rules: "1–200" },
  { name: "anggaran", type: "Uang", required: false, rules: "≤ sisa anggaran program" },
  { name: "lampiran_proposal", type: "Berkas", required: true, rules: "PDF · maks 4 MB" },
  { name: "catatan", type: "Teks panjang", required: false, rules: "maks 1.000 karakter" },
];

export default function DataStudio() {
  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Data & Form Builder"
        title="Struktur data & formulir"
        description="Field, validasi, dan view dikonfigurasi dari antarmuka. Validasi server tetap otoritatif; perubahan skema inti memerlukan migrasi developer."
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Formulir aktif" value={12} note="5 internal · 7 eksternal" tone="success" />
        <StatCard label="View terdaftar" value={9} note="Tabel, kartu, kalender, kanban" tone="info" />
        <StatCard label="Perubahan skema menunggu" value={1} note="Perlu migrasi developer" tone="warning" />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader title="Contoh formulir: Pengajuan Kegiatan Bidang" subtitle="Field, tipe, dan aturan validasi" action={<Badge tone="success">Aktif</Badge>} />
          <div className="sb-scroll">
            <table className="sb-table min-w-[560px]">
              <thead><tr><th>Field</th><th>Tipe</th><th>Wajib</th><th>Aturan</th></tr></thead>
              <tbody>
                {FORM_FIELDS.map((f) => (
                  <tr key={f.name}>
                    <td className="font-mono text-[11.5px] font-medium text-ink">{f.name}</td>
                    <td><Badge tone="neutral">{f.type}</Badge></td>
                    <td>{f.required ? <Badge tone="danger">Wajib</Badge> : <span className="text-muted2">opsional</span>}</td>
                    <td className="text-muted">{f.rules}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-line bg-paper px-4 py-2.5 text-[10.5px] text-muted2">
            Form binding menyimpan ke entity domain yang benar (program_activity), bukan tabel generik.
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Batas perubahan schema" />
            <ul className="space-y-2 px-4 py-3 text-[12px] text-ink2">
              {[
                ["Field baru pada form konfiguratif", "Boleh dari Studio"],
                ["Ubah label & urutan field", "Boleh dari Studio"],
                ["Tambah tipe/relasi inti baru", "Migrasi developer + backup"],
                ["Ubah aturan ledger / stock posting", "Dilarang dari form builder"],
                ["Ubah field yang dilindungi", "Ditolak; perlu review"],
              ].map(([k, v]) => (
                <li key={k} className="flex items-start justify-between gap-3">
                  <span>{k}</span>
                  <span className={`shrink-0 text-right text-[11px] ${v.includes("Boleh") ? "text-[var(--sb-success)]" : "text-[var(--sb-warning)]"}`}>{v}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Notice tone="info" title="View Builder">
            View hanya dapat mengambil data dalam scope pengguna. Filter lintas scope tanpa izin akan
            menghasilkan empty state, bukan kebocoran data.
          </Notice>
        </div>
      </div>
    </div>
  );
}
