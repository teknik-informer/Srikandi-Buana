import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getIdentity } from "@/lib/session";
import { APPS } from "@/config/apps";
import { FIELDS } from "@/config/fields";
import { PROGRAMS, TASKS, ACTIVITIES } from "@/data/operations";
import { APPROVALS } from "@/data/organization";
import { AppIcon, FieldMark } from "@/components/brand";
import { AppBanner } from "@/components/dash-kit";
import { APP_IDENTITY } from "@/config/app-identity";
import { Badge, Card, CardHeader, PageHeader, StatCard, StatusBadge } from "@/components/ui";
import { formatDateID, relativeID } from "@/lib/format";

export const metadata: Metadata = { title: "Beranda Aplikasi" };

export default async function AppHome() {
  const identity = await getIdentity();
  if (!identity) redirect("/masuk");

  const myTasks = TASKS.filter((t) => t.status !== "selesai").slice(0, 5);
  const pending = APPROVALS.filter((a) => a.status === "menunggu");
  const upcoming = ACTIVITIES.filter((a) => a.status === "terjadwal").slice(0, 4);
  const mine = identity.field ? PROGRAMS.filter((p) => p.bidang === identity.field) : PROGRAMS;

  return (
    <div className="pb-10">
      {/* The launcher is an application too, so it opens with the same banner
          system: its own photograph, its own name, facts from live data. */}
      <AppBanner
        {...APP_IDENTITY.launcher}
        heading="h2"
        badge={
          <span className="rounded-full bg-[#e6c56a]/18 px-2.5 py-1 text-[10px] font-bold text-[#f2dda2] ring-1 ring-inset ring-[#e6c56a]/30">
            {`Masuk sebagai ${identity.name.split(" ")[0]} · ${identity.scope}`}
          </span>
        }
        facts={[
          `${myTasks.length} tugas terbuka`,
          `${pending.length} persetujuan menunggu`,
          `${upcoming.length} agenda terjadwal`,
          `${mine.length} program dalam cakupan`,
        ]}
        actions={[
          { href: "/app/cepat", label: "Buat cepat", primary: true },
          { href: "/studio", label: "Studio Pengelola" },
        ]}
      />
      <div className="mt-5">
        <PageHeader
          eyebrow={`Selamat datang, ${identity.name.split(" ")[0]}`}
          title="Apa yang perlu Anda kerjakan hari ini?"
          description={`Konteks aktif: ${identity.scope}. ${identity.note}`}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tugas terbuka" value={TASKS.filter((t) => t.status !== "selesai").length} note={`${TASKS.filter((t) => t.status === "terlambat").length} terlambat`} tone="warning" href="/app/anggota/tugas" />
        <StatCard label="Persetujuan menunggu" value={pending.length} note="Termasuk 1 anggaran bidang" tone="accent" href="/app/pengurus/persetujuan" />
        <StatCard label="Program berjalan" value={mine.filter((p) => p.status === "berjalan").length} note="Capaian indikator rata-rata 70%" tone="success" />
        <StatCard label="Notifikasi baru" value={4} note="Rekonsiliasi bank perlu perhatian" tone="info" href="/app/notifikasi" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Pilih aplikasi"
              subtitle="Satu platform, banyak pengalaman; akses mengikuti kewenangan"
              action={<Link href="/app/bidang" className="text-[12px] font-semibold text-primary-700">Peta bidang →</Link>}
            />
            <div className="grid gap-2 p-3 sm:grid-cols-2">
              {APPS.filter((a) => a.group !== "bidang" && a.key !== "launcher").map((a) => (
                <Link key={a.key} href={a.href} className="group flex items-start gap-3 rounded-sb-sm border border-line bg-white p-3 transition hover:border-primary-300 hover:bg-primary-50/40">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-primary-100 text-primary-800">
                    <AppIcon name={a.icon} size={16} />
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 text-[13px] font-semibold text-ink group-hover:text-primary-800">
                      {a.name}
                      {a.badge ? <Badge tone="accent">{a.badge}</Badge> : null}
                    </span>
                    <span className="mt-0.5 block text-[11.5px] leading-snug text-muted">{a.description}</span>
                  </span>
                </Link>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Empat bidang resmi" subtitle="Konfigurasi aplikasi dipisahkan dari status pengesahan organisasi" />
            <div className="grid gap-2 p-3 sm:grid-cols-2">
              {FIELDS.map((f) => (
                <Link key={f.fieldId} href={f.appHref} className="flex items-start gap-3 rounded-sb-sm border border-line bg-white p-3 transition hover:border-primary-300">
                  <FieldMark icon={f.icon} accent={f.accent} />
                  <span className="min-w-0">
                    <span className="block text-[12.5px] font-semibold text-ink">{f.shortName}</span>
                    <span className="mt-0.5 block text-[11px] text-muted">{f.modules.length} modul · data tim belum tercatat</span>
                    <span className="mt-1 inline-block"><StatusBadge status={f.appStatus} /></span>
                  </span>
                </Link>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Tugas saya" subtitle="Dari Workflow Builder & penugasan bidang" />
            <ul className="divide-y divide-line">
              {myTasks.map((t) => (
                <li key={t.id} className="flex items-start gap-2.5 px-4 py-2.5">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${t.status === "terlambat" ? "bg-[var(--sb-danger)]" : t.priority === "tinggi" ? "bg-accent" : "bg-primary-400"}`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] font-medium leading-snug text-ink">{t.title}</div>
                    <div className="mt-0.5 text-[10.5px] text-muted2">{t.assignee} · {relativeID(t.due)}</div>
                  </div>
                  <StatusBadge status={t.status === "terlambat" ? "Terlambat" : t.status === "proses" ? "Proses" : "Belum"} />
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader title="Agenda terdekat" action={<Link href="/app/sekretariat/agenda" className="text-[11.5px] font-semibold text-primary-700">Kalender</Link>} />
            <ul className="divide-y divide-line">
              {upcoming.map((a) => (
                <li key={a.id} className="px-4 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[12.5px] font-medium text-ink">{a.name}</div>
                    <span className="shrink-0 text-[10.5px] font-semibold text-accent-700">{relativeID(a.date)}</span>
                  </div>
                  <div className="mt-0.5 text-[10.5px] text-muted2">{formatDateID(a.date, "short")} · {a.time} · {a.location}</div>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2">
              <Badge tone="warning">Perlu keputusan</Badge>
              <span className="text-[11px] text-muted">{pending.length} pengajuan</span>
            </div>
            <ul className="mt-2.5 space-y-2">
              {pending.map((p) => (
                <li key={p.id} className="rounded-sb-sm border border-line bg-paper px-3 py-2">
                  <div className="text-[12px] font-semibold text-ink">{p.title}</div>
                  <div className="mt-0.5 text-[10.5px] text-muted">{p.bidang} · tahap: {p.currentStep}</div>
                </li>
              ))}
            </ul>
            <Link href="/app/pengurus/persetujuan" className="mt-3 inline-block text-[12px] font-semibold text-primary-700">Buka kotak persetujuan →</Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
