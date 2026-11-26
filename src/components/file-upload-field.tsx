"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CloudUpload, LoaderCircle, XCircle } from "lucide-react";

interface FileUploadFieldProps {
  name: string;
  label?: string;
  required?: boolean;
  scopeKind?: "self" | "field" | "organization";
  category?: string;
  accept?: string;
  refreshOnSuccess?: boolean;
}

export function FileUploadField({
  name,
  label = "Pilih berkas",
  required = false,
  scopeKind = "organization",
  category = "document",
  accept = ".pdf,.jpg,.jpeg,.png,.webp,.docx,.xlsx,.pptx,.mp4",
  refreshOnSuccess = false,
}: FileUploadFieldProps) {
  const router = useRouter();
  const [assetId, setAssetId] = useState("");
  const [state, setState] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleChange(file?: File) {
    setAssetId("");
    setMessage("");
    if (!file) { setState("idle"); return; }
    const form = new FormData();
    form.set("file", file);
    form.set("scope_kind", scopeKind);
    form.set("category", category);
    setState("uploading");
    try {
      const response = await fetch("/api/files", { method: "POST", body: form, cache: "no-store" });
      const payload = await response.json() as { id?: string; error?: string; message?: string };
      if (!response.ok || !payload.id) throw new Error(payload.error || "Unggahan gagal.");
      setAssetId(payload.id);
      setState("success");
      setMessage(payload.message || "Berkas berhasil diunggah.");
      if (refreshOnSuccess) router.refresh();
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Unggahan gagal.");
    }
  }

  return (
    <div className="space-y-1.5">
      <label className="block text-[11.5px] font-semibold text-ink2">{label}</label>
      <input
        type="file"
        accept={accept}
        required={required}
        disabled={state === "uploading"}
        onChange={(event) => void handleChange(event.target.files?.[0])}
        className="sb-input !h-auto py-2 text-[10.5px]"
      />
      <input type="hidden" name={name} value={assetId} />
      {state === "uploading" ? (
        <p className="flex items-center gap-1.5 text-[10px] text-muted"><LoaderCircle size={12} className="animate-spin" /> Mengunggah ke penyimpanan aman…</p>
      ) : null}
      {state === "success" ? (
        <p className="flex items-center gap-1.5 text-[10px] text-emerald-700"><CheckCircle2 size={12} /> {message}</p>
      ) : null}
      {state === "error" ? (
        <p className="flex items-center gap-1.5 text-[10px] text-rose-700"><XCircle size={12} /> {message}</p>
      ) : null}
      <p className="text-[10px] text-muted2">Maksimal 3 MiB · PDF, gambar, Office, atau MP4 · disimpan privat di Cloudinary.</p>
    </div>
  );
}
