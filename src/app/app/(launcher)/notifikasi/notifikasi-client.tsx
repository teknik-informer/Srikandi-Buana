import Link from "next/link";
import { BellRing, CheckCheck, LockKeyhole, ShieldCheck } from "lucide-react";
import { Card, CardHeader, Notice, PageHeader, ComingSoonBadge } from "@/components/ui";

interface NotificationShortcut {
  label: string;
  href: string;
}

export function NotifikasiClient({ shortcuts }: { shortcuts: NotificationShortcut[] }) {
  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Pusat Notifikasi"
        title="Notifikasi"
        description="Kotak notifikasi personal belum diaktifkan. Pintasan di bawah mengarah langsung ke modul operasional yang benar-benar tersedia."
        actions={<ComingSoonBadge label="Pusat notifikasi" />}
      />

      <Card>
        <CardHeader
          title="Pusat notifikasi organisasi"
          subtitle="Fitur sedang disiapkan untuk penyimpanan server dan akses per pengguna"
          action={<ComingSoonBadge />}
        />
        <div className="px-5 py-10 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-paper text-muted2">
            <LockKeyhole size={21} />
          </div>
          <h2 className="mt-3 text-[13.5px] font-semibold text-ink">
            Notifikasi operasional belum diaktifkan
          </h2>
          <p className="mx-auto mt-1.5 max-w-xl text-[11.5px] leading-5 text-muted">
            Antrean notifikasi versi sebelumnya hanya tersimpan di browser dan tidak mewakili peristiwa
            organisasi yang sebenarnya. Data contoh dan tombol tanda-baca lokal telah disembunyikan.
            Tidak ada pesan yang akan ditandai selesai atau dibaca sebelum statusnya tersimpan di server.
          </p>
        </div>
      </Card>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Notice tone="info" title="Yang harus tersedia sebelum dibuka">
          Notifikasi harus dibuat dari peristiwa nyata, ditujukan kepada akun atau peran yang tepat,
          disimpan di server, dan memiliki status baca personal yang tidak bercampur antar pengguna.
        </Notice>
        <Notice tone="warning" title="Privasi dan jejak tindakan">
          Pesan hanya boleh memuat informasi yang berhak dilihat penerima. Perubahan status baca,
          penghapusan, dan tautan ke tindakan lanjutan harus tercatat serta dibatasi oleh organisasi.
        </Notice>
      </div>

      <Card className="mt-4">
        <CardHeader
          title="Akses pekerjaan yang sudah tersedia"
          subtitle="Gunakan modul asal untuk memeriksa data operasional secara langsung"
          action={<ShieldCheck size={16} className="text-muted2" />}
        />
        <div className="divide-y divide-line">
          {shortcuts.map((shortcut) => (
            <Link key={shortcut.href} href={shortcut.href} className="flex items-center justify-between gap-3 px-4 py-3 text-[11.5px] font-semibold text-ink2 hover:bg-paper">
              {shortcut.label} <CheckCheck size={14} />
            </Link>
          ))}
          {!shortcuts.length ? (
            <p className="px-4 py-3 text-[11.5px] text-muted">Belum ada pintasan operasional untuk kewenangan akun ini.</p>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
