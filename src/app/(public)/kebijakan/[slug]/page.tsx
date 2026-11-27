import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicPolicySettings } from "@/lib/public-policies";
import { Badge } from "@/components/ui";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const settings = await getPublicPolicySettings();
  const document = settings.enabled
    ? settings.documents.find((item) => item.slug === slug && item.status === "published")
    : undefined;
  return document
    ? { title: document.title, description: document.summary }
    : { title: "Dokumen tidak ditemukan" };
}

export default async function KebijakanDetailPage({ params }: Props) {
  const { slug } = await params;
  const settings = await getPublicPolicySettings();
  if (!settings.enabled) notFound();
  const document = settings.documents.find((item) => item.slug === slug && item.status === "published");
  if (!document) notFound();

  return (
    <article className="sb-shell max-w-4xl py-12">
      <Link href="/kebijakan" className="text-[11.5px] font-semibold text-primary-700 hover:underline">← Semua kebijakan</Link>
      <header className="mt-5 border-b border-line pb-6">
        <div className="sb-label mb-2">{document.category}</div>
        <h1 className="font-display text-[32px] font-semibold leading-tight text-ink sm:text-[40px]">{document.title}</h1>
        <p className="mt-3 max-w-3xl text-[13px] leading-relaxed text-muted">{document.summary}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-[10.5px] text-muted">
          <Badge tone="success">Terbit</Badge>
          <span>Versi {document.version}</span>
          {document.effectiveDate ? <span>· Berlaku {document.effectiveDate}</span> : null}
        </div>
      </header>
      <div className="divide-y divide-line">
        {document.sections.map((section) => (
          <section key={section.id} className="py-6">
            <h2 className="text-[16px] font-semibold text-ink">{section.heading}</h2>
            {section.body.split(/\n{2,}/).filter(Boolean).map((paragraph, index) => (
              <p key={section.id + "-" + index} className="mt-3 whitespace-pre-line text-[13px] leading-[1.85] text-ink2">{paragraph}</p>
            ))}
          </section>
        ))}
      </div>
      <footer className="mt-6 border-t border-line pt-5 text-[11px] text-muted">
        Dokumen dapat diperbarui oleh pengelola situs. Periksa versi dan tanggal berlaku pada bagian atas halaman.
      </footer>
    </article>
  );
}
