import Link from "next/link";
import type { Metadata } from "next";
import { CircleSlash, ArrowLeft, ExternalLink } from "lucide-react";
import { Card, CardHeader, Notice, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Belum tersedia" };

/**
 * Penutup untuk halaman Studio yang belum dibangun.
 *
 * Sebelumnya rute-rute ini menyajikan tabel contoh dengan angka karangan dan
 * tanpa satu pun aksi simpan. Menampilkannya lebih berbahaya daripada tidak
 * ada: pengelola mengira aplikasi punya pembangun formulir, dasbor, dan alur
 * kerja yang sesungguhnya, lalu kecewa ketika tidak ada yang tersimpan.
 *
 * Komponen ini dipakai beberapa rute (aplikasi, data, dashboard, modul,
 * organisasi, rilis) yang isinya masih berupa tampilan statis. Isinya berkas
 * aslinya tidak dihapus supaya tetap menjadi bahan bila suatu hari benar-benar
 * dibangun.
 */
export function StudioBelumTersedia({ fitur }: { fitur: string }) {
  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Studio Pengelola"
        title={`${fitur} belum tersedia`}
        description="Bagian ini belum punya mesin di belakangnya, jadi tidak ditampilkan di menu."
      />

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader
            title="Mengapa disembunyikan"
            subtitle="Agar yang tampil hanya yang benar-benar bekerja"
            action={<CircleSlash size={16} className="text-muted" aria-hidden />}
          />
          <div className="space-y-3 px-4 pb-4 text-[12.5px] leading-relaxed text-ink2">
            <p>
              Halaman ini sebelumnya menampilkan tabel contoh — daftar field, widget, atau
              catatan rilis dengan angka tetap — tanpa satu pun tombol yang menyimpan ke
              basis data. Mengubah apa pun di layar itu tidak berpengaruh ke mana pun.
            </p>
            <p>
              Menampilkannya sebagai fitur utuh akan menyesatkan: pengelola mengira sudah
              memesan formulir atau dasbor baru, padahal yang tersimpan hanya di layar.
              Karena itu menunya dihapus sampai mesinnya benar-benar ada.
            </p>
            <p className="text-muted">
              Catatan teknis: berkas halamannya tidak dihapus. Bila nanti dibangun, cukup
              tambahkan kembali barisnya di <code className="font-mono text-[11px]">src/app/studio/layout.tsx</code>.
            </p>
          </div>
        </Card>

        <Card className="h-fit">
          <CardHeader title="Yang sudah bisa dipakai" subtitle="Bagian studio yang nyata" />
          <div className="space-y-2 p-4 text-[12.5px]">
            <Link
              href="/studio/website"
              className="flex items-center justify-between gap-2 rounded-[8px] border border-line bg-white px-3 py-2.5 font-semibold text-ink transition hover:border-primary hover:bg-surface2"
            >
              <span>
                Website Studio
                <span className="mt-0.5 block text-[11px] font-normal text-muted">
                  Teks beranda, halaman, katalog, menu — tersimpan ke basis data bersama
                </span>
              </span>
              <ExternalLink size={14} className="shrink-0 text-muted" aria-hidden />
            </Link>
            <Link
              href="/app"
              className="flex items-center gap-2 rounded-[8px] border border-line bg-white px-3 py-2.5 font-semibold text-ink transition hover:border-primary hover:bg-surface2"
            >
              <ArrowLeft size={14} aria-hidden className="text-muted" />
              Kembali ke aplikasi kerja
            </Link>
          </div>
        </Card>
      </div>

      <div className="mt-4"><Notice tone="info">
        Ingin fitur ini benar-benar dibangun? Sampaikan lewat Sekretariat — kebutuhan
        formulir, dasbor, dan alur kerja akan disusun bersama sebelum dikerjakan.
      </Notice></div>
    </div>
  );
}
