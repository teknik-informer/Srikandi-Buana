"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { updateOwnTaskStatus } from "@/app/actions/member-tasks";

export function MemberTaskAction({
  taskId,
  status,
}: {
  taskId: string;
  status: "belum" | "proses" | "selesai" | "dibatalkan";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const nextStatus = status === "belum" ? "proses" : status === "proses" ? "selesai" : null;

  function update() {
    if (!nextStatus || pending) return;
    setError(null);
    startTransition(async () => {
      const result = await updateOwnTaskStatus(taskId, nextStatus);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.refresh();
    });
  }

  if (!nextStatus) {
    return (
      <span className="inline-flex min-h-[30px] items-center gap-1.5 rounded-full border border-line bg-paper px-2.5 text-[10.5px] font-semibold text-muted2">
        {status === "selesai" ? <CheckCircle2 size={12} /> : <Circle size={12} />}
        {status === "selesai" ? "Selesai" : "Dibatalkan"}
      </span>
    );
  }

  return (
    <div className="text-right">
      <button
        type="button"
        onClick={update}
        disabled={pending}
        className="sb-btn sb-btn-outline min-h-[30px] !px-2.5 !py-1 !text-[10.5px]"
      >
        {pending ? <Loader2 size={12} className="animate-spin" /> : nextStatus === "proses" ? <Circle size={12} /> : <CheckCircle2 size={12} />}
        {pending ? "Menyimpan…" : nextStatus === "proses" ? "Mulai tugas" : "Tandai selesai"}
      </button>
      {error ? <p className="mt-1 max-w-[190px] text-[10px] text-[var(--sb-danger)]" role="alert">{error}</p> : null}
    </div>
  );
}
