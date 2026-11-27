import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicPolicySettings } from "@/lib/public-policies";
import { Card, Badge, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Kebijakan & Privasi",
  description: "Dokumen kebijakan, privasi, keamanan, dan ketentuan penggunaan situs KWT Srikandi Buana.",
};

export default async function KebijakanPage() {
  const settings = await getPublicPolicySettings();
  if (!settings.enabled) notFound();
  const documents = settings.documents.filter((document) => document.status === "published");
  const categories = [...new Set(documents.map((document) => document.category))];

  return (
    <div className="sb-shell py-12">
      <div className="sb-label mb-2">Informasi & ketentuan</div>
      <h1 className="font-display text-[34px] leading-tight font-semibold text-ink sm:text-[40px]">Kebijakan & privasi.</h1>
      <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-muted">
        Ketentuan penggunaan, perlindungan data, keamanan, publikasi, serta informasi pengelolaan situs.
        Dokumen yang ditampilkan berstatus terbit dan dapat diperbarui oleh pengelola organisasi.
      </p>
      {documents.length ? (
        <div className="mt-7 space-y-7">
          {categories.map((category) => (
            <section key={category}>
              <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">{category}</h2>
              <div className="grid gap-3 md:grid-cols-2">
                {documents.filter((document) => document.category === category).map((document) => (
                  <Link key={document.id} href={"/kebijakan/" + document.slug} className="block min-w-0">
                    <Card className="h-full p-4 transition hover:-translate-y-0.5 hover:shadow-md">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-[14px] font-semibold text-ink">{document.title}</h3>
                        <Badge tone="success">Terbit</Badge>
                      </div>
                      <p className="mt-2 text-[12px] leading-relaxed text-muted">{document.summary}</p>
                      <div className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-3 text-[10.5px] text-muted2">
                        <span>Versi {document.version}</span>
                        <span>{document.effectiveDate || "Tanggal berlaku belum dicantumkan"}</span>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <Card className="mt-7 p-6">
          <EmptyState title="Belum ada kebijakan yang diterbitkan" body="Dokumen akan ditampilkan setelah ditinjau dan diterbitkan oleh pengelola situs." />
        </Card>
      )}
      <p className="mt-7 text-[11px] text-muted">
        Untuk pertanyaan atau permintaan mengenai kebijakan dan data pribadi, silakan gunakan <Link href="/kontak" className="font-semibold text-primary-700 underline underline-offset-2">halaman kontak</Link>.
      </p>
    </div>
  );
}
