import Link from "next/link";
import type { FieldDef } from "@/config/fields";
import { PROGRAMS, TASKS, ACTIVITIES, LANDS, HARVESTS, TRAININGS, PRODUCTS, ORDERS, PARTNERS } from "@/data/operations";
import { MEMBERS } from "@/data/organization";
import { Badge, Card, CardHeader, PageHeader, Progress, StatCard, StatusBadge, EmptyState } from "@/components/ui";
import { FieldMark } from "@/components/brand";
import { formatIDR, formatDateID, relativeID, percent } from "@/lib/format";

const BIDANG_LABEL: Record<string, string> = {
  organisasi: "Organisasi & Keanggotaan",
  pertanian: "Pertanian & Produksi",
  pelatihan: "Pemberdayaan & Pelatihan",
  usaha: "Usaha & Kemitraan",
};

/** Domain table that differs per bidang — the template stays shared, the data does not. */
function OperationalTable({ field }: { field: FieldDef }) {
  const code = field.slug;

  if (code === "pertanian") {
    return (
      <div className="sb-scroll">
        <table className="sb-table min-w-[620px]">
          <thead><tr><th>Petak</th><th>Pemilik</th><th>Komoditas</th><th className="num">Luas</th><th>Kunjungan terakhir</th><th>Status</th></tr></thead>
          <tbody>
            {LANDS.slice(0, 6).map((l) => (
              <tr key={l.id}>
                <td className="font-mono text-[12px] text-muted">{l.id}</td>
                <td className="font-medium text-ink">{l.owner}</td>
                <td>{l.commodity}</td>
                <td className="num">{l.areaHa.toFixed(2)} ha</td>
                <td className="text-muted">{formatDateID(l.lastVisit, "short")}</td>
                <td><StatusBadge status={l.status === "produktif" ? "Produktif" : l.status === "persiapan" ? "Persiapan" : "Istirahat"} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (code === "pelatihan") {
    return (
      <div className="sb-scroll">
        <table className="sb-table min-w-[620px]">
          <thead><tr><th>Pelatihan</th><th>Tanggal</th><th>Narasumber</th><th className="num">Peserta</th><th>Status</th></tr></thead>
          <tbody>
            {TRAININGS.slice(0, 6).map((t) => (
              <tr key={t.id}>
                <td className="font-medium text-ink">{t.title}</td>
                <td className="whitespace-nowrap text-muted">{formatDateID(t.date, "short")}</td>
                <td className="text-muted">{t.trainer}</td>
                <td className="num">{t.registered}/{t.seats}</td>
                <td><StatusBadge status={t.status === "selesai" ? "Selesai" : t.status === "dibuka" ? "Dibuka" : "Rencana"} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (code === "usaha") {
    return (
      <div className="sb-scroll">
        <table className="sb-table min-w-[640px]">
          <thead><tr><th>Produk</th><th>Kategori</th><th className="num">Harga</th><th className="num">Stok</th><th className="num">HPP</th><th>Publikasi</th></tr></thead>
          <tbody>
            {PRODUCTS.slice(0, 6).map((p) => (
              <tr key={p.id}>
                <td className="font-medium text-ink">{p.name}</td>
                <td>{p.category}</td>
                <td className="num">{formatIDR(p.price)}</td>
                <td className="num">{p.stock}</td>
                <td className="num text-muted">{formatIDR(p.hpp)}</td>
                <td><Badge tone={p.published ? "success" : "neutral"}>{p.published ? "Terpublikasi" : "Draf"}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return (
    <div className="sb-scroll">
      <table className="sb-table min-w-[600px]">
        <thead><tr><th>Anggota</th><th>Peran</th><th>Cakupan</th><th>Bergabung</th><th>Status</th></tr></thead>
        <tbody>
          {MEMBERS.filter((m) => m.status === "aktif").slice(0, 6).map((m) => (
            <tr key={m.id}>
              <td className="font-medium text-ink">{m.name}</td>
              <td>{m.role}</td>
              <td className="text-muted">{m.scope}</td>
              <td className="text-muted">{formatDateID(m.joined, "short")}</td>
              <td><StatusBadge status="Aktif" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FieldSignals({ field }: { field: FieldDef }) {
  const code = field.slug;
  if (code === "pertanian") {
    const total = HARVESTS.reduce((s, h) => s + h.weightKg, 0);
    return (
      <Card>
        <CardHeader title="Panen bulan ini" subtitle={`${HARVESTS.length} catatan panen · ${total.toLocaleString("id-ID")} kg`} action={<Badge tone="accent">Live demo</Badge>} />
        <ul className="divide-y divide-line">
          {HARVESTS.slice(0, 5).map((h) => (
            <li key={h.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <div>
                <div className="text-[12.5px] font-medium text-ink">{h.commodity}</div>
                <div className="text-[10.5px] text-muted2">{formatDateID(h.date, "short")} · {h.plotId} · grade {h.grade}</div>
              </div>
              <div className="text-right">
                <div className="text-[12.5px] font-semibold text-primary-800">{h.weightKg.toLocaleString("id-ID")} kg</div>
                <div className="text-[10.5px] text-muted2">{formatIDR(h.pricePerKg)}/kg</div>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    );
  }
  if (code === "pelatihan") {
    const done = TRAININGS.filter((t) => t.status === "selesai");
    return (
      <Card>
        <CardHeader title="Capaian pembelajaran" subtitle="Pre/post assessment dari kelas terlaksana" />
        <div className="space-y-3 px-4 py-3">
          {done.map((t) => (
            <div key={t.id}>
              <div className="flex items-center justify-between text-[12px]">
                <span className="font-medium text-ink">{t.title}</span>
                <span className="font-semibold text-primary-800">{t.preScore} → {t.postScore}</span>
              </div>
              <div className="mt-1 flex gap-1">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface2">
                  <div className="h-full rounded-full bg-primary-300" style={{ width: `${t.preScore}%` }} />
                </div>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface2">
                  <div className="h-full rounded-full bg-primary-600" style={{ width: `${t.postScore}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }
  if (code === "usaha") {
    return (
      <Card>
        <CardHeader title="Pesanan terbaru" subtitle="Kanal POS, WhatsApp, dan mitra" action={<Link href="/app/pos" className="text-[11.5px] font-semibold text-primary-700">Buka POS</Link>} />
        <ul className="divide-y divide-line">
          {ORDERS.slice(0, 5).map((o) => {
            const total = o.items.reduce((s, i) => s + i.qty * i.price, 0);
            return (
              <li key={o.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div>
                  <div className="text-[12.5px] font-medium text-ink">{o.customer}</div>
                  <div className="text-[10.5px] text-muted2">{o.id} · {o.channel} · {formatDateID(o.date, "short")}</div>
                </div>
                <div className="text-right">
                  <div className="text-[12.5px] font-semibold text-primary-800">{formatIDR(total)}</div>
                  <StatusBadge status={o.status === "lunas" ? "Lunas" : o.status === "baru" ? "Baru" : o.status} />
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
    );
  }
  const waiting = MEMBERS.filter((m) => m.status === "menunggu");
  return (
    <Card>
      <CardHeader title="Partisipasi & usulan" subtitle="Dari survei kebutuhan dan usulan anggota" />
      <div className="space-y-3 px-4 py-3">
        <div>
          <div className="mb-1 flex justify-between text-[11.5px] text-muted"><span>Partisipasi kegiatan bulan ini</span><span className="font-semibold text-ink">76%</span></div>
          <Progress value={76} />
        </div>
        <div>
          <div className="mb-1 flex justify-between text-[11.5px] text-muted"><span>Usulan anggota ditindaklanjuti</span><span className="font-semibold text-ink">6/9</span></div>
          <Progress value={67} tone="accent" />
        </div>
        <div className="rounded-sb-sm border border-warning/30 bg-[var(--sb-warning-bg)] px-3 py-2 text-[11.5px] text-[var(--sb-warning)]">
          {waiting.length} calon anggota menunggu verifikasi data.
        </div>
      </div>
    </Card>
  );
}

export function FieldDashboard({ field }: { field: FieldDef }) {
  const code = field.slug;
  const programs = PROGRAMS.filter((p) => p.bidang === code);
  const tasks = TASKS.filter((t) => t.bidang === code);
  const agenda = ACTIVITIES.filter((a) => a.bidang === code && a.status === "terjadwal");

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow={`${field.fieldId} · ${BIDANG_LABEL[field.slug] ?? field.name}`}
        title={field.name}
        description={field.mandate}
        actions={
          <>
            <StatusBadge status={field.appStatus === "aktif" ? "Aktif" : field.appStatus} />
            <Link href={`${field.appHref}/profil-mandat`} className="sb-btn sb-btn-outline !py-1.5 text-[12px]">Profil &amp; Mandat</Link>
          </>
        }
      />

      <div className="mb-5 flex items-start gap-3 rounded-sb border border-line bg-white p-3.5">
        <FieldMark icon={field.icon} accent={field.accent} />
        <div className="grid flex-1 gap-x-6 gap-y-1 text-[11.5px] sm:grid-cols-3">
          <div><span className="text-muted">Dasar keputusan:</span> <span className="font-medium text-ink2">{field.decision.kind}</span></div>
          <div><span className="text-muted">Nomor:</span> <span className="font-medium text-ink2">{field.decision.number}</span></div>
          <div><span className="text-muted">Koordinator:</span> <span className="font-medium text-ink2">{field.coordinator}</span></div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {field.kpis.map((k, i) => (
          <StatCard key={k.label} label={k.label} value={k.value} note={k.note} tone={i === 0 ? "success" : i === 1 ? "info" : "accent"} />
        ))}
        <StatCard label="Tugas terbuka" value={tasks.filter((t) => t.status !== "selesai").length} note={`${tasks.filter((t) => t.status === "terlambat").length} terlambat`} tone="warning" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Program & capaian"
              subtitle="Target, indikator, dan realisasi dari bidang ini"
              action={<Link href={`${field.appHref}/rencana`} className="text-[11.5px] font-semibold text-primary-700">Rencana kerja →</Link>}
            />
            <div className="divide-y divide-line">
              {programs.map((p) => (
                <div key={p.code} className="px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-[13px] font-semibold text-ink">{p.name}</div>
                    <StatusBadge status={p.status === "berjalan" ? "Berjalan" : p.status === "perencanaan" ? "Perencanaan" : p.status} />
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted">
                    <span>{p.period}</span>
                    <span>Anggaran {formatIDR(p.budget)}</span>
                    <span>Realisasi {formatIDR(p.spent)} ({percent(p.spent, p.budget)}%)</span>
                  </div>
                  <div className="mt-2"><Progress value={p.progress} /></div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {p.indicators.map((i) => (
                      <span key={i.label} className="sb-chip !text-[10px]">{i.label}: <strong>{i.actual}</strong>/{i.target}</span>
                    ))}
                  </div>
                </div>
              ))}
              {programs.length === 0 && <EmptyState title="Belum ada program" body="Program untuk bidang ini belum dibuat pada periode berjalan." />}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Data operasional bidang"
              subtitle={field.operationalData.map((d) => `${d.entity} (${d.count})`).join(" · ")}
              action={<Link href={`${field.appHref}/data`} className="text-[11.5px] font-semibold text-primary-700">Buka data →</Link>}
            />
            <OperationalTable field={field} />
          </Card>
        </div>

        <div className="space-y-4">
          <FieldSignals field={field} />
          <Card>
            <CardHeader title="Agenda bidang" action={<Link href={`${field.appHref}/kegiatan`} className="text-[11.5px] font-semibold text-primary-700">Semua</Link>} />
            <ul className="divide-y divide-line">
              {agenda.map((a) => (
                <li key={a.id} className="px-4 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[12.5px] font-medium text-ink">{a.name}</div>
                    <span className="shrink-0 text-[10.5px] font-semibold text-accent-700">{relativeID(a.date)}</span>
                  </div>
                  <div className="mt-0.5 text-[10.5px] text-muted2">{formatDateID(a.date, "short")} · {a.time} · {a.location}</div>
                </li>
              ))}
              {agenda.length === 0 && <li className="px-4 py-4 text-[12px] text-muted">Tidak ada agenda terjadwal.</li>}
            </ul>
          </Card>
          <Card>
            <CardHeader title="Tugas bidang" action={<Link href={`${field.appHref}/tugas`} className="text-[11.5px] font-semibold text-primary-700">Papan tugas</Link>} />
            <ul className="divide-y divide-line">
              {tasks.slice(0, 4).map((t) => (
                <li key={t.id} className="flex items-start gap-2.5 px-4 py-2.5">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${t.status === "terlambat" ? "bg-[var(--sb-danger)]" : t.priority === "tinggi" ? "bg-accent" : "bg-primary-400"}`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] font-medium leading-snug text-ink">{t.title}</div>
                    <div className="text-[10.5px] text-muted2">{t.assignee} · {relativeID(t.due)}</div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      {code === "usaha" && (
        <Card className="mt-4">
          <CardHeader title="Mitra & kemitraan" subtitle={`${PARTNERS.filter((p) => p.status === "aktif").length} aktif · ${PARTNERS.filter((p) => p.status === "penjajakan").length} penjajakan`} />
          <div className="sb-scroll">
            <table className="sb-table min-w-[600px]">
              <thead><tr><th>Mitra</th><th>Jenis</th><th>Sejak</th><th>Milestone</th><th>Status</th></tr></thead>
              <tbody>
                {PARTNERS.map((p) => (
                  <tr key={p.id}>
                    <td className="font-medium text-ink">{p.name}</td>
                    <td className="capitalize">{p.type}</td>
                    <td className="text-muted">{formatDateID(p.since, "short")}</td>
                    <td className="text-muted">{p.milestone}</td>
                    <td><StatusBadge status={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
