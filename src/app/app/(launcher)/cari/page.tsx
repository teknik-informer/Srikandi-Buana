import type { Metadata } from "next";
import Link from "next/link";
import { orgSummary } from "@/lib/org-summary";
import { NEWS } from "@/data/content";
import { JOURNALS } from "@/data/finance";
import { Card, CardHeader, EmptyState, PageHeader, Badge } from "@/components/ui";

export const metadata: Metadata = { title: "Pencarian" };

export default async function CariPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const term = (q ?? "").toLowerCase().trim();
  // Anggota dan lahan dicari di dokumen bersama, bukan di arsip contoh —
  // kalau tidak, anggota yang baru didaftarkan tidak akan pernah ditemukan.
  const {
    members: MEMBERS, lands: LANDS, documents: DOCUMENTS,
    programs: PROGRAMS, products: PRODUCTS,
  } = await orgSummary();

  const results = term
    ? [
        ...MEMBERS.filter((m) => m.name.toLowerCase().includes(term)).map((m) => ({ group: "Anggota", label: m.name, meta: `${m.role} · ${m.scope}`, href: "/app/bidang/organisasi/data" })),
        ...DOCUMENTS.filter((d) => d.title.toLowerCase().includes(term) || d.number.toLowerCase().includes(term)).map((d) => ({ group: "Dokumen", label: d.title, meta: `${d.number} · ${d.visibility}`, href: "/app/sekretariat/dokumen" })),
        ...PROGRAMS.filter((p) => p.name.toLowerCase().includes(term)).map((p) => ({ group: "Program", label: p.name, meta: p.code, href: `/app/bidang/${p.bidang}` })),
        ...PRODUCTS.filter((p) => p.name.toLowerCase().includes(term)).map((p) => ({ group: "Produk", label: p.name, meta: `${p.category} · ${p.published ? "terbit" : "draf"}`, href: "/app/bidang/usaha/data" })),
        ...LANDS.filter((l) => l.owner.toLowerCase().includes(term) || l.commodity.toLowerCase().includes(term)).map((l) => ({ group: "Lahan", label: `${l.id} — ${l.commodity}`, meta: `${l.owner} · ${l.village}`, href: "/app/bidang/pertanian/data" })),
        ...NEWS.filter((n) => n.title.toLowerCase().includes(term)).map((n) => ({ group: "Kabar", label: n.title, meta: `${n.kind} · ${n.status}`, href: `/kabar/${n.slug}` })),
        ...JOURNALS.filter((j) => j.description.toLowerCase().includes(term) || j.number.toLowerCase().includes(term)).map((j) => ({ group: "Jurnal", label: j.description, meta: j.number, href: "/app/keuangan/jurnal" })),
      ]
    : [];

  return (
    <div className="pb-10">
      <PageHeader eyebrow="Pencarian lintas domain" title={q ? `Hasil untuk “${q}”` : "Cari data"} description="Hasil dibatasi pada data yang berhak dilihat peran Anda." />
      <form className="mb-4 flex gap-2" action="/app/cari">
        <input name="q" defaultValue={q ?? ""} className="sb-input" placeholder="Nama anggota, program, produk, dokumen, jurnal…" aria-label="Kata kunci" />
        <button type="submit" className="sb-btn sb-btn-primary">Cari</button>
      </form>
      {q ? (
        results.length ? (
          <Card>
            <CardHeader title="Hasil" subtitle={`${results.length} temuan`} />
            <ul className="divide-y divide-line">
              {results.map((r, i) => (
                <li key={i}>
                  <Link href={r.href} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-paper">
                    <div>
                      <div className="text-[12.5px] font-medium text-ink">{r.label}</div>
                      <div className="text-[10.5px] text-muted2">{r.meta}</div>
                    </div>
                    <Badge tone="neutral">{r.group}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        ) : (
          <Card className="p-6"><EmptyState title="Tidak ada hasil" body="Coba kata kunci lain, atau periksa ejaan. Hasil juga dibatasi oleh cakupan akses Anda." /></Card>
        )
      ) : (
        <Card className="p-6"><EmptyState title="Mulai mencari" body="Ketik nama anggota, kode program, nomor jurnal, atau judul dokumen." /></Card>
      )}
    </div>
  );
}
