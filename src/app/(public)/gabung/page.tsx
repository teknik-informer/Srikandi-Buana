import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicSiteSettings } from "@/lib/public-site-settings";
import Link from "next/link";
import { JoinForm } from "@/components/join-form";
import { Card, CardHeader, Notice } from "@/components/ui";

export const metadata: Metadata = {
  title: "Minat Bergabung",
  description: "Formulir minat bergabung dengan KWT Srikandi Buana. Pendaftaran minat diproses oleh Bidang Organisasi & Keanggotaan.",
};

export default async function GabungPage() {
  const siteSettings = await getPublicSiteSettings();
  if (!siteSettings.features.membershipInterest) notFound();
  return (
    <div className="sb-shell py-12">
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div className="sb-label mb-2">Minat bergabung</div>
          <h1 className="font-display text-[32px] leading-tight font-semibold text-ink sm:text-[38px]">Satu formulir, satu tindak lanjut yang jelas.</h1>
          <p className="mt-3 max-w-xl text-[13.5px] leading-relaxed text-ink2">
            Formulir ini mencatat minat, bukan keanggotaan resmi. Bidang Organisasi &amp; Keanggotaan
            akan meninjau pengajuan dan menghubungi Anda melalui nomor yang dicantumkan. Waktu tindak lanjut mengikuti antrean dan kelengkapan verifikasi.
          </p>

          <div className="mt-6">
            <JoinForm />
          </div>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Apa yang terjadi setelah mengirim" />
            <ol className="space-y-3 px-5 py-4 text-[13px] text-ink2">
              {[
                "Pengajuan tercatat pada antrean Bidang Organisasi & Keanggotaan.",
                "Verifikasi data dan kunjungan singkat bila diperlukan.",
                "Keputusan diterima/tidak diterima dikomunikasikan langsung.",
                "Jika diterima, akun portal dibuat setelah data diverifikasi.",
              ].map((s, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-100 text-[10.5px] font-bold text-primary-800">{i + 1}</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          </Card>
          <Notice tone="warning" title="Perlindungan data">
            Data yang Anda kirim dipakai untuk meninjau minat, menghubungi pemohon, dan mencatat keputusan keanggotaan. Baca rincian data, tujuan, dan keterbatasan masa simpan pada <Link href="/privasi" className="font-semibold underline">Kebijakan Privasi</Link>.
          </Notice>
        </div>
      </div>
    </div>
  );
}
