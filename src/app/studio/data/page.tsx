import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Database, FileText } from "lucide-react";
import { Card, CardHeader, EmptyState, Notice, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Data & Form Builder" };

const operationalModules = [
  { label: "Buku Induk Anggota", description: "Data keanggotaan aktif dan status verifikasi", href: "/app/bidang/organisasi/data" },
  { label: "Data Pertanian & Produksi", description: "Lahan, komoditas, kegiatan lapangan dan produksi", href: "/app/bidang/pertanian/data" },
  { label: "Pelatihan & Peserta", description: "Sesi, pendaftaran dan pelaksanaan pelatihan", href: "/app/bidang/pelatihan/data" },
  { label: "Produk & Persediaan", description: "Produk, gudang dan mutasi stok", href: "/app/bidang/usaha/katalog" },
  { label: "Pelanggan & Pesanan", description: "Register pelanggan dan pesanan usaha", href: "/app/bidang/usaha/pesanan" },
  { label: "Surat & Arsip", description: "Register surat dan dokumen Sekretariat", href: "/app/sekretariat/surat" },
  { label: "Jurnal Keuangan", description: "Pencatatan akuntansi melalui jurnal berpasangan", href: "/app/keuangan/jurnal" },
];

export default function DataStudio() {
  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Data & Form Builder"
        title="Struktur data & formulir"
        description="Akses ke modul domain yang sudah menyimpan data ke organisasi. Builder formulir generik tidak ditampilkan sebagai aktif sebelum definisi, versi, validasi, dan penyimpanan jawabannya tersedia."
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
        <Card>
          <CardHeader
            title="Modul pendataan operasional"
            subtitle="Sumber pencatatan sesuai domain pemilik data"
            action={<Database size={16} className="text-muted2" />}
          />
          <div className="divide-y divide-line">
            {operationalModules.map((module) => (
              <Link key={module.href} href={module.href} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-paper">
                <span className="min-w-0">
                  <span className="block text-[12px] font-semibold text-ink">{module.label}</span>
                  <span className="mt-0.5 block text-[10.5px] text-muted">{module.description}</span>
                </span>
                <ArrowRight size={13} className="shrink-0 text-muted2" />
              </Link>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <Notice tone="warning" title="Form Builder generik belum diaktifkan">
            Belum ada registry form, versi form, skema jawaban, aturan validasi konfiguratif, atau ekspor dinamis yang tersimpan per organisasi. Data operasional yang tersedia tetap menggunakan form domain dengan validasi server.
          </Notice>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-[12.5px] font-semibold text-ink">
              <FileText size={15} className="text-muted2" />
              Batas perubahan skema
            </div>
            <ul className="mt-3 space-y-2 text-[11.5px] text-muted">
              <li>Perubahan label dan tampilan form domain mengikuti rilis kode yang direview.</li>
              <li>Penambahan tabel, relasi, dan tipe data inti memerlukan migrasi database.</li>
              <li>Aturan keuangan, persediaan, identitas, dan persetujuan tidak dapat ditulis dari browser.</li>
            </ul>
          </Card>
        </div>
      </div>

      <div className="mt-4">
        <EmptyState
          title="Belum ada definisi formulir dinamis"
          body="Tidak ada jumlah formulir, contoh field, atau view yang ditampilkan sebagai aktif karena definisi tersebut belum terdaftar pada penyimpanan organisasi."
        />
      </div>
    </div>
  );
}
