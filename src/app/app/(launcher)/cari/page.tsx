import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { APPS } from "@/config/apps";
import { SEARCH_PLACES, type SearchGroup, type SearchHit } from "@/lib/search";
import { canAccessApp, canAccessAppHref } from "@/lib/app-access";
import { getIdentity } from "@/lib/session";
import { searchOperationalRecords } from "@/lib/operational-search";
import { Card, CardHeader, EmptyState, PageHeader, Badge, Notice } from "@/components/ui";

export const metadata: Metadata = { title: "Pencarian" };

interface Destination {
  group: "Aplikasi" | "Menu";
  label: string;
  meta: string;
  href: string;
  hay: string;
}

interface ResultGroup {
  group: string;
  hits: Array<{ label: string; meta: string; href: string }>;
}

function safeErrorType(reason: unknown): string {
  return reason instanceof Error && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(reason.name)
    ? reason.name
    : "UnknownError";
}

export default async function CariPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const identity = await getIdentity();
  if (!identity) redirect("/masuk");

  const { q } = await searchParams;
  const rawTerm = (q ?? "").trim().replace(/\s+/g, " ").slice(0, 80);
  const term = rawTerm.toLocaleLowerCase("id-ID");

  const destinations: Destination[] = [
    ...APPS
      .filter((app) => canAccessApp(identity, app.key))
      .map((app) => ({
        group: "Aplikasi" as const,
        label: app.name,
        meta: app.audience,
        href: app.href,
        hay: `${app.name} ${app.short} ${app.audience} ${app.description}`.toLocaleLowerCase("id-ID"),
      })),
    ...SEARCH_PLACES
      .filter((place) => canAccessAppHref(identity, place.href))
      .map((place) => ({
        group: "Menu" as const,
        label: place.label,
        meta: place.meta,
        href: place.href,
        hay: `${place.label} ${place.meta} ${place.words}`.toLocaleLowerCase("id-ID"),
      })),
  ];

  const navigationResults = term.length >= 2
    ? destinations
        .filter((destination) => destination.hay.includes(term))
        .filter((destination, index, all) =>
          all.findIndex((candidate) => candidate.href === destination.href) === index,
        )
        .slice(0, 40)
    : [];

  let operationalGroups: { group: SearchGroup; hits: SearchHit[] }[] = [];
  let recordsUnavailable = false;
  if (rawTerm.length >= 2) {
    try {
      operationalGroups = await searchOperationalRecords(identity, rawTerm);
    } catch (reason) {
      recordsUnavailable = true;
      console.warn("[workspace-search-page] Operational index unavailable", safeErrorType(reason));
    }
  }

  const groupedNavigation: ResultGroup[] = (["Aplikasi", "Menu"] as const)
    .map((group) => ({
      group,
      hits: navigationResults.filter((result) => result.group === group),
    }))
    .filter((group) => group.hits.length > 0);

  const groupedRecords: ResultGroup[] = operationalGroups.map((group) => ({
    group: group.group,
    hits: group.hits,
  }));

  const resultGroups = [...groupedNavigation, ...groupedRecords];
  const resultCount = resultGroups.reduce((count, group) => count + group.hits.length, 0);

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Pencarian workspace"
        title={rawTerm ? `Hasil untuk “${rawTerm}”` : "Cari aplikasi, menu, dan data"}
        description="Hasil pencarian menampilkan tujuan kerja dan rekaman operasional sesuai hak akses serta lingkup akun Anda."
      />
      <form className="mb-4 flex flex-wrap gap-2" action="/app/cari">
        <input
          name="q"
          defaultValue={rawTerm}
          maxLength={80}
          className="sb-input min-w-0 flex-1"
          placeholder="Cari nama anggota, program, produk, dokumen, jurnal, atau menu…"
          aria-label="Kata kunci"
        />
        <button type="submit" className="sb-btn sb-btn-primary">Cari</button>
      </form>

      <Notice tone="info" title="Pencarian mengikuti kewenangan akun">
        Rekaman operasional hanya diambil dari database organisasi dan hanya ditampilkan pada domain yang dapat diakses akun Anda.
      </Notice>

      {recordsUnavailable ? (
        <div className="mt-3">
          <Notice tone="warning" title="Data operasional sementara tidak tersedia">
            Tujuan aplikasi dan menu tetap dapat dicari. Rekaman operasional belum berhasil dimuat; coba kembali beberapa saat lagi.
          </Notice>
        </div>
      ) : null}

      {rawTerm.length >= 2 ? (
        resultGroups.length ? (
          <Card className="mt-4">
            <CardHeader
              title="Semua hasil"
              subtitle={`${resultCount} hasil dalam ${resultGroups.length} kelompok`}
            />
            <div className="divide-y divide-line">
              {resultGroups.map((group) => (
                <section key={group.group} aria-label={`Hasil ${group.group}`}>
                  <h2 className="bg-paper px-4 py-2 text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted2">
                    {group.group} · {group.hits.length}
                  </h2>
                  <ul className="divide-y divide-line">
                    {group.hits.map((result) => (
                      <li key={group.group + result.href + result.label}>
                        <Link
                          href={result.href}
                          className="flex items-center justify-between gap-3 px-4 py-2.5 transition hover:bg-paper"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-[12.5px] font-medium text-ink">{result.label}</span>
                            <span className="block truncate text-[10.5px] text-muted2">{result.meta}</span>
                          </span>
                          <Badge tone="neutral">{group.group}</Badge>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </Card>
        ) : recordsUnavailable ? (
          <Card className="mt-4 p-6">
            <EmptyState title="Hasil menu belum ditemukan" body="Data operasional sedang terganggu. Coba gunakan kata kunci lain setelah layanan pulih." />
          </Card>
        ) : (
          <Card className="mt-4 p-6">
            <EmptyState title={`Tidak ada hasil untuk “${rawTerm}”`} body="Coba kata kunci lain, atau periksa ejaan." />
          </Card>
        )
      ) : (
        <Card className="mt-4 p-6">
          <EmptyState title="Mulai mencari" body="Ketik minimal dua karakter untuk mencari aplikasi, menu, dan rekaman operasional yang diizinkan." />
        </Card>
      )}
    </div>
  );
}
