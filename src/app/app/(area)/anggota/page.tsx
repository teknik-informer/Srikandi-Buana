import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getIdentity } from "@/lib/session";
import { MEMBERS } from "@/data/organization";
import { ACTIVITIES, TRAININGS, TASKS } from "@/data/operations";
import { formatDateID, relativeID, formatIDR } from "@/lib/format";
import { Badge, Card, CardHeader, PageHeader, StatCard, StatusBadge, Progress } from "@/components/ui";

export const metadata: Metadata = { title: "Beranda Anggota" };

export default async function AnggotaHome() {
  const identity = await getIdentity();
  if (!identity) redirect("/masuk");
  const me = MEMBERS.find((m) => m.id === identity.memberId);
  const agenda = ACTIVITIES.filter((a) => a.status === "terjadwal").slice(0, 4);
  const myTasks = TASKS.slice(0, 4);
  const trainings = TRAININGS.filter((t) => t.status !== "selesai").slice(0, 3);

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Portal Anggota"
        title={`Halo, ${identity.name.split(" ")[0]}.`}
        description="Profil, agenda, penugasan, dan kontribusi Anda dalam satu tempat. Data pribadi Anda dapat diubah sendiri; data resmi keanggotaan tidak."
        actions={<Link href="/app/anggota/profil" className="sb-btn sb-btn-primary">Profil saya</Link>}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Status keanggotaan" value={me?.status === "aktif" ? "Aktif" : me?.status ?? "—"} note={`Sejak ${me ? formatDateID(me.joined) : "—"}`} tone="success" />
        <StatCard label="Kegiatan terjadwal" value={agenda.length} note="Lintas bidang" tone="info" href="/app/anggota/agenda" />
        <StatCard label="Pelatihan dibuka" value={trainings.filter((t) => t.status === "dibuka").length} note="Pendaftaran via portal" tone="accent" href="/app/anggota/agenda" />
        <StatCard label="Penugasan saya" value={myTasks.filter((t) => t.status !== "selesai").length} note={`${myTasks.filter((t) => t.status === "terlambat").length} terlambat`} tone="warning" href="/app/anggota/tugas" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader title="Agenda terdekat" subtitle="Kegiatan terbuka dan internal yang relevan untuk Anda" action={<Link href="/app/anggota/agenda" className="text-[11.5px] font-semibold text-primary-700">Semua agenda</Link>} />
            <div className="divide-y divide-line">
              {agenda.map((a) => (
                <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                  <div>
                    <div className="text-[12.5px] font-semibold text-ink">{a.name}</div>
                    <div className="mt-0.5 text-[10.5px] text-muted2">{formatDateID(a.date)} · {a.time} · {a.location}</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {a.openToPublic && <Badge tone="info">Publik</Badge>}
                    <Badge tone="neutral">{relativeID(a.date)}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Pelatihan yang dibuka" subtitle="Kursi terbatas; pendaftaran tercatat pada bidang" />
            <div className="grid gap-2 p-3 sm:grid-cols-2">
              {trainings.map((t) => (
                <div key={t.id} className="rounded-sb-sm border border-line bg-white p-3">
                  <div className="text-[12.5px] font-semibold text-ink">{t.title}</div>
                  <div className="mt-0.5 text-[10.5px] text-muted2">{formatDateID(t.date, "short")} · {t.location}</div>
                  <div className="mt-2"><Progress value={Math.round((t.registered / t.seats) * 100)} /></div>
                  <button type="button" className="sb-btn sb-btn-outline mt-2 w-full !py-1.5 text-[11.5px]" disabled title="Pendaftaran pelatihan memerlukan basis data peserta — belum aktif pada demo.">Daftar (demo)</button>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Kartu anggota" subtitle="Identitas resmi dari buku induk" />
            <div className="p-4">
              <div className="rounded-sb border border-primary-200 bg-primary-50 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-display text-[13px] font-semibold text-primary-900">KWT Srikandi Buana</span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary-700">Anggota</span>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-200 font-display text-[16px] font-bold text-primary-900">
                    {identity.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                  </span>
                  <div>
                    <div className="text-[13.5px] font-semibold text-primary-950">{identity.name}</div>
                    <div className="text-[11px] text-primary-800">{me?.id} · {identity.role}</div>
                    <div className="text-[10.5px] text-primary-700/80">{me?.village}, Kedu, Temanggung</div>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-primary-200 pt-2 text-[10.5px] text-primary-700">
                  <span>Bergabung {me ? formatDateID(me.joined) : "—"}</span>
                  <StatusBadge status="Aktif" />
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Kontribusi saya" subtitle="Sukarela — besaran iuran belum ditetapkan" />
            <div className="px-4 py-3">
              <div className="flex items-baseline justify-between">
                <span className="text-[11.5px] text-muted">Kontribusi tercatat tahun ini</span>
                <span className="font-display text-[18px] font-semibold text-primary-800">{formatIDR(120_000)}</span>
              </div>
              <p className="mt-1 text-[10.5px] text-muted2">
                Kebijakan iuran/kontribusi wajib belum ditetapkan organisasi (§28). Nilai di atas adalah
                catatan sukarela pada data demo.
              </p>
              <Link href="/app/anggota/kontribusi" className="mt-2 inline-block text-[11.5px] font-semibold text-primary-700">Riwayat kontribusi →</Link>
            </div>
          </Card>

          <Card>
            <CardHeader title="Dari komunitas" subtitle="Diskusi anggota" action={<Link href="/app/anggota/komunitas" className="text-[11.5px] font-semibold text-primary-700">Buka</Link>} />
            <ul className="divide-y divide-line text-[12px]">
              <li className="px-4 py-2.5"><div className="font-medium text-ink">Tips penyimpanan kopi setelah panen</div><div className="text-[10.5px] text-muted2">Bidang Pertanian · 2 hari lalu · 8 balasan</div></li>
              <li className="px-4 py-2.5"><div className="font-medium text-ink">Jadwal giliran rumah jemur</div><div className="text-[10.5px] text-muted2">Kelompok Kopi · 4 hari lalu · 5 balasan</div></li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
