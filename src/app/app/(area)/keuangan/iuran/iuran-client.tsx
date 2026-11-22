"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowUpRight, Info, Users, Wallet } from "lucide-react";
import { Card, CardHeader, EmptyState, StatCard } from "@/components/ui";
import { useStore } from "@/lib/store";
import { MEMBERS } from "@/data/organization";
import { formatDateID, formatIDR } from "@/lib/format";
import { COA } from "@/data/coa";
import { balancesFor } from "@/lib/ledger";

/**
 * Iuran & Kontribusi — Blueprint §9.4.1.
 *
 * The blueprint is explicit that the contribution policy has not been decided
 * (§28), so this page never invents a tariff. It shows what the ledger
 * actually recorded against account 4-1200 "Kontribusi Anggota", states the
 * policy gap in one honest line, and points to where the policy would be set.
 */
export function IuranClient() {
  const { state } = useStore();
  const kontribusi = useMemo(
    () => balancesFor(state.journals, COA.filter((a) => a.code === "4-1200").map((a) => ({ code: a.code, name: a.name })))[0],
    [state.journals],
  );
  const account = COA.find((a) => a.code === "4-1200");
  const entries = [...kontribusi.entries].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="pb-10">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
        <div className="min-w-0">
          <div className="sb-label mb-1.5">Keuangan · Pendapatan Organisasi</div>
          <h1 className="font-display text-[24px] leading-tight font-semibold text-ink sm:text-[27px]">Iuran &amp; kontribusi anggota</h1>
          <p className="mt-1.5 max-w-2xl text-[13.5px] text-muted">
            Catatan kontribusi yang benar-benar masuk ke jurnal. Besaran iuran belum ditetapkan organisasi, jadi
            halaman ini tidak menampilkan tarif, tagihan, atau tunggakan yang belum ada dasarnya.
          </p>
        </div>
        <Link href="/app/keuangan/jurnal" className="sb-btn sb-btn-outline">Buka jurnal</Link>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Kontribusi tercatat"
          value={formatIDR(kontribusi.credit)}
          note={`${entries.length} entri jurnal · akun ${kontribusi.code}`}
          tone="success"
          icon={<Wallet size={17} strokeWidth={2.2} />}
        />
        <StatCard
          label="Besaran iuran"
          value="Belum ditetapkan"
          note="Blueprint §28 — kebijakan iuran belum diputuskan"
          tone="warning"
          icon={<Info size={17} strokeWidth={2.2} />}
        />
        <StatCard
          label="Anggota aktif"
          value={MEMBERS.filter((m) => m.status === "aktif").length}
          note={`${MEMBERS.filter((m) => m.status === "menunggu").length} calon menunggu verifikasi`}
          tone="info"
          href="/app/sekretariat/anggota"
          icon={<Users size={17} strokeWidth={2.2} />}
        />
      </div>

      <div className="mt-5 grid items-start gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader
            title="Entri kontribusi"
            subtitle={`Semua baris jurnal berstatus diposting pada akun ${kontribusi.code}`}
            action={<Link href="/app/keuangan/buku-besar" className="text-[11.5px] font-semibold text-primary-700">Buku besar →</Link>}
          />
          {entries.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="Belum ada kontribusi tercatat"
                body="Tidak ada jurnal yang menyentuh akun Kontribusi Anggota. Halaman ini akan terisi otomatis begitu pencatatan iuran dimulai."
              />
            </div>
          ) : (
            <div className="sb-scroll">
              <table className="sb-table min-w-[520px]">
                <thead>
                  <tr><th>Tanggal</th><th>Nomor jurnal</th><th>Keterangan</th><th className="num">Nilai</th></tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={`${e.id}-${e.line}`}>
                      <td className="whitespace-nowrap text-muted">{formatDateID(e.date, "short")}</td>
                      <td className="font-mono text-[11.5px] text-muted">{e.number}</td>
                      <td className="text-ink2">{e.description}</td>
                      <td className="num font-semibold tabular-nums text-ink">{formatIDR(e.line)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <Card className="p-4">
            <h2 className="font-display text-[13.5px] font-bold text-ink">Yang belum ditetapkan</h2>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
              Blueprint mencatat kebijakan iuran sebagai keputusan organisasi yang belum diambil. Karena itu demo
              tidak menampilkan nominal per anggota, jatuh tempo, maupun daftar tunggakan — semuanya akan dikarang.
            </p>
            <ul className="mt-3 space-y-2 text-[12px] text-ink2">
              {[
                "Besaran iuran pokok dan iuran wajib",
                "Periode penagihan (bulanan / tahunan)",
                "Konsekuensi keterlambatan",
                "Mekanisme penyaluran kontribusi ke program",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#b06f00]" aria-hidden />
                  {t}
                </li>
              ))}
            </ul>
            <Link href="/app/pengurus/pengaturan" className="mt-3 inline-flex items-center gap-1 text-[11.5px] font-semibold text-primary-700">
              Pengaturan organisasi <ArrowUpRight size={12} />
            </Link>
          </Card>

          <Card className="p-4">
            <h2 className="font-display text-[13.5px] font-bold text-ink">Akun terkait</h2>
            <dl className="mt-2 space-y-2 text-[12px]">
              <div className="flex items-start justify-between gap-3">
                <dt className="text-muted">Kode akun</dt>
                <dd className="font-mono text-[11.5px] text-ink2">{account?.code}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-muted">Nama</dt>
                <dd className="text-right font-medium text-ink2">{account?.name}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-muted">Saldo normal</dt>
                <dd className="text-ink2">Kredit</dd>
              </div>
            </dl>
            <p className="mt-2 border-t border-line pt-2 text-[11.5px] leading-relaxed text-muted2">
              {account?.note ?? "Kebijakan terkait akun ini belum ditetapkan."}
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
