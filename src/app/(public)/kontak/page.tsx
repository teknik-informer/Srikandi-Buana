import Link from "next/link";
import type { Metadata } from "next";
import { getPublicSiteSettings } from "@/lib/public-site-settings";
import { MapPin, FileText, UserPlus } from "lucide-react";
import { Card, CardHeader, EmptyState, Notice, PageHeader } from "@/components/ui";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { loadPublicData } from "@/lib/public-data";
import { PublicDataUnavailable } from "@/components/public-data-unavailable";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Kontak",
  description: "Alamat organisasi Srikandi Buana yang tercatat pada registry.",
};

interface PublicContact {
  legal_name: string;
  short_name: string;
  address: string | null;
}

export default async function KontakPage({
  searchParams,
}: {
  searchParams: Promise<{ tujuan?: string }>;
}) {
  const siteSettings = await getPublicSiteSettings();
  const { tujuan } = await searchParams;
  const inquiryLabel =
    tujuan === "kemitraan" ? "pembicaraan kemitraan" :
    tujuan === "pelatihan" ? "informasi pelatihan" :
    tujuan === "informasi" ? "permintaan informasi" :
    "pertanyaan umum";

  const loaded = await loadPublicData(
    "public-contact",
    async () => {
      const sql = getV9Sql();
      const result = await sql`
        SELECT legal_name, short_name, address
        FROM v9.organizations
        WHERE slug = 'srikandi-buana'
          AND status = 'active'
        LIMIT 1
      `;
      return rowsFromResult<PublicContact>(result)[0] ?? null;
    },
    null as PublicContact | null,
  );

  if (loaded.unavailable) {
    return (
      <div className="sb-shell py-12">
        <PageHeader eyebrow="Kontak" title="Informasi sekretariat" description="Alamat yang tercatat pada registry organisasi." />
        <PublicDataUnavailable resource="Informasi kontak" retryHref="/kontak" />
      </div>
    );
  }

  const organization = loaded.data;

  return (
    <div className="sb-shell py-12">
      <PageHeader
        eyebrow="Kontak"
        title="Informasi sekretariat"
        description="Informasi kontak yang ditampilkan telah dimasukkan dan disetujui melalui pengaturan situs organisasi."
      />

      {organization ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader title="Alamat organisasi" action={<MapPin size={16} className="text-muted2" />} />
            <div className="px-5 py-4">
              <div className="text-[13px] font-semibold text-ink">{organization.legal_name}</div>
              {siteSettings.contact.address || organization.address ? (
                <p className="mt-2 text-[12.5px] leading-relaxed text-ink2">{siteSettings.contact.address || organization.address}</p>
              ) : (
                <EmptyState title="Alamat belum dicatat" body="Alamat sekretariat belum tersedia pada registry organisasi." />
              )}
            </div>
          </Card>
          <Card>
            <CardHeader title="Kanal komunikasi" />
            <div className="space-y-2 px-5 py-4 text-[12px] text-ink2">
              {siteSettings.contact.email ? <p><a className="font-semibold text-primary-700 hover:underline" href={`mailto:${siteSettings.contact.email}`}>{siteSettings.contact.email}</a></p> : null}
              {siteSettings.contact.phone ? <p>{siteSettings.contact.phone}</p> : null}
              {siteSettings.contact.whatsapp ? <p><a className="font-semibold text-primary-700 hover:underline" href={`https://wa.me/${siteSettings.contact.whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer">WhatsApp: {siteSettings.contact.whatsapp}</a></p> : null}
              {siteSettings.contact.officeHours ? <p>Jam layanan: {siteSettings.contact.officeHours}</p> : null}
              {!siteSettings.contact.email && !siteSettings.contact.phone && !siteSettings.contact.whatsapp && !siteSettings.contact.officeHours ? <p className="text-muted">Kanal komunikasi resmi belum dipublikasikan.</p> : null}
            </div>
          </Card>
          <Card>
            <CardHeader title="Keperluan informasi" />
            <div className="space-y-3 px-5 py-4 text-[12px] text-ink2">
              <div>
                <div className="font-semibold text-ink">Permintaan informasi</div>
                <p className="mt-1 text-muted">Tujuan saat ini: {inquiryLabel}. Permintaan resmi perlu dicatat dan ditinjau oleh Sekretariat.</p>
              </div>
              <div className="border-t border-line pt-3">
                <div className="font-semibold text-ink">Minat bergabung</div>
                <p className="mt-1 text-muted">Gunakan formulir minat bergabung. Pengajuan bukan keanggotaan resmi sampai diverifikasi pengurus.</p>
                {siteSettings.features.membershipInterest ? <Link href="/gabung" className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-primary-700">Formulir minat <UserPlus size={12} /></Link> : null}
              </div>
              <div className="border-t border-line pt-3">
                <div className="font-semibold text-ink">Dokumen</div>
                <p className="mt-1 text-muted">Dokumen yang sudah final dan diklasifikasikan publik tersedia pada arsip publik.</p>
                {siteSettings.features.documents ? <Link href="/dokumen" className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-primary-700">Dokumen publik <FileText size={12} /></Link> : null}
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <div className="mt-6"><EmptyState title="Informasi organisasi belum tersedia" body="Tidak ditemukan organisasi aktif pada registry publik." /></div>
      )}

      <div className="mt-5">
        <Notice tone="info" title="Permintaan informasi">
          Untuk pertanyaan atau permintaan dokumen, gunakan tujuan informasi pada halaman ini. Sekretariat meninjau setiap permintaan sesuai kewenangannya.
        </Notice>
      </div>
    </div>
  );
}
