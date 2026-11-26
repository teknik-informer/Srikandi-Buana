import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicSiteSettings } from "@/lib/public-site-settings";
import { ArrowLeft, Package, Store } from "lucide-react";
import { Badge, Card, EmptyState, Notice } from "@/components/ui";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { loadPublicData } from "@/lib/public-data";
import { PublicDataUnavailable } from "@/components/public-data-unavailable";

export const dynamic = "force-dynamic";

interface PublicProduct {
  id: string;
  slug: string;
  reference_no: string;
  product_name: string;
  category_label: string | null;
  product_kind: "physical" | "service";
  unit_label: string;
  selling_price: string;
  description: string | null;
  producer_label: string | null;
}

async function findPublishedProduct(slug: string) {
  return loadPublicData(
    "product-detail",
    async () => {
      const sql = getV9Sql();
      const result = await sql`
        SELECT
          product.id::text AS id,
          product.slug,
          product.reference_no,
          product.product_name,
          product.category_label,
          product.product_kind,
          product.unit_label,
          product.selling_price::text AS selling_price,
          product.description,
          product.producer_label
        FROM v9.business_products AS product
        INNER JOIN v9.organizations AS organization
          ON organization.id = product.organization_id
        WHERE organization.slug = 'srikandi-buana'
          AND organization.status = 'active'
          AND product.field_key = 'usaha'
          AND product.slug = ${slug}
          AND product.status = 'active'
          AND product.publication_status = 'published'
        LIMIT 1
      `;
      return rowsFromResult<PublicProduct>(result)[0] ?? null;
    },
    null as PublicProduct | null,
  );
}

function priceLabel(value: string): string {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0
    ? new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount)
    : "Hubungi Sekretariat untuk informasi harga";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const siteSettings = await getPublicSiteSettings();
  if (!siteSettings.features.productCatalogue) notFound();
  const siteSettings = await getPublicSiteSettings();
  if (!siteSettings.features.productCatalogue) return { title: "Informasi tidak tersedia" };
  const { slug } = await params;
  const lookup = await findPublishedProduct(slug);
  if (lookup.unavailable) {
    return {
      title: "Informasi produk sementara tidak tersedia",
      description: "Produk Srikandi Buana sedang mengalami gangguan layanan data.",
    };
  }
  const product = lookup.data;
  if (!product) return { title: "Produk tidak ditemukan" };
  return {
    title: product.product_name,
    description: product.description ?? `Informasi produk ${product.product_name} dari KWT Srikandi Buana.`,
  };
}

