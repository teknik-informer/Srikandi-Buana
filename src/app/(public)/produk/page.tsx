import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Package, Store } from "lucide-react";
import { Badge, Card, EmptyState, Notice } from "@/components/ui";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { loadPublicData } from "@/lib/public-data";
import { PublicDataUnavailable } from "@/components/public-data-unavailable";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Katalog Produk",
  description: "Katalog produk anggota dan kelompok usaha KWT Srikandi Buana yang telah disetujui untuk publikasi.",
};

interface PublicProduct {
  id: string;
  slug: string;
  product_name: string;
  category_label: string | null;
  unit_label: string;
  selling_price: string;
  producer_label: string | null;
  description: string | null;
}

function priceLabel(value: string): string {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0
    ? new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount)
    : "Hubungi Sekretariat";
}

export default async function ProdukPage({
  searchParams,
}: {
  searchParams: Promise<{ lihat?: string; oleh?: string; kategori?: string }>;
}) {
  const { lihat, oleh, kategori } = await searchParams;
  const loaded = await loadPublicData(
    "products",
    async () => {
      const sql = getV9Sql();
      const result = await sql`
        SELECT
          product.id::text AS id,
          product.slug,
          product.product_name,
          product.category_label,
          product.unit_label,
          product.selling_price::text AS selling_price,
          product.producer_label,
          product.description
        FROM v9.business_products AS product
        INNER JOIN v9.organizations AS organization
          ON organization.id = product.organization_id
        WHERE organization.slug = 'srikandi-buana'
          AND organization.status = 'active'
          AND product.field_key = 'usaha'
          AND product.status = 'active'
          AND product.publication_status = 'published'
        ORDER BY product.category_label NULLS LAST, product.product_name
        LIMIT 200
      `;
      return rowsFromResult<PublicProduct>(result);
    },
    [] as PublicProduct[],
  );

  if (loaded.unavailable) {
    return (
      <div className="sb-shell py-12">
        <div className="max-w-3xl">
          <div className="sb-label mb-2">Katalog publik</div>
          <h1 className="font-display text-[34px] leading-tight font-semibold text-ink sm:text-[40px]">
            Produk anggota dan kelompok usaha.
          </h1>
          <p className="mt-3 text-[14px] leading-relaxed text-ink2">
            Produk yang ditampilkan telah diaktifkan dan disetujui oleh pengurus.
          </p>
        </div>
        <PublicDataUnavailable resource="Katalog produk" retryHref="/produk" />
      </div>
    );
  }

  const products = loaded.data;
  const categories = [...new Set(products.map((product) => product.category_label).filter((value): value is string => Boolean(value)))];
  const visible = products.filter((product) =>
    (!kategori || product.category_label === kategori) &&
    (!oleh || product.producer_label?.toLowerCase().includes(oleh.toLowerCase())),
  );

  return (
    <div className="sb-shell py-12">
      <div className="max-w-3xl">
        <div className="sb-label mb-2">Katalog publik</div>
        <h1 className="font-display text-[34px] leading-tight font-semibold text-ink sm:text-[40px]">
          Produk anggota dan kelompok usaha.
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-ink2">
          Produk yang ditampilkan telah diaktifkan dan disetujui oleh pengurus. Informasi harga
          pokok, persediaan internal, dan catatan usaha tidak ditampilkan pada katalog publik.
        </p>
      </div>

      {categories.length ? (
        <div className="mt-7 flex flex-wrap gap-2">
          <Link href="/produk" className={`sb-chip ${!kategori ? "!border-primary-600 !bg-primary-50 !text-primary-800" : ""}`}>Semua</Link>
          {categories.map((category) => (
            <Link
              key={category}
              href={`/produk?kategori=${encodeURIComponent(category)}`}
              className={`sb-chip ${kategori === category ? "!border-primary-600 !bg-primary-50 !text-primary-800" : ""}`}
            >
              {category}
            </Link>
          ))}
        </div>
      ) : null}

      {visible.length ? (
        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((product) => (
            <Link key={product.id} href={`/produk/${product.slug}`} className="group">
              <Card className="flex h-full flex-col overflow-hidden transition-shadow group-hover:shadow-md">
                <div className="flex aspect-[16/9] items-center justify-center border-b border-line bg-paper">
                  <div className="flex flex-col items-center gap-2 text-primary-800">
                    <Package size={34} strokeWidth={1.4} />
                    <span className="text-[10px] font-semibold tracking-[0.14em] uppercase">{product.category_label ?? "Produk anggota"}</span>
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-center justify-between gap-2">
                    <Badge tone="neutral">{product.category_label ?? "Produk"}</Badge>
                    <span className="text-[10px] text-muted2">{product.unit_label}</span>
                  </div>
                  <h2 className="mt-3 font-display text-[18px] font-semibold leading-snug text-ink group-hover:text-primary-800">
                    {product.product_name}
                  </h2>
                  {product.producer_label ? <div className="mt-1 text-[11px] text-muted">Oleh {product.producer_label}</div> : null}
                  {product.description ? <p className="mt-3 line-clamp-3 text-[11.5px] leading-relaxed text-muted">{product.description}</p> : null}
                  <div className="mt-auto flex items-end justify-between gap-2 border-t border-line pt-4">
                    <span className="text-[14px] font-semibold text-primary-800">{priceLabel(product.selling_price)}</span>
                    <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-primary-700">Detail <ArrowRight size={12} /></span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-8">
          <Card className="px-5 py-10">
            {products.length ? (
              <EmptyState title="Tidak ada produk pada kategori ini" body="Pilih kategori lain untuk melihat produk yang tersedia." />
            ) : (
              <EmptyState
                title="Katalog belum memuat produk publik"
                body="Produk akan muncul setelah dicatat, diaktifkan, dan disetujui untuk publikasi oleh pengurus."
              />
            )}
          </Card>
        </div>
      )}

      <div className="mt-10 max-w-3xl">
        <Notice tone="info" title="Cara memesan">
          Konfirmasi ketersediaan, jumlah, dan pengiriman dilakukan melalui Sekretariat atau pengelola
          usaha. Halaman ini belum menerima pembayaran otomatis.
        </Notice>
      </div>
    </div>
  );
}
