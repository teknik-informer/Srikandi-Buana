"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCheck, Bell, ExternalLink } from "lucide-react";
import { Badge, Card, CardHeader, StatCard } from "@/components/ui";
import { Btn, DemoStateChip, Segmented } from "@/components/act";
import { useStore } from "@/lib/store";
import { formatDateID } from "@/lib/format";

type Filter = "belum" | "semua";

export function NotifikasiClient() {
  const { state, exec } = useStore();
  const [filter, setFilter] = useState<Filter>("belum");

  const unread = state.notices.filter((n) => !n.read).length;
  const list = filter === "belum" ? state.notices.filter((n) => !n.read) : state.notices;

  return (
    <div className="pb-10">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
        <div>
          <div className="sb-label mb-1.5">Pusat Notifikasi</div>
          <h1 className="font-display text-[24px] leading-tight font-semibold text-ink sm:text-[27px]">Notifikasi</h1>
          <p className="mt-1.5 max-w-2xl text-[13.5px] text-muted">
            Dikelompokkan per akun dan konteks. Tanda dibaca tercatat per pengguna.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DemoStateChip compact />
          <Btn variant="outline" icon={<CheckCheck size={14} />} onClick={() => exec({ type: "notice.readAll" })} disabled={unread === 0}>
            Tandai semua dibaca
          </Btn>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Belum dibaca" value={unread} note={unread ? "Perlu perhatian Anda" : "Semua sudah dibaca"} tone={unread ? "warning" : "success"} icon={<Bell size={17} />} />
        <StatCard label="Total notifikasi" value={state.notices.length} note="Termasuk dari sesi ini" tone="info" />
        <StatCard label="Dibaca" value={state.notices.length - unread} tone="success" />
      </div>

      <div className="mt-4">
        <Segmented<Filter>
          label="Filter notifikasi"
          value={filter}
          onChange={setFilter}
          options={[
            { key: "belum", label: "Belum dibaca", count: unread },
            { key: "semua", label: "Semua", count: state.notices.length },
          ]}
        />
      </div>

      <Card className="mt-4">
        <CardHeader title="Terbaru" subtitle={`${unread} belum dibaca`} />
        <ul className="divide-y divide-line">
          {list.map((n) => (
            <li key={n.id} className={`px-4 py-3 ${n.read ? "" : "bg-primary-50/40"}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-label="Belum dibaca" />}
                    <span className="text-[12.5px] font-semibold text-ink">{n.title}</span>
                  </div>
                  <p className="mt-0.5 text-[11.5px] text-muted">{n.body}</p>
                  <div className="mt-0.5 text-[10.5px] text-muted2">{formatDateID(n.date, "short")} · untuk {n.audience}</div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge tone={n.tone}>{n.tone}</Badge>
                  {n.href ? (
                    <Link href={n.href} className="inline-flex min-h-[32px] items-center gap-1 rounded-full px-2 text-[11px] font-semibold text-primary-700 hover:bg-primary-50">
                      Buka <ExternalLink size={11} />
                    </Link>
                  ) : null}
                  {!n.read ? (
                    <Btn size="sm" variant="ghost" onClick={() => exec({ type: "notice.read", id: n.id })}>Tandai dibaca</Btn>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
          {list.length === 0 ? (
            <li className="px-4 py-10 text-center">
              <CheckCheck size={20} className="mx-auto text-[var(--sb-success)]" />
              <p className="mt-1.5 text-[13px] font-semibold text-ink">Tidak ada yang belum dibaca</p>
              <p className="mt-0.5 text-[12px] text-muted">Semua notifikasi sudah Anda tindak lanjuti.</p>
            </li>
          ) : null}
        </ul>
      </Card>
    </div>
  );
}
