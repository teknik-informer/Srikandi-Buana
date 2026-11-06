"use client";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { requestJSON } from "@/lib/request-json";

export function useRecordMutation(reload: () => Promise<void>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  async function mutate(method: "POST" | "PUT" | "DELETE", body?: unknown, url = "/api/records") {
    if (pending.current) return false;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const { response, data: result } = await requestJSON<{ error?: string }>(url, {
        method,
        ...(method === "DELETE" ? {} : {
          headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
        }),
      });
      if (!response.ok) {
        if (response.status === 401) await reload();
        throw Error(response.status === 401
          ? "Sesi masuk telah berakhir. Salin perubahan yang diperlukan, lalu masuk kembali."
          : result?.error || "Perubahan belum tersimpan. Periksa koneksi dan coba lagi.");
      }
      toast.success(method === "DELETE" ? "Catatan dihapus." : "Perubahan disimpan.");
      await reload();
      return true;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Perubahan belum tersimpan. Coba lagi.";
      setError(message);
      toast.error(message);
      return false;
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return { busy, error, clearError: () => setError(""), mutate };
}
