import Link from "next/link";
import type { Metadata } from "next";
import { PRODUCTS } from "@/data/operations";
import { formatIDR } from "@/lib/format";
import { Badge, Card, Notice } from "@/components/ui";

export const metadata: Metadata = {
  title: "Katalog Produk",
  description: "Katalog produk anggota KWT Srikandi Buana: kopi arabika, madu trigona, gula aren, beras merah, dan olahan pangan.",
};

export default async function ProdukPage({ searchParams }: { searchParams: Promise<{ lihat?: string; oleh?: string }> }) {
  const { lihat, oleh } = await searchParams;
  const published = PRODUCTS.filter((p) => p.published);
  const categories = [...new Set(published.map((p) => p.category))];
  const visible = oleh === "anggota" ? published : published;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="max-w-3xl">
        <div className="sb-label mb-2">Katalog publik</div>
        <h1 className="font-display text-[34px] leading-tight font-semibold text-primary-950 sm:text-[40px]">
          Produk yang punya nama pembuatnya.
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-ink2">
          Hanya produk berstatus terpublikasi yang tampil. Data stok dan HPP internal tidak dibuka
          ke publik — persediaan yang ditampilkan adalah proyeksi ketersediaan yang diizinkan.
        </p>
      </div>

      {lihat === "kategori" ? (
        <div className="mt-7 flex flex-wrap gap-2">
          {categories.map((c) => (
            <span key={c} className="sb-chip !bg-white">{c} · {published.filter((p) => p.category === c).length} produk</span>
          ))}
        </div>
      ) : (
        <div className="mt-7 flex flex-wrap gap-2">
          <span className="sb-chip !border-primary-600 !bg-primary-50 !text-primary-800">Semua</span>
          {categories.map((c) => (
            <span key={c} className="sb-chip">{c}</span>
          ))}
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((p) => (
          <Link key={p.id} href={`/produk/${p.slug}`} className="group">
            <div className="overflow-hidden rounded-[14px] border border-line bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.image} alt={p.name} className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-[1.03]" width={640} height={480} loading="lazy" />
            </div>
            <div className="mt-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[14px] font-semibold text-ink group-hover:text-primary-800">{p.name}</div>
                <div className="mt-0.5 text-[11.5px] text-muted">Oleh {p.producer}</div>
                <div className="mt-1.5 text-[11.5px] text-muted2">{p.unit} · {p.category}</div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-[14px] font-semibold text-primary-800">{formatIDR(p.price)}</div>
                {p.stock > 0 ? (
                  <Badge tone="success">Tersedia</Badge>
                ) : (
                  <Badge tone="warning">Stok habis</Badge>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-10 max-w-3xl">
        <Notice tone="info" title="Cara memesan">
          Pemesanan dilakukan melalui kanal resmi organisasi pada halaman{" "}
          <Link href="/produk/pemesanan" className="inline-block py-[5px] font-semibold underline decoration-primary-400 underline-offset-2">Informasi Pemesanan</Link>.
          Tidak ada pembayaran otomatis di situs ini.
        </Notice>
      </div>
    </div>
  );
}
