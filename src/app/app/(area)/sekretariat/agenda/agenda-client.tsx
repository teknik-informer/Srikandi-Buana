"use client";

/**
 * Agenda organisasi — dari kalender yang hanya bisa dibaca menjadi kalender
 * yang bisa diisi. Kegiatan yang dicatat di sini langsung muncul di Meja Kerja
 * ("agenda terdekat") dan di kalender yang sama untuk semua pengurus.
 */
import { useMemo, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { FIELDS } from "@/config/fields";
import { Badge, Card, CardHeader, PageHeader } from "@/components/ui";
import { Btn, Field, Modal, Select, TextInput } from "@/components/act";
import { formatDateFull, relativeID } from "@/lib/format";

const BIDANG_LABEL: Record<string, string> = {
  organisasi: "Organisasi & Keanggotaan",
  pertanian: "Pertanian & Produksi",
  pelatihan: "Pemberdayaan & Pelatihan",
  usaha: "Usaha & Kemitraan",
};

export function AgendaClient() {
  const { state, exec, actor } = useStore();
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [f, setF] = useState({ name: "", date: "", time: "09.00–11.00", location: "Balai pertemuan", bidang: "organisasi", openToPublic: false });

  const byDate = useMemo(() => {
    const m = new Map<string, typeof state.activities>();
    for (const a of state.activities.filter((x) => x.status !== "dibatalkan")) {
      m.set(a.date, [...(m.get(a.date) ?? []), a]);
    }
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [state.activities]);

  function simpan() {
    const r = exec({
      type: "activity.create",
      activity: {
        name: f.name, date: f.date, time: f.time, location: f.location, bidang: f.bidang,
        programCode: "", participants: 0, status: "terjadwal", openToPublic: f.openToPublic, person: actor.name,
      },
      actor,
    });
    if (r.ok) {
      setOpen(false);
      setF({ ...f, name: "" });
      setErr(null);
    } else setErr(r.message);
  }

  const mendatang = state.activities.filter((a) => a.status === "terjadwal").length;

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Sekretariat · agenda"
        title="Agenda organisasi"
        description="Kalender kegiatan lintas bidang. Yang dicatat di sini muncul di Meja Kerja semua pengurus; kegiatan publik dapat tampil di halaman agenda website."
        actions={
          <div className="flex items-center gap-2">
            <Link href="/app/kerja" className="sb-btn sb-btn-outline">Meja kerja</Link>
            <Btn variant="primary" onClick={() => setOpen(true)}>Catat agenda</Btn>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2 text-[12px] text-muted">
        <Badge tone="info">{mendatang} kegiatan terjadwal</Badge>
        <span>·</span>
        <span>{state.activities.length} tercatat seluruhnya</span>
      </div>

      <div className="space-y-4">
        {byDate.length ? (
          byDate.map(([date, items]) => (
            <Card key={date}>
              <CardHeader
                title={formatDateFull(date)}
                subtitle={`${items.length} kegiatan · ${relativeID(date)}`}
              />
              <ul className="divide-y divide-line/70 px-4 pb-3">
                {items.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-start justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[13px] font-medium text-ink">{a.name}</span>
                        {a.openToPublic ? <Badge tone="success">Publik</Badge> : <Badge tone="neutral">Internal</Badge>}
                        <Badge tone={a.status === "terjadwal" ? "info" : a.status === "selesai" ? "success" : "neutral"}>{a.status}</Badge>
                      </div>
                      <div className="mt-0.5 text-[11.5px] text-muted">
                        {a.time} · {a.location} · {BIDANG_LABEL[a.bidang] ?? a.bidang} · penanggung jawab {a.person}
                        {a.participants ? ` · ${a.participants} peserta` : ""}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      {a.status === "terjadwal" ? (
                        <button
                          className="sb-btn sb-btn-outline !px-2.5 !py-1 text-[11px]"
                          onClick={() => exec({ type: "activity.status", id: a.id, status: "selesai", actor })}
                        >
                          Tandai selesai
                        </button>
                      ) : (
                        <button
                          className="sb-btn sb-btn-outline !px-2.5 !py-1 text-[11px]"
                          onClick={() => exec({ type: "activity.status", id: a.id, status: "terjadwal", actor })}
                        >
                          Jadwalkan lagi
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          ))
        ) : (
          <Card>
            <div className="px-4 py-10 text-center text-[12.5px] text-muted">
              Belum ada agenda. <button className="font-semibold text-primary-700" onClick={() => setOpen(true)}>Catat kegiatan pertama</button>.
            </div>
          </Card>
        )}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Catat agenda"
        description="Muncul di kalender dan di Meja Kerja semua pengurus."
        footer={
          <>
            <Btn variant="ghost" onClick={() => setOpen(false)}>Batal</Btn>
            <Btn variant="primary" onClick={simpan}>Simpan agenda</Btn>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Nama kegiatan" required error={err ?? undefined}>
            {(id) => <TextInput id={id} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="mis. Rapat evaluasi panen" />}
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Tanggal" required>{(id) => (
              <TextInput id={id} type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
            )}</Field>
            <Field label="Waktu">{(id) => (
              <TextInput id={id} value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} />
            )}</Field>
            <Field label="Tempat">{(id) => (
              <TextInput id={id} value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} />
            )}</Field>
            <Field label="Bidang">{(id) => (
              <Select id={id} value={f.bidang} onChange={(e) => setF({ ...f, bidang: e.target.value })}>
                {FIELDS.map((x) => <option key={x.slug} value={x.slug}>{x.shortName}</option>)}
              </Select>
            )}</Field>
          </div>
          <label className="flex items-center gap-2 text-[12.5px] text-ink2">
            <input type="checkbox" checked={f.openToPublic} onChange={(e) => setF({ ...f, openToPublic: e.target.checked })} />
            Terbuka untuk umum
          </label>
        </div>
      </Modal>
    </div>
  );
}
