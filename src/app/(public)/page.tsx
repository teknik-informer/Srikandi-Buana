import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight, CalendarDays, FileCheck2, GraduationCap, LayoutGrid,
  Package, ShieldCheck, Sprout, Store, Users, Wallet,
} from "lucide-react";
import { Badge, Card, EmptyState, Notice } from "@/components/ui";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { loadPublicData } from "@/lib/public-data";
import { PublicDataUnavailable } from "@/components/public-data-unavailable";
import { formatDateFull, formatIDR } from "@/lib/format";
import { DashboardArt } from "@/components/dashboard-art";
import { HeroRibbon } from "@/components/hero-ribbon";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Beranda",
  alternates: { canonical: "/" },
};

interface PublicOrganization {
  legal_name: string;
  short_name: string;
  legal_status: string;
  address: string | null;
}
interface PublicField {
  field_key: string;
  name: string;
  short_name: string;
  mandate: string | null;
}
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
interface PublicActivity {
  id: string;
  title: string;
  field_name: string;
  activity_date: string;
  start_time: string | null;
  location: string | null;
}

const MODULES = [
  { icon: Users, title: "Keanggotaan", desc: "Pendaftaran, verifikasi, dan data anggota." },
  { icon: CalendarDays, title: "Agenda & kegiatan", desc: "Perencanaan serta pelaksanaan kegiatan lapangan." },
  { icon: Wallet, title: "Keuangan", desc: "Jurnal, persetujuan, dan laporan yang dibatasi hak akses." },
  { icon: Sprout, title: "Pertanian & produksi", desc: "Data lahan, kegiatan, dan catatan produksi." },
  { icon: GraduationCap, title: "Pelatihan", desc: "Sesi, peserta, dan pelaksanaan pelatihan." },
  { icon: Store, title: "Usaha & kemitraan", desc: "Katalog, persediaan, pelanggan, dan pesanan." },
];

const FIELD_ICONS = {
  organisasi: Users,
  pertanian: Sprout,
  pelatihan: GraduationCap,
  usaha: Store,
};

function priceLabel(value: string): string {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0
    ? formatIDR(amount)
    : "Hubungi pengelola usaha";
}

