"use client";

import Link from "next/link";
import { CalendarDays, ClipboardList, GraduationCap, MapPin, UserRound, Wallet, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Badge, Card, CardHeader, Notice, StatCard } from "@/components/ui";
import { formatDateID, relativeID } from "@/lib/format";
import { FIELDS_BY_SLUG } from "@/config/fields";
import type { MemberAreaData } from "@/lib/member-area";
import { MemberTrainingAction } from "@/components/member-training-action";

const MEMBERSHIP_LABEL: Record<string, string> = {
  active: "Aktif",
  pending: "Menunggu verifikasi",
  inactive: "Nonaktif",
  left: "Tidak lagi menjadi anggota",
  archived: "Arsip",
};

const TASK_LABEL: Record<string, string> = {
  belum: "Belum dimulai",
  proses: "Sedang dikerjakan",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
};

export function AnggotaHomeClient({
  data,
  role,
}: {
  data: MemberAreaData;
  role: string;
}) {
  const profile = data.profile;
  const memberActive = profile?.membershipStatus === "active" && !!profile.membershipId;
  const openTasks = data.tasks.filter((task) => !["selesai", "dibatalkan"].includes(task.status));
  const overdueTasks = data.tasks.filter((task) => task.isOverdue);
  const trainingOpen = data.trainings.filter((training) => training.status === "registration_open");
  const firstName = (profile?.preferredName || profile?.legalName || "Anggota").split(" ")[0];

  return (
    <div className="pb-10">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
        <div>
          <div className="sb-label mb-1.5">Portal Anggota · Data Organisasi</div>
          <h1 className="font-display text-[25px] font-semibold leading-tight tracking-tight text-ink sm:text-[29px]">
            Halo, {firstName}.
          </h1>
          <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-muted">
            Ringkasan keanggotaan, agenda, pelatihan, dan penugasan yang terhubung langsung dengan akun Anda.
          </p>
        </div>
        <Link href="/app/anggota/profil" className="sb-btn sb-btn-primary min-h-[36px] !px-3 !text-[11.5px]">
          <UserRound size={14} /> Profil saya
        </Link>
      </header>

      {data.errors.length > 0 ? (
        <div className="mb-4 space-y-2">
          {data.errors.map((key) => (
            <Notice key={key} tone="danger" title={`Data ${key === "profile" ? "profil" : key === "events" ? "agenda" : key === "tasks" ? "penugasan" : "pelatihan"} belum dapat dimuat`}>
              Layanan data organisasi belum dapat membaca bagian ini. Nilai di bawah tidak akan diganti dengan data contoh.
              Silakan muat ulang halaman setelah koneksi pulih.
            </Notice>
          ))}
        </div>
      ) : null}

      {!profile ? (
        <Notice tone="warning" title="Akun belum terhubung ke data anggota">
          Akun Anda belum memiliki data orang pada buku induk organisasi. Hubungi Sekretariat untuk pencocokan identitas.
        </Notice>
      ) : !memberActive ? (
        <div className="mb-4">
          <Notice tone="warning" title="Status keanggotaan belum aktif">
            Data akun telah ditemukan, tetapi status keanggotaan belum aktif atau belum diverifikasi. Pendaftaran pelatihan sebagai anggota memerlukan keanggotaan aktif.
          </Notice>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Status keanggotaan"
          value={data.errors.includes("profile") ? "—" : MEMBERSHIP_LABEL[profile?.membershipStatus ?? ""] ?? "Belum tercatat"}
          note={profile?.memberNumber ?? "Nomor anggota belum diterbitkan"}
          tone={memberActive ? "success" : "warning"}
          icon={<UserRound size={16} />}
          href="/app/anggota/profil"
        />
        <StatCard
          label="Agenda mendatang"
          value={data.errors.includes("events") ? "—" : data.events.length}
          note="Kegiatan yang dibagikan kepada anggota"
          tone="info"
          icon={<CalendarDays size={16} />}
          href="/app/anggota/agenda"
        />
        <StatCard
          label="Pelatihan dibuka"
          value={data.errors.includes("trainings") ? "—" : trainingOpen.length}
          note="Pendaftaran melalui akun anggota"
          tone="accent"
          icon={<GraduationCap size={16} />}
          href="/app/anggota/agenda"
        />
        <StatCard
          label="Penugasan saya"
          value={data.errors.includes("tasks") ? "—" : openTasks.length}
          note={data.errors.includes("tasks") ? "Sumber tugas belum tersedia" : `${overdueTasks.length} melewati tenggat`}
          tone={overdueTasks.length ? "warning" : "success"}
          icon={<ClipboardList size={16} />}
          href="/app/anggota/tugas"
        />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.25fr_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Agenda terdekat"
              subtitle="Kegiatan dan rapat yang memang dibagikan kepada anggota"
              action={<Link href="/app/anggota/agenda" className="text-[11.5px] font-semibold text-primary-700">Semua agenda</Link>}
            />
            {data.events.length ? (
              <div className="divide-y divide-line">
                {data.events.slice(0, 4).map((event) => (
                  <div key={`${event.kind}-${event.id}`} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <div className="text-[12.5px] font-semibold text-ink">{event.title}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[10.5px] text-muted2">
                        <span>{formatDateID(event.date, "short")}</span>
                        {event.timeLabel ? <span>{event.timeLabel} WIB</span> : null}
                        {event.location ? <span className="inline-flex items-center gap-1"><MapPin size={10} />{event.location}</span> : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge tone={event.kind === "rapat" ? "warning" : "info"}>{event.kind === "rapat" ? "Rapat anggota" : "Kegiatan"}</Badge>
                      <Badge tone="neutral">{relativeID(event.date)}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-7 text-center text-[12px] text-muted">
                {data.errors.includes("events") ? "Agenda belum dapat dibaca." : "Belum ada agenda mendatang yang dibagikan kepada anggota."}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Pelatihan & pengembangan"
              subtitle="Jadwal pelatihan dari Bidang Pemberdayaan & Pelatihan"
              action={<Link href="/app/anggota/agenda" className="text-[11.5px] font-semibold text-primary-700">Lihat agenda</Link>}
            />
            {data.trainings.length ? (
              <div className="divide-y divide-line">
                {data.trainings.slice(0, 4).map((training) => (
                  <div key={training.id} className="px-4 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[12.5px] font-semibold text-ink">{training.title}</div>
                        {training.topic ? <div className="mt-0.5 text-[10.5px] text-muted">{training.topic}</div> : null}
                        <div className="mt-1 text-[10.5px] text-muted2">
                          {formatDateID(training.date, "short")}
                          {training.startTime ? ` · ${training.startTime} WIB` : ""}
                          {training.location ? ` · ${training.location}` : ""}
                        </div>
                      </div>
                      <Badge tone={training.status === "registration_open" ? "success" : "neutral"}>
                        {training.status === "registration_open" ? "Pendaftaran dibuka" : "Terjadwal"}
                      </Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[10.5px] text-muted2">
                        {training.registeredCount}{training.maxParticipants ? `/${training.maxParticipants}` : ""} peserta tercatat
                        {training.trainer ? ` · ${training.trainer}` : ""}
                      </span>
                      {training.status === "registration_open" ? (
                        <MemberTrainingAction
                          sessionId={training.id}
                          registrationStatus={training.registrationStatus}
                          canEnroll={memberActive}
                        />
                      ) : (
                        <span className="text-[10.5px] text-muted2">
                          {training.registrationStatus ? "Pendaftaran Anda sudah tercatat" : "Belum membuka pendaftaran"}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-7 text-center text-[12px] text-muted">
                {data.errors.includes("trainings") ? "Data pelatihan belum dapat dibaca." : "Belum ada pelatihan mendatang yang tersedia."}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Identitas anggota" subtitle="Terhubung ke buku induk organisasi" />
            {profile ? (
              <div className="p-4">
                <div className="rounded-sb border border-primary-200 bg-primary-50 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display text-[13px] font-semibold text-primary-900">KWT Srikandi Buana</span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary-700">Anggota</span>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <span className="grid h-12 w-12 place-items-center rounded-full bg-primary-200 font-display text-[16px] font-bold text-primary-900">
                      {(profile.preferredName || profile.legalName).split(" ").map((word) => word[0]).slice(0, 2).join("")}
                    </span>
                    <div className="min-w-0">
                      <div className="text-[13.5px] font-semibold text-ink">{profile.preferredName || profile.legalName}</div>
                      <div className="text-[11px] text-primary-800">{profile.memberNumber ?? "Nomor anggota belum diterbitkan"} · {role}</div>
                      <div className="text-[10.5px] text-primary-800">{profile.village || "Desa belum tercatat"} · Kedu, Temanggung</div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-primary-200 pt-2 text-[10.5px] text-primary-700">
                    <span>{profile.joinedOn ? `Bergabung ${formatDateID(profile.joinedOn, "short")}` : "Tanggal bergabung belum tercatat"}</span>
                    <Badge tone={memberActive ? "success" : "warning"}>{MEMBERSHIP_LABEL[profile.membershipStatus ?? ""] ?? "Belum tercatat"}</Badge>
                  </div>
                </div>
                <Link href="/app/anggota/profil" className="mt-3 inline-block text-[11.5px] font-semibold text-primary-700 hover:underline">Perbarui profil →</Link>
              </div>
            ) : (
              <div className="px-4 py-6 text-[12px] text-muted">Identitas belum dapat ditampilkan.</div>
            )}
          </Card>

          <Card>
            <CardHeader title="Penugasan saya" subtitle="Hanya tugas yang dialokasikan langsung ke akun Anda" action={<Link href="/app/anggota/tugas" className="text-[11.5px] font-semibold text-primary-700">Semua tugas</Link>} />
            {data.tasks.length ? (
              <div className="divide-y divide-line">
                {data.tasks.slice(0, 4).map((task) => (
                  <div key={task.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 text-[12px] font-semibold text-ink">{task.title}</div>
                      <Badge tone={task.isOverdue ? "danger" : task.status === "selesai" ? "success" : task.status === "proses" ? "info" : "neutral"}>
                        {task.isOverdue ? "Terlambat" : TASK_LABEL[task.status]}
                      </Badge>
                    </div>
                    <div className="mt-1 text-[10.5px] text-muted2">
                      {FIELDS_BY_SLUG[task.fieldKey]?.shortName ?? task.fieldKey}
                      {task.dueDate ? ` · Tenggat ${formatDateID(task.dueDate, "short")}` : ""}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-6 text-[12px] text-muted">
                {data.errors.includes("tasks") ? "Daftar tugas belum dapat dibaca." : "Belum ada penugasan yang dialokasikan langsung ke akun Anda."}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Kontribusi organisasi" subtitle="Catatan pribadi, bila sudah ditautkan" />
            <div className="px-4 py-3">
              <p className="text-[11.5px] leading-5 text-muted">
                Kebijakan iuran wajib belum ditetapkan. Riwayat kontribusi individu belum terhubung ke buku besar melalui identitas anggota, sehingga sistem tidak menampilkan angka perkiraan atau catatan dari data contoh.
              </p>
              <Link href="/app/anggota/kontribusi" className="mt-2 inline-block text-[11.5px] font-semibold text-primary-700 hover:underline">Lihat status kontribusi →</Link>
            </div>
          </Card>

          {data.errors.includes("profile") ? (
            <Notice tone="warning" title="Sumber profil bermasalah">
              Data profil tidak tersedia saat ini. Jangan mengubah identitas berdasarkan data sementara.
            </Notice>
          ) : null}
        </div>
      </div>
    </div>
  );
}
