"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCheck, Bell, ExternalLink, Megaphone, Trash2 } from "lucide-react";
import { Badge, Card, CardHeader, StatCard } from "@/components/ui";
import { Btn, DemoStateChip, Field, Modal, Segmented, Select, TextArea, TextInput } from "@/components/act";
import { useStore } from "@/lib/store";
import { formatDateID } from "@/lib/format";

type Filter = "belum" | "semua";

export function NotifikasiClient() {
  const { state, exec, actor } = useStore();
  const [filter, setFilter] = useState<Filter>("belum");
  const [umumkan, setUmumkan] = useState(false);

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
          <Btn variant="primary" icon={<Megaphone size={14} />} onClick={() => setUmumkan(true)}>
            Umumkan
          </Btn>
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
                  <button
                    type="button"
                    aria-label={`Hapus notifikasi ${n.title}`}
                    onClick={() => {
                      if (window.confirm(`Hapus notifikasi "${n.title}"?`)) {
                        exec({ type: "notice.delete", id: n.id, actor });
                      }
                    }}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted2 transition hover:bg-[var(--sb-danger-bg)] hover:text-[var(--sb-danger)]"
                  >
                    <Trash2 size={13} />
                  </button>
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

      {umumkan ? <FormUmumkan onTutup={() => setUmumkan(false)} /> : null}
    </div>
  );
}

const TONE_PILIHAN = [
  { value: "info", label: "Informasi" },
  { value: "success", label: "Kabar baik" },
  { value: "warning", label: "Perlu perhatian" },
  { value: "danger", label: "Mendesak" },
] as const;

function FormUmumkan({ onTutup }: { onTutup: () => void }) {
  const { exec, actor } = useStore();
  const [judul, setJudul] = useState("");
  const [isi, setIsi] = useState("");
  const [untuk, setUntuk] = useState("Semua pengurus");
  const [tone, setTone] = useState<(typeof TONE_PILIHAN)[number]["value"]>("info");
  const [tautan, setTautan] = useState("");
  const [galat, setGalat] = useState<string | null>(null);

  const kirim = () => {
    const hasil = exec({
      type: "notice.broadcast",
      title: judul,
      body: isi,
      audience: untuk,
      tone,
      href: tautan,
      actor,
    });
    if (!hasil.ok) {
      setGalat(hasil.message);
      return;
    }
    onTutup();
  };

  return (
    <Modal
      open
      onClose={onTutup}
      title="Umumkan pemberitahuan"
      description="Pengumuman langsung masuk ke pusat notifikasi semua pengurus dan tercatat di jejak audit."
      width={540}
      footer={
        <>
          <Btn variant="ghost" onClick={onTutup}>Batal</Btn>
          <Btn variant="primary" onClick={kirim}>Kirim pengumuman</Btn>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Judul" required>
          {(id) => (
            <TextInput id={id} value={judul} onChange={(e) => setJudul(e.target.value)} placeholder="mis. Rapat koordinasi dimajukan" />
          )}
        </Field>
        <Field label="Isi pemberitahuan" required hint="Sebutkan siapa yang perlu bertindak, apa, dan kapan.">
          {(id) => (
            <TextArea id={id} className="min-h-[96px]" value={isi} onChange={(e) => setIsi(e.target.value)} placeholder="Rapat koordinasi bidang dimajukan ke Kamis, 26 November 2026, pukul 19.00 WIB di balai desa." />
          )}
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Untuk">
            {(id) => <TextInput id={id} value={untuk} onChange={(e) => setUntuk(e.target.value)} placeholder="Semua pengurus / Bidang Usaha" />}
          </Field>
          <Field label="Nada">
            {(id) => (
              <Select id={id} value={tone} onChange={(e) => setTone(e.target.value as typeof tone)}>
                {TONE_PILIHAN.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </Select>
            )}
          </Field>
        </div>
        <Field label="Tautan tujuan" hint="Opsional — mis. /app/sekretariat/rapat agar penerima bisa langsung membuka.">
          {(id) => <TextInput id={id} value={tautan} onChange={(e) => setTautan(e.target.value)} placeholder="/app/sekretariat/rapat" />}
        </Field>
        {galat ? (
          <p className="rounded-sb-sm border border-[var(--sb-danger)]/30 bg-[var(--sb-danger-bg)] px-3 py-2 text-[12px] text-[var(--sb-danger)]">{galat}</p>
        ) : null}
      </div>
    </Modal>
  );
}
