import type { Metadata } from "next";
import Link from "next/link";
import { NOTICES } from "@/data/organization";
import { Badge, Card, CardHeader, PageHeader } from "@/components/ui";
import { formatDateID } from "@/lib/format";

export const metadata: Metadata = { title: "Notifikasi" };

const TONE: Record<string, "info" | "success" | "warning" | "danger"> = { info: "info", success: "success", warning: "warning", danger: "danger" };

export default function NotifikasiPage() {
  return (
    <div className="pb-10">
      <PageHeader eyebrow="Pusat Notifikasi" title="Notifikasi" description="Dikelompokkan per akun dan konteks. Tanda dibaca tercatat per pengguna." />
      <Card>
        <CardHeader title="Terbaru" subtitle={`${NOTICES.filter((n) => !n.read).length} belum dibaca`} />
        <ul className="divide-y divide-line">
          {NOTICES.map((n) => (
            <li key={n.id} className={`px-4 py-3 ${n.read ? "" : "bg-primary-50/40"}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
                    <span className="text-[12.5px] font-semibold text-ink">{n.title}</span>
                  </div>
                  <p className="mt-0.5 text-[11.5px] text-muted">{n.body}</p>
                  <div className="mt-0.5 text-[10.5px] text-muted2">{formatDateID(n.date, "short")} · untuk {n.audience}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={TONE[n.tone]}>{n.tone}</Badge>
                  {n.href ? <Link href={n.href} className="text-[11px] font-semibold text-primary-700">Buka →</Link> : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
