import Link from "next/link";
import { Card, Notice } from "@/components/ui";

export function PublicDataUnavailable({
  resource,
  retryHref,
}: {
  resource: string;
  retryHref: string;
}) {
  return (
    <section className="mt-7" aria-live="polite">
      <Card className="p-4 sm:p-5">
        <Notice tone="warning" title={`${resource} sementara tidak dapat dimuat`}>
          Sambungan ke layanan data sedang terganggu. Informasi belum dapat ditampilkan.
          Silakan coba muat ulang beberapa saat lagi.
        </Notice>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <a href={retryHref} className="sb-btn sb-btn-outline">Coba muat ulang</a>
          <Link href="/kontak?tujuan=informasi" className="text-[12px] font-semibold text-primary-700 hover:underline">
            Hubungi Sekretariat
          </Link>
        </div>
      </Card>
    </section>
  );
}
