"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock3, Loader2, UserPlus } from "lucide-react";
import { enrollOwnTrainingSession } from "@/app/actions/member-training";

export function MemberTrainingAction({
  sessionId,
  registrationStatus,
  canEnroll,
}: {
  sessionId: string;
  registrationStatus: "registered" | "confirmed" | "waitlisted" | "cancelled" | null;
  canEnroll: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [kind, setKind] = useState<"success" | "warning" | "error">("success");

  const alreadyRegistered =
    registrationStatus === "registered" ||
    registrationStatus === "confirmed" ||
    registrationStatus === "waitlisted";

  function enroll() {
    if (pending || !canEnroll || alreadyRegistered || registrationStatus === "cancelled") return;
    setMessage(null);
    startTransition(async () => {
      const result = await enrollOwnTrainingSession(sessionId);
      setMessage(result.message);
      setKind(result.ok ? (result.status === "waitlisted" ? "warning" : "success") : "error");
      if (result.ok) router.refresh();
    });
  }

  return (
    <div className="mt-3">
      {alreadyRegistered ? (
        <div className="inline-flex min-h-[32px] items-center gap-1.5 rounded-full border border-line bg-paper px-2.5 text-[11px] font-semibold text-ink2">
          {registrationStatus === "waitlisted" ? <Clock3 size={13} /> : <CheckCircle2 size={13} />}
          {registrationStatus === "waitlisted" ? "Daftar tunggu" : registrationStatus === "confirmed" ? "Terkonfirmasi" : "Terdaftar"}
        </div>
      ) : registrationStatus === "cancelled" ? (
        <span className="text-[11px] text-muted2">Pendaftaran dibatalkan; hubungi Bidang Pelatihan untuk mendaftar kembali.</span>
      ) : (
        <button
          type="button"
          onClick={enroll}
          disabled={!canEnroll || pending}
          className="sb-btn sb-btn-primary min-h-[34px] !px-3 !text-[11.5px]"
        >
          {pending ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />}
          {pending ? "Menyimpan…" : canEnroll ? "Daftar pelatihan" : "Keanggotaan aktif diperlukan"}
        </button>
      )}
      {message ? (
        <p
          role={kind === "error" ? "alert" : "status"}
          className={`mt-2 text-[11px] ${kind === "error" ? "text-[var(--sb-danger)]" : kind === "warning" ? "text-[var(--sb-warning)]" : "text-[var(--sb-success)]"}`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
