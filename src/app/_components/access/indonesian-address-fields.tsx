"use client";

import { useEffect, useState } from "react";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import type { ProfileAddress } from "@/lib/account-profile-data";

type Region = { code: string; name: string };
type Props = { value: ProfileAddress; onChange: (value: ProfileAddress) => void; disabled?: boolean };

async function loadRegions(level: string, parent = "", signal?: AbortSignal): Promise<Region[]> {
  const params = new URLSearchParams({ level });
  if (parent) params.set("parent", parent);
  const response = await fetch("/api/regions?" + params.toString(), { cache: "force-cache", signal });
  const payload = await response.json() as { data?: Region[]; error?: string };
  if (!response.ok || !Array.isArray(payload.data)) throw new Error(payload.error || "Daftar wilayah belum dapat dimuat.");
  return payload.data;
}

export default function IndonesianAddressFields({ value, onChange, disabled = false }: Props) {
  const [provinces, setProvinces] = useState<Region[]>([]);
  const [regencies, setRegencies] = useState<Region[]>([]);
  const [districts, setDistricts] = useState<Region[]>([]);
  const [villages, setVillages] = useState<Region[]>([]);
  const [loading, setLoading] = useState({ provinces: true, regencies: false, districts: false, villages: false });
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    loadRegions("provinces", "", controller.signal)
      .then(data => { if (!controller.signal.aborted) { setProvinces(data); setError(""); } })
      .catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Daftar provinsi belum tersedia."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(current => ({ ...current, provinces: false })); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!value.provinceCode) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      if (!controller.signal.aborted) setLoading(current => ({ ...current, regencies: true }));
    }, 0);
    loadRegions("regencies", value.provinceCode, controller.signal)
      .then(data => { if (!controller.signal.aborted) { setRegencies(data); setError(""); } })
      .catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Daftar kabupaten/kota belum tersedia."); })
      .finally(() => {
        clearTimeout(timer);
        if (!controller.signal.aborted) setLoading(current => ({ ...current, regencies: false }));
      });
    return () => { clearTimeout(timer); controller.abort(); };
  }, [value.provinceCode]);

  useEffect(() => {
    if (!value.regencyCode) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      if (!controller.signal.aborted) setLoading(current => ({ ...current, districts: true }));
    }, 0);
    loadRegions("districts", value.regencyCode, controller.signal)
      .then(data => { if (!controller.signal.aborted) { setDistricts(data); setError(""); } })
      .catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Daftar kecamatan belum tersedia."); })
      .finally(() => {
        clearTimeout(timer);
        if (!controller.signal.aborted) setLoading(current => ({ ...current, districts: false }));
      });
    return () => { clearTimeout(timer); controller.abort(); };
  }, [value.regencyCode]);

  useEffect(() => {
    if (!value.districtCode) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      if (!controller.signal.aborted) setLoading(current => ({ ...current, villages: true }));
    }, 0);
    loadRegions("villages", value.districtCode, controller.signal)
      .then(data => { if (!controller.signal.aborted) { setVillages(data); setError(""); } })
      .catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Daftar desa/kelurahan belum tersedia."); })
      .finally(() => {
        clearTimeout(timer);
        if (!controller.signal.aborted) setLoading(current => ({ ...current, villages: false }));
      });
    return () => { clearTimeout(timer); controller.abort(); };
  }, [value.districtCode]);

  const selectRegion = (level: "province" | "regency" | "district" | "village", code: string) => {
    const options = level === "province" ? provinces : level === "regency" ? regencies : level === "district" ? districts : villages;
    const selected = options.find(item => item.code === code);
    if (level === "province") {
      setRegencies([]); setDistricts([]); setVillages([]);
      onChange({ ...value, provinceCode: code, provinceName: selected?.name || "", regencyCode: "", regencyName: "", districtCode: "", districtName: "", villageCode: "", villageName: "", postalCode: "" });
    }
    if (level === "regency") {
      setDistricts([]); setVillages([]);
      onChange({ ...value, regencyCode: code, regencyName: selected?.name || "", districtCode: "", districtName: "", villageCode: "", villageName: "", postalCode: "" });
    }
    if (level === "district") {
      setVillages([]);
      onChange({ ...value, districtCode: code, districtName: selected?.name || "", villageCode: "", villageName: "", postalCode: "" });
    }
    if (level === "village") onChange({ ...value, villageCode: code, villageName: selected?.name || "" });
  };

  const regionSelect = (id: string, label: string, selectedCode: string, options: Region[], loadingState: boolean, level: "province" | "regency" | "district" | "village", hint: string) => (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <NativeSelect id={id} className="w-full" value={selectedCode} disabled={disabled || loadingState || (level !== "province" && !value[level === "regency" ? "provinceCode" : level === "district" ? "regencyCode" : "districtCode"])} onChange={event => selectRegion(level, event.target.value)}>
        <NativeSelectOption value="">{loadingState ? "Memuat daftar…" : "Pilih " + label.toLowerCase()}</NativeSelectOption>
        {selectedCode && !options.some(item => item.code === selectedCode) && <NativeSelectOption value={selectedCode}>{level === "province" ? value.provinceName : level === "regency" ? value.regencyName : level === "district" ? value.districtName : value.villageName} (tersimpan)</NativeSelectOption>}
        {options.map(item => <NativeSelectOption key={item.code} value={item.code}>{item.name}</NativeSelectOption>)}
      </NativeSelect>
      <FieldDescription>{hint}</FieldDescription>
    </Field>
  );

  return (
    <div className="space-y-4">
      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor="profile-address-street">Nama jalan, dusun, kampung, atau patokan</FieldLabel>
          <Input id="profile-address-street" value={value.street} onChange={event => onChange({ ...value, street: event.target.value })} maxLength={240} autoComplete="street-address" disabled={disabled} />
        </Field>
        {regionSelect("profile-address-province", "Provinsi", value.provinceCode, provinces, loading.provinces, "province", "Daftar wilayah administratif Indonesia.")}
        {regionSelect("profile-address-regency", "Kabupaten / kota", value.regencyCode, regencies, loading.regencies, "regency", "Pilih setelah provinsi ditentukan.")}
        {regionSelect("profile-address-district", "Kecamatan", value.districtCode, districts, loading.districts, "district", "Pilih setelah kabupaten/kota ditentukan.")}
        {regionSelect("profile-address-village", "Desa / kelurahan", value.villageCode, villages, loading.villages, "village", "Pilih setelah kecamatan ditentukan.")}
        <Field>
          <FieldLabel htmlFor="profile-address-rt">RT</FieldLabel>
          <Input id="profile-address-rt" inputMode="numeric" value={value.rt} onChange={event => onChange({ ...value, rt: event.target.value.replace(/\D/g, "").slice(0,3) })} maxLength={3} disabled={disabled} />
        </Field>
        <Field>
          <FieldLabel htmlFor="profile-address-rw">RW</FieldLabel>
          <Input id="profile-address-rw" inputMode="numeric" value={value.rw} onChange={event => onChange({ ...value, rw: event.target.value.replace(/\D/g, "").slice(0,3) })} maxLength={3} disabled={disabled} />
        </Field>
        <Field>
          <FieldLabel htmlFor="profile-address-postal">Kode pos</FieldLabel>
          <Input id="profile-address-postal" inputMode="numeric" value={value.postalCode} onChange={event => onChange({ ...value, postalCode: event.target.value.replace(/\D/g, "").slice(0,5) })} maxLength={5} autoComplete="postal-code" disabled={disabled} />
        </Field>
      </div>
      {error && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm" role="status">
          <p className="font-medium">Pilihan wilayah belum tersedia</p>
          <p className="mt-1 text-muted-foreground">{error} Anda tetap dapat melengkapi alamat secara manual.</p>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {([
          ["provinceCode", "provinceName", "Provinsi"],
          ["regencyCode", "regencyName", "Kabupaten / kota"],
          ["districtCode", "districtName", "Kecamatan"],
          ["villageCode", "villageName", "Desa / kelurahan"],
        ] as const).filter(([code]) => !value[code]).map(([code, name, label]) => (
          <Field key={name}>
            <FieldLabel htmlFor={"profile-manual-" + name}>{label} (isi manual bila perlu)</FieldLabel>
            <Input
              id={"profile-manual-" + name}
              value={value[name]}
              maxLength={120}
              disabled={disabled}
              onChange={event => onChange({
                ...value,
                [name]: event.target.value,
                ...(name === "provinceName" ? { provinceCode: "", regencyCode: "", regencyName: "", districtCode: "", districtName: "", villageCode: "", villageName: "" } :
                  name === "regencyName" ? { regencyCode: "", districtCode: "", districtName: "", villageCode: "", villageName: "" } :
                  name === "districtName" ? { districtCode: "", villageCode: "", villageName: "" } : { villageCode: "" }),
              })}
            />
          </Field>
        ))}
      </div>
    </div>
  );
}
