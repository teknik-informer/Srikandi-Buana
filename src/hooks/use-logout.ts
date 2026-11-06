"use client";
import { useRef, useState } from "react";
import { canDiscardChanges } from "@/lib/unsaved-changes";
import { requestJSON } from "@/lib/request-json";
export function useLogout() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const pending = useRef(false);
  async function logout() {
    if (pending.current || !canDiscardChanges()) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const { response, data } = await requestJSON<{ error?: string }>(
        "/api/auth/logout",
        { method: "POST", headers: { Accept: "application/json" } },
        25000,
        "Koneksi terlalu lama. Status sesi belum dapat dipastikan. Coba keluar kembali atau muat ulang halaman.",
      );
      if (!response.ok) throw Error(data?.error || "Sesi belum dapat diakhiri. Coba lagi.");
      document
        .querySelectorAll<HTMLFormElement>("form[data-protect-unsaved]")
        .forEach((form) => delete form.dataset.unsaved);
      window.location.replace("/masuk?logged_out=1");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Koneksi terputus. Coba keluar kembali.");
      pending.current = false;
      setBusy(false);
    }
  }
  return { busy, error, logout };
}
