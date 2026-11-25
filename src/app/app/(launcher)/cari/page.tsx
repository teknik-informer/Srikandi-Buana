import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { APPS } from "@/config/apps";
import { SEARCH_PLACES } from "@/lib/search";
import { canAccessApp, canAccessAppHref } from "@/lib/app-access";
import { getIdentity } from "@/lib/session";
import { Card, CardHeader, EmptyState, PageHeader, Badge, Notice } from "@/components/ui";

export const metadata: Metadata = { title: "Pencarian" };

interface Destination {
  group: string;
  label: string;
  meta: string;
  href: string;
  hay: string;
}

export default async function CariPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const identity = await getIdentity();
  if (!identity) redirect("/masuk");

  const { q } = await searchParams;
  const term = (q ?? "").trim().toLocaleLowerCase("id-ID");

  const destinations: Destination[] = [
    ...APPS
      .filter((app) => canAccessApp(identity, app.key))
      .map((app) => ({
        group: "Aplikasi",
        label: app.name,
        meta: app.audience,
        href: app.href,
        hay: `${app.name} ${app.short} ${app.audience} ${app.description}`.toLocaleLowerCase("id-ID"),
      })),
    ...SEARCH_PLACES
      .filter((place) => canAccessAppHref(identity, place.href))
      .map((place) => ({
        group: "Menu",
        label: place.label,
        meta: place.meta,
        href: place.href,
        hay: `${place.label} ${place.meta} ${place.words}`.toLocaleLowerCase("id-ID"),
      })),
  ];

  const results = term.length >= 2
    ? destinations
        .filter((destination) => destination.hay.includes(term))
        .filter((destination, index, all) =>
          all.findIndex((candidate) => candidate.href === destination.href) === index,
        )
        .slice(0, 40)
    : [];

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Pencarian workspace"
        title={q ? `Hasil untuk “${q}”` : "Cari aplikasi dan menu"}
        description="Hasil pencarian hanya menampilkan tujuan kerja yang dapat diakses oleh akun Anda."
      />
      <form className="mb-4 flex flex-wrap gap-2" action="/app/cari">
        <input
          name="q"
          defaultValue={q ?? ""}
          className="sb-input min-w-0 flex-1"
          placeholder="Cari aplikasi, jurnal, persetujuan, atau menu kerja…"
          aria-label="Kata kunci"
        />
        <button type="submit" className="sb-btn sb-btn-primary">Cari</button>
      </form>

      <Notice tone="info" title="Pencarian rekaman belum diaktifkan">
        Pencarian ini mencakup aplikasi dan menu saja. Nama anggota, dokumen internal, transaksi, dan data bidang tidak diambil dari data contoh. Pencarian rekaman akan dibuka setelah layanan server-side menerapkan izin untuk setiap domain.
      </Notice>

      {term.length >= 2 ? (
        results.length ? (
          <Card className="mt-4">
            <CardHeader title="Tujuan yang cocok" subtitle={`${results.length} tujuan dapat diakses`} />
            <ul className="divide-y divide-line">
              {results.map((result) => (
                <li key={result.href}>
                  <Link href={result.href} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-paper">
                    <div className="min-w-0">
                      <div className="text-[12.5px] font-medium text-ink">{result.label}</div>
                      <div className="text-[10.5px] text-muted2">{result.meta}</div>
                    </div>
                    <Badge tone="neutral">{result.group}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        ) : (
          <Card className="mt-4 p-6">
            <EmptyState title="Tidak ada menu yang cocok" body="Coba kata kunci lain, atau periksa ejaan." />
          </Card>
        )
      ) : (
        <Card className="mt-4 p-6">
          <EmptyState title="Mulai mencari" body="Ketik nama aplikasi, menu, jurnal, atau persetujuan untuk menemukan tujuan yang tersedia." />
        </Card>
      )}
    </div>
  );
}
