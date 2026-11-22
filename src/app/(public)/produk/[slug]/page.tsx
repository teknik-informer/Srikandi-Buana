import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PRODUCTS } from "@/data/operations";
import { formatIDR } from "@/lib/format";
import { Badge, Card, Notice } from "@/components/ui";

export function generateStaticParams() {
  return PRODUCTS.filter((p) => p.published).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = PRODUCTS.find((x) => x.slug === slug && x.published);
  if (!p) return { title: "Produk tidak ditemukan" };
  return { title: p.name, description: p.story };
}

export default async function ProductDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = PRODUCTS.find((x) => x.slug === slug && x.published);
  if (!p) notFound();
  const related = PRODUCTS.filter((x) => x.published && x.id !== p.id && x.category === p.category).slice(0, 3);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <nav className="mb-5 text-[12px] text-muted">
        <Link href="/produk" className="hover:underline">Katalog</Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink2">{p.name}</span>
      </nav>
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="overflow-hidden rounded-[18px] border border-line bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.image} alt={p.name} className="aspect-square w-full object-cover" width={900} height={900} />
        </div>
        <div>
          <Badge tone="neutral">{p.category}</Badge>
          <h1 className="mt-3 font-display text-[32px] leading-tight font-semibold text-primary-950 sm:text-[38px]">{p.name}</h1>
          <p className="mt-2 text-[13px] text-muted">Diproduksi oleh <span className="font-semibold text-ink2">{p.producer}</span> · {p.unit}</p>
          <div className="mt-5 font-display text-[30px] font-semibold text-primary-800">{formatIDR(p.price)}</div>
          <p className="mt-4 max-w-lg text-[14px] leading-relaxed text-ink2">{p.story}</p>
          <div className="mt-6">
            <Notice tone={p.stock > 0 ? "success" : "warning"} title={p.stock > 0 ? "Tersedia untuk dipesan" : "Stok sedang habis"}>
              Ketersediaan mengikuti proyeksi publik yang disetujui. Konfirmasi akhir diberikan saat pemesanan.
            </Notice>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/produk/pemesanan" className="sb-btn sb-btn-primary">Cara memesan</Link>
            <Link href="/kontak" className="sb-btn sb-btn-outline">Tanya produk</Link>
          </div>
          <dl className="mt-7 grid grid-cols-2 gap-3 border-t border-line pt-5 text-[12px]">
            <div><dt className="text-muted">Kategori</dt><dd className="font-semibold text-ink2">{p.category}</dd></div>
            <div><dt className="text-muted">Kemasan</dt><dd className="font-semibold text-ink2">{p.unit}</dd></div>
            <div><dt className="text-muted">Pelaku usaha</dt><dd className="font-semibold text-ink2">{p.producer}</dd></div>
            <div><dt className="text-muted">Asal</dt><dd className="font-semibold text-ink2">Ngadimulyo, Kedu</dd></div>
          </dl>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="font-display text-[22px] font-semibold text-ink">Produk serupa</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {related.map((r) => (
              <Link key={r.id} href={`/produk/${r.slug}`} className="group">
                <div className="overflow-hidden rounded-[14px] border border-line bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.image} alt={r.name} className="aspect-[4/3] w-full object-cover transition group-hover:scale-[1.03]" width={520} height={390} loading="lazy" />
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-[13px] font-semibold text-ink group-hover:text-primary-800">{r.name}</span>
                  <span className="text-[12.5px] font-semibold text-primary-800">{formatIDR(r.price)}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