export default async function ProductDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const lookup = await findPublishedProduct(slug);
  if (lookup.unavailable) {
    return (
      <div className="sb-shell py-10">
        <PublicDataUnavailable
          resource="Informasi produk"
          retryHref={`/produk/${encodeURIComponent(slug)}`}
        />
      </div>
    );
  }
  const product = lookup.data;
  if (!product) notFound();

  const relatedResult = await loadPublicData(
    "related-products",
    async () => {
      if (!product.category_label) return [];
      const sql = getV9Sql();
      const result = await sql`
        SELECT id::text AS id, slug, product_name, category_label, unit_label, selling_price::text AS selling_price
        FROM v9.business_products
        WHERE organization_id = (
          SELECT id FROM v9.organizations
          WHERE slug = 'srikandi-buana' AND status = 'active'
          LIMIT 1
        )
          AND field_key = 'usaha'
          AND publication_status = 'published'
          AND status = 'active'
          AND category_label = ${product.category_label}
          AND id <> ${product.id}::uuid
        ORDER BY product_name
        LIMIT 3
      `;
      return rowsFromResult<Pick<PublicProduct, "id" | "slug" | "product_name" | "category_label" | "unit_label" | "selling_price">>(result);
    },
    [] as Pick<PublicProduct, "id" | "slug" | "product_name" | "category_label" | "unit_label" | "selling_price">[],
  );
  const related = relatedResult.data;

  return (
    <div className="sb-shell py-10">
      <nav className="mb-5 flex items-center gap-2 text-[12px] text-muted">
        <Link href="/produk" className="inline-flex items-center gap-1 hover:underline"><ArrowLeft size={13} /> Daftar produk</Link>
        <span>/</span>
        <span className="text-ink2">{product.product_name}</span>
      </nav>

      <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
        <Card className="flex min-h-[300px] flex-col items-center justify-center bg-paper p-8 text-center">
          <div className="flex size-20 items-center justify-center rounded-full border border-line bg-white text-primary-800">
            {product.product_kind === "physical" ? <Package size={34} strokeWidth={1.4} /> : <Store size={32} strokeWidth={1.4} />}
          </div>
          <div className="mt-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted2">{product.reference_no}</div>
          <div className="mt-2 font-display text-[20px] font-semibold text-ink">{product.product_name}</div>
          <div className="mt-1 text-[11px] text-muted">{product.category_label ?? "Produk anggota"}</div>
        </Card>

        <div>
          <Badge tone="neutral">{product.category_label ?? "Produk"}</Badge>
          <h1 className="mt-3 font-display text-[32px] font-semibold leading-tight text-ink sm:text-[38px]">{product.product_name}</h1>
          <p className="mt-2 text-[12px] text-muted">
            {product.producer_label ? <>Diproduksi oleh <span className="font-semibold text-ink2">{product.producer_label}</span> · </> : null}
            {product.unit_label}
          </p>
          <div className="mt-5 font-display text-[26px] font-semibold text-primary-800">{priceLabel(product.selling_price)}</div>
          {product.description ? <p className="mt-4 max-w-lg whitespace-pre-wrap text-[14px] leading-relaxed text-ink2">{product.description}</p> : null}
          <div className="mt-6">
            <Notice tone="info" title="Konfirmasi pesanan">
              Ketersediaan stok, harga akhir, dan jadwal pengiriman perlu dikonfirmasi kepada
              Sekretariat sebelum pesanan disepakati. Saldo gudang internal tidak ditampilkan di sini.
            </Notice>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/kontak?tujuan=produk" className="sb-btn sb-btn-primary">Hubungi Sekretariat</Link>
            <Link href="/produk" className="sb-btn sb-btn-outline">Kembali ke daftar produk</Link>
          </div>
          <dl className="mt-7 grid grid-cols-2 gap-3 border-t border-line pt-5 text-[12px]">
            <div><dt className="text-muted">Kategori</dt><dd className="font-semibold text-ink2">{product.category_label ?? "Produk anggota"}</dd></div>
            <div><dt className="text-muted">Kemasan / satuan</dt><dd className="font-semibold text-ink2">{product.unit_label}</dd></div>
            <div><dt className="text-muted">Pelaku usaha</dt><dd className="font-semibold text-ink2">{product.producer_label ?? "Belum dicatat"}</dd></div>
            <div><dt className="text-muted">Asal organisasi</dt><dd className="font-semibold text-ink2">KWT Srikandi Buana</dd></div>
          </dl>
        </div>
      </div>

      {related.length ? (
        <section className="mt-14">
          <h2 className="font-display text-[22px] font-semibold text-ink">Produk dalam kategori yang sama</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {related.map((item) => (
              <Link key={item.id} href={`/produk/${item.slug}`} className="group">
                <Card className="h-full p-4 transition-shadow group-hover:shadow-md">
                  <Badge tone="neutral">{item.category_label ?? "Produk"}</Badge>
                  <div className="mt-3 font-display text-[16px] font-semibold text-ink group-hover:text-primary-800">{item.product_name}</div>
                  <div className="mt-1 text-[10.5px] text-muted">{item.unit_label}</div>
                  <div className="mt-3 text-[13px] font-semibold text-primary-800">{priceLabel(item.selling_price)}</div>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
