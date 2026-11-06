"use client";
import { useEffect, useRef, useState } from "react";
import { Upload, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { requestJSON } from "@/lib/request-json";
import { markFormDirty } from "@/lib/unsaved-changes";
export type ImageFile = { id: string; name: string; mime: string; deleted_at?: string | null };
export default function ImagePicker({ id, name, files, defaultValue = "", value, onChange, onBusyChange, required = false, disabled = false }: {
  id: string; name?: string; files: ImageFile[]; defaultValue?: string; value?: string;
  onChange?: (id: string) => void; onBusyChange?: (busy: boolean) => void; required?: boolean; disabled?: boolean;
}) {
  const [selected, setSelected] = useState(defaultValue), [added, setAdded] = useState<ImageFile[]>([]);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [failedPreview, setFailedPreview] = useState("");
  const pending = useRef(false), request = useRef<AbortController | null>(null);
  const picker = useRef<HTMLInputElement>(null), control = useRef<HTMLSelectElement>(null);
  const busyCallback = useRef(onBusyChange); busyCallback.current = onBusyChange;
  const active = value ?? selected;
  const choices = [...new Map([...files, ...added].filter(f => !f.deleted_at && ["image/png", "image/jpeg"].includes(f.mime)).map(f => [f.id, f])).values()];
  useEffect(() => () => { request.current?.abort(); busyCallback.current?.(false); }, []);
  function choose(next: string) {
    setSelected(next); onChange?.(next); setFailedPreview(""); setError("");
    markFormDirty(control.current?.form ?? null);
  }
  async function upload(file?: File) {
    if (!file || pending.current || disabled) return;
    setError("");
    if (!/\.(jpe?g|png)$/i.test(file.name) || !["image/jpeg", "image/png", ""].includes(file.type)) { setError("Pilih foto JPG atau PNG. Ekspor HEIC ke JPG terlebih dahulu."); return; }
    if (!file.size || file.size > 3 * 1024 * 1024) { setError("Ukuran foto harus 1 byte hingga 3 MB. Kecilkan foto lalu pilih kembali."); return; }
    pending.current = true; markFormDirty(control.current?.form ?? null); setBusy(true); onBusyChange?.(true);
    const controller = new AbortController(); request.current = controller;
    try {
      const body = new FormData(); body.append("file", file);
      const { response, data } = await requestJSON<{ id?: string; error?: string }>("/api/files", { method: "POST", body, signal: controller.signal }, 90000);
      if (controller.signal.aborted) return;
      if (!response.ok || !data?.id) throw Error(data?.error || "Foto belum terkonfirmasi tersimpan. Periksa arsip sebelum mengunggah ulang.");
      const mime = /\.png$/i.test(file.name) ? "image/png" : "image/jpeg";
      setAdded(current => [...current, { id: data.id!, name: file.name, mime }]);
      choose(data.id);
    } catch (e) {
      if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Unggah belum berhasil. Coba lagi.");
    } finally {
      pending.current = false;
      if (!controller.signal.aborted) { setBusy(false); onBusyChange?.(false); if (picker.current) picker.current.value = ""; }
    }
  }
  return <div className="space-y-3" aria-busy={busy}>
    <NativeSelect className="w-full" ref={control} id={id} name={name} value={active} required={required} disabled={disabled || busy} aria-describedby={id + "-help"} onChange={e => choose(e.target.value)}>
      <NativeSelectOption value="">{required ? "Pilih foto atau unggah foto baru" : "Gunakan bawaan / tanpa foto"}</NativeSelectOption>
      {active && !choices.some(f => f.id === active) && <NativeSelectOption value={active}>Foto terpilih belum ada pada daftar arsip</NativeSelectOption>}
      {choices.map(f => <NativeSelectOption key={f.id} value={f.id}>{f.name}</NativeSelectOption>)}
    </NativeSelect>
    <div className="flex flex-wrap items-center gap-3">
      <Button type="button" variant="outline" disabled={disabled || busy} onClick={() => picker.current?.click()}><Upload className="size-4" />{busy ? "Mengunggah foto…" : "Unggah foto baru"}</Button>
      <Input ref={picker} type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png" className="sr-only" aria-label={"Unggah foto: " + id} disabled={disabled || busy} data-unsaved-ignore onChange={e => { void upload(e.target.files?.[0]); }} />
      {active && <Button type="button" variant="ghost" disabled={disabled || busy} onClick={() => choose("")}>Lepaskan foto</Button>}
    </div>
    <p id={id + "-help"} className="text-xs leading-relaxed text-muted-foreground">JPG/PNG, maksimal 3 MB dan 40 megapiksel. Foto disimpan ke arsip pribadi dahulu; baru tampil publik setelah konten atau pengaturan disimpan. Melepas foto tidak menghapus arsip.</p>
    {busy && <p role="status" className="text-sm text-muted-foreground">Tunggu unggahan selesai sebelum menyimpan formulir.</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {active && (failedPreview === active ? <p className="flex items-center gap-2 text-sm text-muted-foreground"><ImageIcon className="size-4" />Pratinjau belum tersedia. Periksa foto di arsip sebelum menerbitkan.</p> : <img src={"/api/files?id=" + encodeURIComponent(active) + "&preview=1"} alt="Pratinjau foto yang dipilih" className="max-h-52 w-full rounded-lg border bg-muted/30 object-contain" onError={() => setFailedPreview(active)} />)}
  </div>;
}
