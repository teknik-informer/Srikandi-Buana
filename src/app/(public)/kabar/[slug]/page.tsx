import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NEWS } from "@/data/content";
import { formatDateFull } from "@/lib/format";
import { Badge, Card } from "@/components/ui";

export function generateStaticParams() {
  return NEWS.filter((n) => n.status === "published").map((n) => ({ slug: n.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const n = NEWS.find((x) => x.slug === slug && x.status === "published");
  if (!n) return { title: "Kabar tidak ditemukan" };
  return { title: n.title, description: n.excerpt };
}

export default async function KabarDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const n = NEWS.find((x) => x.slug === slug && x.status === "published");
  if (!n) notFound();
  const others = NEWS.filter((x) => x.status === "published" && x.slug !== n.slug).slice(0, 2);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <nav className="mb-5 text-[12px] text-muted">
        <Link href="/kabar" className="hover:underline">Kabar</Link>
        <span className="mx-1.5">/</span>
        <span className="line-clamp-1 inline text-ink2">{n.title}</span>
      </nav>

      <Badge tone="accent">{n.kind}</Badge>
      <h1 className="mt-3 font-display text-[30px] leading-tight font-semibold text-primary-950 sm:text-[38px]">{n.title}</h1>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-muted">
        <span>{formatDateFull(n.date)}</span>
        <span>·</span>
        <span>{n.author}</span>
      </div>

      <div className="mt-7 overflow-hidden rounded-[16px] border border-line">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={n.image} alt={n.title} className="aspect-[16/9] w-full object-cover" width={1200} height={675} />
      </div>

      <article className="prose-sb mt-8">
        {n.body.map((p, i) => <p key={i} className="text-[14.5px] leading-[1.75]">{p}</p>)}
      </article>

      <div className="mt-6 flex flex-wrap gap-1.5">
        {n.tags.map((t) => <span key={t} className="sb-chip">{t}</span>)}
      </div>

      <div className="mt-10 border-t border-line pt-6">
        <h2 className="font-display text-[20px] font-semibold text-ink">Kabar lainnya</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {others.map((o) => (
            <Card key={o.slug} className="p-4">
              <div className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-primary-700">{o.kind} · {o.date}</div>
              <Link href={`/kabar/${o.slug}`} className="mt-1 block text-[13.5px] font-semibold text-ink hover:text-primary-800">{o.title}</Link>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
