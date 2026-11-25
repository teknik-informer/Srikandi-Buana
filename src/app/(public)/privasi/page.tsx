import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Card, CardHeader, Notice, PageHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "Kebijakan Privasi",
  description: "Penjelasan pemrosesan data pada formulir minat bergabung Srikandi Buana.",
};

export default function PrivasiPage() {
  return (
    <div className="sb-shell py-12">
      <PageHeader
        eyebrow="Perlindungan data"
        title="Kebijakan privasi formulir minat bergabung"
        description="Informasi ini menjelaskan data yang diminta pada formulir publik, tujuan pemrosesan, pencatatan persetujuan, dan batas kebijakan yang belum ditetapkan secara rinci."
      />

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          <Card>
            <CardHeader title="1. Data yang dikumpulkan" />
            <div className="px-5 py-4 text-[12.5px] leading-relaxed text-ink2">
              Formulir meminta nama lengkap, nomor WhatsApp, alamat/dusun, bidang kegiatan yang diminati, pengalaman bertani, serta catatan tambahan yang bersifat opsional. Formulir juga menyimpan nomor referensi pengajuan, status, waktu pembuatan, versi persetujuan, dan waktu persetujuan.
            </div>
          </Card>

          <Card>
            <CardHeader title="2. Tujuan pemrosesan" />
            <div className="px-5 py-4 text-[12.5px] leading-relaxed text-ink2">
              Data digunakan untuk mencatat minat bergabung, menghubungi pemohon, meninjau kelengkapan informasi, melakukan verifikasi, mencatat keputusan pengurus, dan mencegah pengiriman ulang pengajuan dengan kombinasi nama serta nomor WhatsApp yang sama dalam 15 menit. Mengirim formulir tidak otomatis menjadikan seseorang anggota resmi dan tidak otomatis membuat akun login.
            </div>
          </Card>

          <Card>
            <CardHeader title="3. Penyimpanan dan akses" />
            <div className="px-5 py-4 text-[12.5px] leading-relaxed text-ink2">
              Pengajuan disimpan pada register minat keanggotaan organisasi. Akses untuk meninjau pengajuan dibatasi pada akun internal yang memiliki kewenangan pemeriksaan keanggotaan. Catatan pengajuan tidak ditampilkan sebagai daftar publik.
            </div>
          </Card>

          <Card>
            <CardHeader title="4. Persetujuan" />
            <div className="px-5 py-4 text-[12.5px] leading-relaxed text-ink2">
              Saat formulir dikirim, sistem merekam versi teks persetujuan dan waktu persetujuan bersama pengajuan. Versi persetujuan yang digunakan pada formulir saat ini adalah <code className="rounded bg-paper px-1 py-0.5 text-[10.5px]">v9.1-membership-interest-2026-11-23</code>.
            </div>
          </Card>

          <Card>
            <CardHeader title="5. Masa simpan dan permintaan perubahan" />
            <div className="px-5 py-4 text-[12.5px] leading-relaxed text-ink2">
              Jadwal retensi/penghapusan khusus untuk pengajuan minat belum dipublikasikan sebagai kebijakan organisasi. Karena itu halaman ini tidak menjanjikan masa simpan tertentu. Untuk permintaan koreksi atau penarikan minat, pemohon dapat menghubungi Sekretariat melalui kanal organisasi yang telah disahkan; kanal kontak resmi belum tercatat pada registry publik saat ini.
            </div>
          </Card>

          <Card>
            <CardHeader title="6. Pembagian data" />
            <div className="px-5 py-4 text-[12.5px] leading-relaxed text-ink2">
              Data pengajuan tidak menjadi informasi publik dan tidak ditampilkan pada website. Penggunaan untuk keperluan lain di luar proses minat dan verifikasi keanggotaan memerlukan dasar serta persetujuan yang sesuai. Rincian perjanjian pengolahan data dengan penyedia layanan teknis belum dipublikasikan pada halaman ini.
            </div>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 text-[12.5px] font-semibold text-ink">
              <ShieldCheck size={16} className="text-primary-700" />
              Ringkasan
            </div>
            <ul className="mt-3 space-y-2 text-[11.5px] leading-relaxed text-muted">
              <li>Pengajuan bukan keanggotaan resmi.</li>
              <li>Data kontak dipakai untuk verifikasi dan tindak lanjut.</li>
              <li>Persetujuan dan versinya dicatat bersama pengajuan.</li>
              <li>Data tidak ditampilkan pada halaman publik.</li>
              <li>Jadwal retensi khusus belum ditetapkan.</li>
            </ul>
          </Card>
          <Notice tone="warning" title="Batas kebijakan">
            Penjelasan ini menggambarkan perilaku formulir yang berjalan. Organisasi masih perlu menetapkan jadwal retensi, mekanisme permintaan subjek data, dan tata kelola pemrosesan data secara lebih terperinci.
          </Notice>
          <div className="flex flex-wrap gap-2">
            <Link href="/gabung" className="sb-btn sb-btn-outline">Kembali ke formulir</Link>
            <Link href="/kontak" className="sb-btn sb-btn-ghost">Informasi sekretariat</Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