export default async function HomePage() {
  const loaded = await loadPublicData(
    "home-public-summary",
    async () => {
      const sql = getV9Sql();
      const [organizationResult, fieldsResult, productsResult, activitiesResult] = await Promise.all([
        sql`
          SELECT legal_name, short_name, legal_status, address
          FROM v9.organizations
          WHERE slug = 'srikandi-buana'
            AND status = 'active'
          LIMIT 1
        `,
        sql`
          SELECT
            application.field_key,
            application.name,
            application.short_name,
            application.mandate
          FROM v9.field_applications AS application
          INNER JOIN v9.organizations AS organization
            ON organization.id = application.organization_id
          WHERE organization.slug = 'srikandi-buana'
            AND organization.status = 'active'
            AND application.is_enabled = true
          ORDER BY application.display_order, application.name
          LIMIT 8
        `,
        sql`
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
          LIMIT 4
        `,
        sql`
          SELECT
            activity.id::text AS id,
            activity.title,
            application.short_name AS field_name,
            activity.activity_date::text AS activity_date,
            to_char(activity.start_time, 'HH24:MI') AS start_time,
            activity.location
          FROM v9.field_activities AS activity
          INNER JOIN v9.organizations AS organization
            ON organization.id = activity.organization_id
          INNER JOIN v9.field_applications AS application
            ON application.organization_id = activity.organization_id
            AND application.field_key = activity.field_key
          WHERE organization.slug = 'srikandi-buana'
            AND organization.status = 'active'
            AND activity.open_to_public = true
            AND activity.status IN ('scheduled','in_progress')
            AND activity.activity_date >= (now() AT TIME ZONE 'Asia/Jakarta')::date
          ORDER BY activity.activity_date, activity.start_time NULLS FIRST
          LIMIT 3
        `,
      ]);
      return {
        organization: rowsFromResult<PublicOrganization>(organizationResult)[0] ?? null,
        fields: rowsFromResult<PublicField>(fieldsResult),
        products: rowsFromResult<PublicProduct>(productsResult),
        activities: rowsFromResult<PublicActivity>(activitiesResult),
      };
    },
    {
      organization: null as PublicOrganization | null,
      fields: [] as PublicField[],
      products: [] as PublicProduct[],
      activities: [] as PublicActivity[],
    },
  );

  const organization = loaded.data.organization;
  const fields = loaded.data.fields;
  const products = loaded.data.products;
  const activities = loaded.data.activities;

  return (
    <div className="bg-white">
      <section className="relative isolate flex min-h-[430px] flex-col overflow-hidden bg-[#0b2b18] sm:min-h-[480px] lg:min-h-[540px]">
        <picture>
          <source srcSet="/images/hero-pemanen.webp" type="image/webp" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/hero-pemanen.jpg"
            alt="Ilustrasi aktivitas pertanian di lingkungan Srikandi Buana"
            className="absolute inset-0 h-full w-full object-cover object-[68%_38%] sm:object-[64%_40%] lg:object-[62%_42%]"
            width={1536}
            height={1024}
            fetchPriority="high"
            decoding="async"
          />
        </picture>
        <div className="absolute inset-0 bg-[linear-gradient(96deg,rgba(6,28,16,0.94)_0%,rgba(7,32,18,0.88)_34%,rgba(8,38,21,0.62)_52%,rgba(9,44,24,0.14)_72%,rgba(9,44,24,0)_100%)]" aria-hidden />
        <div className="absolute inset-x-0 top-0 h-28 bg-[linear-gradient(to_bottom,rgba(4,20,11,0.55),rgba(4,20,11,0))]" aria-hidden />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-[linear-gradient(to_top,rgba(6,30,17,0.62),rgba(6,30,17,0))]" aria-hidden />

        <div className="sb-shell relative flex min-h-[330px] flex-1 flex-col justify-center pb-10 pt-10 sm:min-h-[380px] sm:pb-12 sm:pt-12 lg:min-h-[430px] lg:pb-14 lg:pt-14">
          <div className="max-w-[640px]" data-contrast-bg="#082617">
            <div className="flex items-center gap-3">
              <span className="h-px w-9 bg-[#e6c56a]" aria-hidden />
              <span className="text-[10.5px] font-bold uppercase tracking-[0.24em] text-[#f0d79a]">
                Kelompok Wanita Tani
              </span>
            </div>
            <h1 className="mt-4 font-display text-[38px] leading-[1.02] tracking-[-0.03em] text-white sm:text-[50px] lg:text-[60px]">
              <span className="block">{organization?.short_name ?? "Srikandi Buana"}</span>
              <span className="mt-1 block text-[#f2d493]">
                Bersama, Berkarya,
                <br />
                Berdaya
              </span>
            </h1>
            <p className="mt-5 max-w-[46ch] text-[14px] leading-relaxed text-[#e2efe4] sm:text-[15px]">
              Ruang kerja bersama untuk mengelola organisasi, memperkuat kegiatan pertanian,
              dan mengembangkan kapasitas anggota secara bertahap.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-2.5">
              <Link href="/gabung" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#127e2f] px-4 py-2.5 text-[12.5px] font-bold text-white shadow-[0_16px_30px_-16px_rgba(0,0,0,0.85)] ring-1 ring-inset ring-white/25 transition hover:bg-[#159a3a] sm:px-5 sm:py-3 sm:text-[13px]">
                Minat bergabung <ArrowRight size={15} />
              </Link>
              <Link href="/profil" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/35 bg-white/10 px-4 py-2.5 text-[12.5px] font-bold text-white backdrop-blur-sm transition hover:border-white/60 hover:bg-white/15 sm:px-5 sm:py-3 sm:text-[13px]">
                Lihat profil
              </Link>
            </div>
          </div>
        </div>
        <HeroRibbon id="landing" />
      </section>

      <section className="border-y border-line bg-white">
        <div className="sb-shell">
          <ul className="grid grid-cols-2 divide-line sm:grid-cols-3 md:grid-cols-6 md:divide-x">
            {[
              [LayoutGrid, "Organisasi", "Terstruktur"],
              [Users, "Keanggotaan", "Terverifikasi"],
              [CalendarDays, "Kegiatan", "Tercatat"],
              [Wallet, "Keuangan", "Terkendali"],
              [FileCheck2, "Dokumen", "Terarsip"],
              [ShieldCheck, "Akses", "Berjenjang"],
            ].map(([Icon, label, subtitle]) => (
              <li key={String(label)} className="flex flex-col items-center gap-2 px-3 py-6 text-center">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--sb-primary-50)] text-primary-700">
                  <Icon size={20} strokeWidth={1.9} aria-hidden />
                </span>
                <div className="text-[12px] font-semibold leading-tight text-ink">
                  {label}<br /><span className="font-medium text-[var(--sb-muted)]">{subtitle}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="sb-shell py-16">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-primary-700">Satu ekosistem kerja</div>
            <h2 className="font-display text-[30px] leading-[1.15] text-ink sm:text-[36px]">Kelola organisasi lebih terarah.</h2>
          </div>
          <p className="max-w-[46ch] text-[13.5px] leading-relaxed text-[var(--sb-muted)]">
            Setiap aplikasi memiliki sumber data dan kewenangan tersendiri. Ringkasan ditampilkan
            sesuai izin pengguna dan catatan yang benar-benar tersimpan.
          </p>
        </div>
        <div className="grid items-center gap-8 lg:grid-cols-[1.25fr_1fr]">
          <DashboardArt className="h-auto w-full" />
          <div>
            <ul className="space-y-3">
              {[
                ["Data sesuai sumbernya", "Catatan anggota, kegiatan, keuangan, dan usaha dipelihara pada modul pemilik data."],
                ["Kewenangan yang jelas", "Informasi dan tindakan mengikuti peran serta lingkup akun."],
                ["Jejak operasional", "Perubahan penting dicatat melalui alur server dan audit yang tersedia."],
              ].map(([title, note]) => (
                <li key={title} className="flex items-start gap-3 rounded-[14px] border border-line bg-white p-4">
                  <ShieldCheck size={18} className="mt-0.5 shrink-0 text-primary-700" aria-hidden />
                  <span>
                    <span className="block text-[13px] font-semibold text-ink">{title}</span>
                    <span className="mt-1 block text-[12px] leading-relaxed text-[var(--sb-muted)]">{note}</span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <Link href="/profil" className="sb-btn sb-btn-primary !px-6 !py-3 text-[13.5px]">
                Pelajari organisasi <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[var(--sb-canvas)] py-16">
        <div className="sb-shell">
          <div className="mx-auto mb-9 max-w-2xl text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-primary-700 shadow-sm">
              Aplikasi bidang
            </div>
            <h2 className="font-display text-[28px] leading-tight text-ink sm:text-[34px]">Bidang kerja dan mandatnya.</h2>
          </div>
          {loaded.unavailable ? (
            <PublicDataUnavailable resource="Registry bidang" retryHref="/" />
          ) : fields.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {fields.map((field) => {
                const Icon = FIELD_ICONS[field.field_key as keyof typeof FIELD_ICONS] ?? LayoutGrid;
                return (
                  <article key={field.field_key} className="rounded-[18px] border border-line bg-white p-5 shadow-[var(--sb-shadow)]">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] bg-[var(--sb-primary-50)] text-primary-700">
                      <Icon size={19} />
                    </span>
                    <h3 className="mt-3 text-[14px] font-bold text-ink">{field.name}</h3>
                    {field.mandate ? <p className="mt-2 text-[11.5px] leading-relaxed text-[var(--sb-muted)]">{field.mandate}</p> : null}
                  </article>
                );
              })}
            </div>
          ) : (
            <Card className="px-5 py-8">
              <EmptyState title="Bidang aktif belum tersedia" body="Daftar bidang akan muncul setelah registry organisasi dapat dibaca." />
            </Card>
          )}
        </div>
      </section>

      <section className="bg-[var(--sb-primary-900)] py-14 text-white">
        <div className="sb-shell">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-primary-300">Agenda publik</div>
              <h2 className="font-display text-[28px] leading-tight text-white sm:text-[32px]">Kegiatan yang dibuka untuk publik.</h2>
            </div>
            <Link href="/kegiatan" className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-primary-200 hover:text-white">
              Semua agenda <ArrowRight size={14} />
            </Link>
          </div>
          {loaded.unavailable ? (
            <p className="text-[12px] text-primary-100">Agenda publik belum dapat dimuat.</p>
          ) : activities.length ? (
            <div className="grid gap-3 md:grid-cols-3">
              {activities.map((activity) => (
                <article key={activity.id} className="rounded-[16px] bg-white/5 p-4 ring-1 ring-inset ring-white/10">
                  <Badge tone="info">{activity.field_name}</Badge>
                  <h3 className="mt-3 text-[14px] font-semibold text-white">{activity.title}</h3>
                  <div className="mt-2 text-[10.5px] text-primary-100">
                    {formatDateFull(activity.activity_date)}
                    {activity.start_time ? " · " + activity.start_time + " WIB" : ""}
                    {activity.location ? " · " + activity.location : ""}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-[14px] border border-white/15 bg-white/5 px-4 py-5 text-[12px] text-primary-100">
              Belum ada kegiatan yang ditandai terbuka untuk publik.
            </div>
          )}
        </div>
      </section>

      <section className="sb-shell py-14">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="sb-label mb-2">Katalog publik</div>
            <h2 className="font-display text-[28px] leading-tight text-ink sm:text-[32px]">Produk yang disetujui untuk ditampilkan.</h2>
          </div>
          <Link href="/produk" className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-primary-700 hover:underline">
            Buka katalog <ArrowRight size={14} />
          </Link>
        </div>
        {loaded.unavailable ? (
          <PublicDataUnavailable resource="Katalog produk" retryHref="/produk" />
        ) : products.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product) => (
              <Link key={product.id} href={\`/produk/${product.slug}\`} className="group rounded-[16px] border border-line bg-white p-4 transition hover:shadow-[var(--sb-shadow)]">
                <div className="flex aspect-[5/4] items-center justify-center rounded-[12px] bg-paper text-primary-700">
                  <Package size={34} strokeWidth={1.4} />
                </div>
                <div className="mt-3 text-[13px] font-bold text-ink group-hover:text-primary-800">{product.product_name}</div>
                <div className="mt-1 text-[10.5px] text-muted">{product.producer_label ?? product.category_label ?? "Produk anggota"}</div>
                <div className="mt-3 text-[12.5px] font-bold text-primary-800">{priceLabel(product.selling_price)}</div>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="px-5 py-8">
            <EmptyState title="Belum ada produk publik" body="Produk akan tampil setelah dicatat, diaktifkan, dan disetujui untuk publikasi." />
          </Card>
        )}
      </section>

      <section className="border-y border-line bg-[var(--sb-canvas)] py-12">
        <div className="sb-shell grid gap-5 md:grid-cols-3">
          <div className="md:col-span-2">
            <div className="sb-label mb-2">Transparansi</div>
            <h2 className="font-display text-[25px] leading-tight text-ink">Informasi resmi, sesuai klasifikasi akses.</h2>
            <p className="mt-2 max-w-2xl text-[12.5px] leading-relaxed text-[var(--sb-muted)]">
              Dokumen publik hanya ditampilkan setelah difinalkan dan diklasifikasikan untuk publik.
              Data internal anggota, mitra, dan keuangan tidak dibuka otomatis.
            </p>
          </div>
          <div className="flex items-center gap-2 md:justify-end">
            <Link href="/dokumen" className="sb-btn sb-btn-outline">Dokumen publik <ArrowRight size={13} /></Link>
            <Link href="/gabung" className="sb-btn sb-btn-primary">Minat bergabung <ArrowRight size={13} /></Link>
          </div>
        </div>
      </section>

      <section className="pb-10 pt-10 sm:pb-14">
        <div className="sb-shell">
          <div className="relative isolate overflow-hidden rounded-[24px] ring-1 ring-inset ring-white/10">
            <div className="absolute inset-0 -z-10 bg-[linear-gradient(118deg,#062b17_0%,#0b3a20_38%,#0f4b29_64%,#146033_100%)]" aria-hidden />
            <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-[linear-gradient(90deg,rgba(230,197,106,0.55),rgba(230,197,106,0.1)_40%,transparent)]" aria-hidden />
            <div className="relative flex flex-wrap items-center justify-between gap-6 px-6 py-8 sm:px-9 sm:py-9">
              <div className="flex items-center gap-4 sm:gap-5">
                <span className="relative grid h-16 w-16 shrink-0 place-items-center rounded-[18px] bg-white/[0.07] ring-1 ring-inset ring-[#e6c56a]/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_16px_30px_-20px_rgba(0,0,0,0.9)] sm:h-[72px] sm:w-[72px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/brand/emblem-gold.png" alt="" aria-hidden width={400} height={400} loading="lazy" className="h-10 w-10 drop-shadow-[0_4px_10px_rgba(0,0,0,0.35)] sm:h-11 sm:w-11" />
                </span>
                <div data-contrast-bg="#0a3a20">
                  <div className="mb-1.5 flex items-center gap-2.5">
                    <span className="h-px w-7 bg-[#e6c56a]" aria-hidden />
                    <span className="text-[9.5px] font-bold uppercase tracking-[0.22em] text-[#f0d79a]">Bergabung</span>
                  </div>
                  <h2 className="max-w-[24ch] font-display text-[21px] leading-[1.15] text-white sm:text-[26px]">Mari bertumbuh dan berkarya bersama.</h2>
                  <p className="mt-1.5 max-w-xl text-[12.5px] leading-relaxed text-[#d6ead9]">
                    Sampaikan minat bergabung. Pengurus akan meninjau pengajuan sesuai proses organisasi.
                  </p>
                </div>
              </div>
              <Link href="/gabung" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#f2d493] px-5 py-3 text-[13px] font-bold text-[#14351f] shadow-[0_14px_28px_-16px_rgba(0,0,0,0.8)] transition hover:bg-[#f8e3b4]">
                Formulir minat <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
