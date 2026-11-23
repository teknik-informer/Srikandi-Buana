import Link from "next/link";
import type { Metadata } from "next";
import { ArrowDownLeft, ArrowUpRight, CalendarClock } from "lucide-react";
import { Badge, Card, CardHeader, Notice, PageHeader, StatCard } from "@/components/ui";
import { formatDateID } from "@/lib/format";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { requireIdentity } from "@/lib/session";

export const metadata: Metadata = { title: "Agenda Surat & Ekspedisi" };

interface LetterRow {
  id: string;
  reference_no: string;
  direction: "masuk" | "keluar";
  number: string | null;
  subject: string;
  counterpart: string;
  date: string;
  status: "baru" | "diproses" | "selesai";
  assignee: string;
}

const statusTone: Record<LetterRow["status"], "warning" | "info" | "success"> = {
  baru: "warning",
  diproses: "info",
  selesai: "success",
};

export default async function EkspedisiPage() {
  const identity = await requireIdentity("secretariat:read");
  const sql = getV9Sql();
  const query = await sql`
    SELECT
      id::text AS id,
      reference_no,
      direction,
      number,
      subject,
      counterpart,
      letter_date::text AS date,
      status,
      assignee_label AS assignee
    FROM v9.secretariat_letters
    WHERE organization_id = ${identity.organizationId}
    ORDER BY letter_date DESC, created_at DESC
    LIMIT 500
  `;
  const letters = rowsFromResult<LetterRow>(query);
  const keluar = letters.filter((letter) => letter.direction === "keluar");
  const masuk = letters.filter((letter) => letter.direction === "masuk");
  const perluTindak = letters.filter((letter) => letter.status !== "selesai");

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Sekretariat"
        title="Agenda surat & ekspedisi"
        description="Pemantauan surat keluar dan tindak lanjut surat masuk. Catatan ekspedisi terhubung dengan register surat Sekretariat."
        actions={<Link href="/app/sekretariat/surat" className="sb-btn sb-btn-outline">Buka register surat</Link>}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Surat keluar" value={keluar.length} note="Agenda ekspedisi" />
        <StatCard label="Surat masuk" value={masuk.length} note="Perlu disposisi" tone="info" />
        <StatCard label="Belum selesai" value={perluTindak.length} note="Baru atau diproses" tone={perluTindak.length ? "warning" : "success"} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Agenda ekspedisi — surat keluar" subtitle={`${keluar.length} catatan · diurutkan menurut tanggal`} />
          {keluar.length ? (
            <div className="divide-y divide-line">
              {keluar.map((letter) => (
                <div key={letter.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[12.5px] font-semibold text-ink">{letter.subject}</div>
                      <div className="mt-0.5 text-[11px] text-muted">Tujuan {letter.counterpart}</div>
                    </div>
                    <Badge tone={statusTone[letter.status]}>{letter.status}</Badge>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10.5px] text-muted2">
                    <span>{letter.number ?? letter.reference_no}</span>
                    <span>{formatDateID(letter.date, "short")}</span>
                    <span>PIC {letter.assignee}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-4 py-10 text-center text-[12px] text-muted">Belum ada surat keluar yang terdaftar.</div>
          )}
        </Card>

        <Card>
          <CardHeader title="Tindak lanjut — surat masuk" subtitle={`${masuk.length} catatan · disposisi dan tindak lanjut`} />
          {masuk.length ? (
            <div className="divide-y divide-line">
              {masuk.map((letter) => (
                <div key={letter.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[12.5px] font-semibold text-ink">{letter.subject}</div>
                      <div className="mt-0.5 text-[11px] text-muted">Dari {letter.counterpart}</div>
                    </div>
                    <Badge tone={statusTone[letter.status]}>{letter.status}</Badge>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10.5px] text-muted2">
                    <span className="font-mono">{letter.number ?? letter.reference_no}</span>
                    <span>Diterima {formatDateID(letter.date, "short")}</span>
                    <span>PIC {letter.assignee}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-4 py-10 text-center text-[12px] text-muted">Belum ada surat masuk yang terdaftar.</div>
          )}
        </Card>
      </div>

      <div className="mt-5">
        <Notice tone="info" title="Nomor surat dan referensi register">
          Referensi internal dibuat oleh sistem untuk pelacakan. Nomor surat resmi tetap dicatat
          sesuai ketentuan penomoran organisasi, bukan dihasilkan dari format yang belum disahkan.
        </Notice>
      </div>

      <div className="mt-4 flex items-center gap-2 text-[11px] text-muted2">
        <CalendarClock size={13} />
        Register dan ekspedisi menggunakan satu sumber data surat yang sama.
      </div>
    </div>
  );
}
