import type { Metadata } from "next";
import { CalendarDays, GraduationCap, MapPin, Clock3, CheckCircle2 } from "lucide-react";
import { requireIdentity } from "@/lib/session";
import { loadMemberAreaData } from "@/lib/member-area";
import { MemberTrainingAction } from "@/components/member-training-action";
import { Badge, Card, CardHeader, Notice, PageHeader, StatCard } from "@/components/ui";
import { formatDateID, relativeID } from "@/lib/format";

export const metadata: Metadata = { title: "Agenda & Kehadiran" };

export default async function AgendaAnggotaPage() {
  const identity = await requireIdentity("member:self");
  const data = await loadMemberAreaData(identity);
  const memberActive =
    data.profile?.membershipStatus === "active" && !!data.profile.membershipId;
  const attendance = data.attendance;
  const attendanceTotal = attendance?.marked ?? 0;
  const attendanceRate =
    attendance && attendance.marked > 0
      ? Math.round((attendance.attended / attendance.marked) * 100)
      : null;

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Portal Anggota"
        title="Agenda & kehadiran"
        description="Jadwal kegiatan yang dibagikan kepada anggota, pendaftaran pelatihan, dan rekap presensi dari data organisasi."
      />

      {data.errors.length > 0 ? (
        <div className="mb-4 space-y-2">
          {data.errors.map((key) => (
            <Notice key={key} tone="danger" title={`Data ${key === "events" ? "agenda" : key === "trainings" ? "pelatihan" : key === "attendance" ? "presensi" : "profil"} belum dapat dimuat`}>
              Sumber data belum tersedia. Halaman tidak akan mengganti data yang gagal dibaca dengan catatan contoh.
              Coba muat ulang setelah layanan pulih.
            </Notice>
          ))}
        </div>
      ) : null}

      {!memberActive ? (
        <div className="mb-4">
          <Notice tone="warning" title="Keanggotaan belum aktif">
            Anda dapat melihat agenda yang dibagikan, tetapi pendaftaran pelatihan sebagai anggota memerlukan keanggotaan aktif dan terverifikasi.
          </Notice>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Agenda mendatang"
          value={data.errors.includes("events") ? "—" : data.events.length}
          note="Kegiatan dan rapat yang dibagikan"
          tone="info"
          icon={<CalendarDays size={16} />}
        />
        <StatCard
          label="Pelatihan tersedia"
          value={data.errors.includes("trainings") ? "—" : data.trainings.filter((item) => item.status === "registration_open").length}
          note="Sesi yang membuka pendaftaran"
          tone="accent"
          icon={<GraduationCap size={16} />}
        />
        <StatCard
          label="Kehadiran tercatat"
          value={data.errors.includes("attendance") ? "—" : attendanceTotal}
          note={attendanceRate === null ? "Belum ada presensi pelatihan" : `${attendanceRate}% hadir dari presensi yang ditandai`}
          tone="success"
          icon={<CheckCircle2 size={16} />}
        />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.25fr_1fr]">
        <Card>
          <CardHeader title="Kegiatan mendatang" subtitle="Kegiatan bidang terbuka dan rapat anggota yang dibagikan" />
          {data.events.length ? (
            <div className="divide-y divide-line">
              {data.events.map((event) => (
                <div key={`${event.kind}-${event.id}`} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <div className="text-[12.5px] font-semibold text-ink">{event.title}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[10.5px] text-muted2">
                      <span>{formatDateID(event.date)}</span>
                      {event.timeLabel ? <span className="inline-flex items-center gap-1"><Clock3 size={10} />{event.timeLabel} WIB</span> : null}
                      {event.location ? <span className="inline-flex items-center gap-1"><MapPin size={10} />{event.location}</span> : null}
                    </div>
                    <div className="mt-1 font-mono text-[9.5px] text-muted2">{event.referenceNo}</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge tone={event.kind === "rapat" ? "warning" : "info"}>{event.kind === "rapat" ? "Rapat anggota" : "Kegiatan"}</Badge>
                    <Badge tone="neutral">{relativeID(event.date)}</Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="px-4 py-8 text-center text-[12px] text-muted">
              {data.errors.includes("events") ? "Data agenda tidak dapat dibaca." : "Belum ada agenda mendatang yang dibagikan kepada anggota."}
            </p>
          )}
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Pelatihan mendatang" subtitle="Pendaftaran dan kuota diperiksa di server" />
            {data.trainings.length ? (
              <div className="divide-y divide-line">
                {data.trainings.map((training) => (
                  <div key={training.id} className="px-4 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[12.5px] font-semibold text-ink">{training.title}</div>
                        <div className="mt-0.5 text-[10.5px] text-muted2">
                          {formatDateID(training.date, "short")}
                          {training.startTime ? ` · ${training.startTime} WIB` : ""}
                          {training.location ? ` · ${training.location}` : ""}
                        </div>
                        {training.trainer ? <div className="mt-0.5 text-[10.5px] text-muted2">Narasumber: {training.trainer}</div> : null}
                      </div>
                      <Badge tone={training.status === "registration_open" ? "success" : "neutral"}>
                        {training.status === "registration_open" ? "Dibuka" : "Terjadwal"}
                      </Badge>
                    </div>
                    <div className="mt-2 text-[10.5px] text-muted2">
                      {training.registeredCount}{training.maxParticipants ? ` dari ${training.maxParticipants}` : ""} peserta tercatat
                    </div>
                    {training.status === "registration_open" ? (
                      <MemberTrainingAction
                        sessionId={training.id}
                        registrationStatus={training.registrationStatus}
                        canEnroll={memberActive}
                      />
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="px-4 py-8 text-center text-[12px] text-muted">
                {data.errors.includes("trainings") ? "Data pelatihan tidak dapat dibaca." : "Belum ada pelatihan mendatang yang tersedia."}
              </p>
            )}
          </Card>

          <Card>
            <CardHeader title="Rekap presensi pelatihan" subtitle="Berdasarkan catatan presensi yang sudah diinput" />
            <div className="grid grid-cols-2 gap-3 p-4">
              <div className="rounded-sb-sm bg-paper p-3">
                <div className="text-[10.5px] text-muted">Hadir</div>
                <div className="mt-1 font-display text-[21px] font-semibold text-[var(--sb-success)]">{attendance ? attendance.attended : data.errors.includes("attendance") ? "—" : "—"}</div>
              </div>
              <div className="rounded-sb-sm bg-paper p-3">
                <div className="text-[10.5px] text-muted">Izin</div>
                <div className="mt-1 font-display text-[21px] font-semibold text-ink">{attendance ? attendance.excused : data.errors.includes("attendance") ? "—" : "—"}</div>
              </div>
              <div className="rounded-sb-sm bg-paper p-3">
                <div className="text-[10.5px] text-muted">Sakit</div>
                <div className="mt-1 font-display text-[21px] font-semibold text-ink">{attendance ? attendance.sick : data.errors.includes("attendance") ? "—" : "—"}</div>
              </div>
              <div className="rounded-sb-sm bg-paper p-3">
                <div className="text-[10.5px] text-muted">Tanpa keterangan</div>
                <div className="mt-1 font-display text-[21px] font-semibold text-ink">{attendance ? attendance.absent : data.errors.includes("attendance") ? "—" : "—"}</div>
              </div>
            </div>
            {!data.profile?.membershipId ? (
              <p className="border-t border-line px-4 py-2.5 text-[10.5px] text-muted2">
                Rekap akan tersedia setelah akun terhubung dengan keanggotaan aktif.
              </p>
            ) : null}
          </Card>
        </div>
      </div>
    </div>
  );
}
