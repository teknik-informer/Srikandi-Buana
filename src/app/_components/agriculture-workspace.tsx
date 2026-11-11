"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2, ClipboardCheck, Leaf, LoaderCircle, Plus, RefreshCw, ShieldCheck, Sprout, Wheat } from "lucide-react";

type Member = { id: string; name: string; dusun: string };
type Commodity = { id: string; name: string; default_unit: string; status: string };
type Parcel = {
  id: string; member_id: string; member_name: string; parcel_code: string; name: string;
  area_m2: string | number; tenure_type: string; location_label: string; status: string;
  verification_status: string; verification_note: string;
};
type CropCycle = {
  id: string; parcel_id: string; parcel_name: string; parcel_code: string; commodity_id: string;
  commodity_name: string; default_unit: string; season_label: string; planted_area_m2: string | number;
  planting_date: string; expected_harvest_date: string | null; status: string;
  verification_status: string; verification_note: string;
};
type Harvest = {
  id: string; crop_cycle_id: string; harvest_date: string; quantity: string | number; unit_code: string;
  notes: string; verification_status: string; verification_note: string; commodity_name: string;
  parcel_name: string; parcel_code: string; season_label: string;
};
type Audit = { actor_id: string; actor_role: string; action: string; target_type: string; target_id: string; reason: string; created_at: string };
type Data = {
  members: Member[]; commodities: Commodity[]; parcels: Parcel[]; cropCycles: CropCycle[];
  harvests: Harvest[]; audit: Audit[]; permissions: { canVerify: boolean };
};
const unitLabels: Record<string, string> = { kg: "Kilogram (kg)", kuintal: "Kuintal", ton: "Ton", liter: "Liter", buah: "Buah", ikat: "Ikat", batang: "Batang" };
const tenureLabels: Record<string, string> = { owned: "Milik sendiri", leased: "Sewa", shared: "Bagi hasil", group: "Milik kelompok", other: "Lainnya" };
const verificationLabels: Record<string, string> = { pending: "Menunggu verifikasi", verified: "Terverifikasi", rejected: "Perlu perbaikan" };
const verificationStyle: Record<string, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-800",
  verified: "border-emerald-200 bg-emerald-50 text-emerald-800",
  rejected: "border-red-200 bg-red-50 text-red-800",
};
const numberLabel = (value: string | number) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(Number(value || 0));
const dateLabel = (value: string) => value ? new Date(value.slice(0, 10) + "T12:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "—";

export default function AgricultureWorkspace({ role, programIds = [] }: { role: string; programIds?: string[] }) {
  const canManageTechnical = ["admin", "ketua"].includes(role) || role === "koordinator" && programIds.includes("3");
  const canManageCommodity = ["admin", "ketua"].includes(role);
  const canManageLand = canManageTechnical || role === "sekretaris";
  const [data, setData] = useState<Data>({ members: [], commodities: [], parcels: [], cropCycles: [], harvests: [], audit: [], permissions: { canVerify: false } });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [commodityName, setCommodityName] = useState("");
  const [commodityUnit, setCommodityUnit] = useState("kg");
  const [memberId, setMemberId] = useState("");
  const [parcelCode, setParcelCode] = useState("");
  const [parcelName, setParcelName] = useState("");
  const [areaM2, setAreaM2] = useState("");
  const [tenureType, setTenureType] = useState("owned");
  const [locationLabel, setLocationLabel] = useState("");
  const [editingParcelId, setEditingParcelId] = useState("");
  const [parcelDraft, setParcelDraft] = useState({ memberId: "", parcelCode: "", name: "", areaM2: "", tenureType: "owned", locationLabel: "" });
  const [parcelId, setParcelId] = useState("");
  const [commodityId, setCommodityId] = useState("");
  const [seasonLabel, setSeasonLabel] = useState("");
  const [plantedAreaM2, setPlantedAreaM2] = useState("");
  const [plantingDate, setPlantingDate] = useState("");
  const [expectedHarvestDate, setExpectedHarvestDate] = useState("");
  const [cropCycleId, setCropCycleId] = useState("");
  const [harvestDate, setHarvestDate] = useState("");
  const [quantity, setQuantity] = useState("");
  const [harvestNotes, setHarvestNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/agriculture", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Data pertanian belum dapat dimuat.");
      setData(result);
      setError("");
      setMemberId((current) => current || result.members[0]?.id || "");
      setParcelId((current) => current || result.parcels.find((p: Parcel) => p.status === "active")?.id || "");
      setCommodityId((current) => current || result.commodities.find((c: Commodity) => c.status === "active")?.id || "");
      setCropCycleId((current) => current || result.cropCycles.find((c: CropCycle) => c.status !== "failed")?.id || "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Koneksi terputus.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const selectedCycle = useMemo(() => data.cropCycles.find((cycle) => cycle.id === cropCycleId), [data.cropCycles, cropCycleId]);
  const activeParcels = useMemo(() => data.parcels.filter((parcel) => parcel.status === "active"), [data.parcels]);
  const activeCommodities = useMemo(() => data.commodities.filter((commodity) => commodity.status === "active"), [data.commodities]);

  async function create(event: FormEvent<HTMLFormElement>, action: string, values: Record<string, unknown>, reset: () => void) {
    event.preventDefault();
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/agriculture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...values }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Pencatatan belum tersimpan.");
      reset();
      setNotice("Data berhasil dicatat dan masuk antrean verifikasi.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Koneksi terputus. Periksa kembali status data.");
    } finally {
      setBusy(false);
    }
  }

  function editParcel(parcel: Parcel) {
    setEditingParcelId(parcel.id);
    setParcelDraft({
      memberId: parcel.member_id,
      parcelCode: parcel.parcel_code,
      name: parcel.name,
      areaM2: String(parcel.area_m2),
      tenureType: parcel.tenure_type,
      locationLabel: parcel.location_label || "",
    });
    setError("");
    setNotice("");
  }

  async function saveParcel(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/agriculture", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_parcel", id, ...parcelDraft }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Perubahan register lahan belum tersimpan.");
      setEditingParcelId("");
      setNotice("Register lahan diperbarui. Status verifikasi dikembalikan ke antrean Ketua.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Koneksi terputus.");
    } finally {
      setBusy(false);
    }
  }

  async function archiveParcel(id: string) {
    const reason = window.prompt("Alasan pengarsipan register lahan (minimal 10 karakter).") || "";
    if (reason.trim().length < 10) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/agriculture", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "archive_parcel", id, reason }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Register lahan belum dapat diarsipkan.");
      setNotice("Register lahan diarsipkan. Riwayat dan hubungan siklus tanam tetap dipertahankan.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Koneksi terputus.");
    } finally {
      setBusy(false);
    }
  }

  async function verify(type: "parcel" | "crop_cycle" | "harvest", id: string, accepted: boolean) {
    const reason = accepted ? "Diperiksa dan sesuai dengan bukti administrasi/lapangan." : window.prompt("Tuliskan alasan dan hal yang perlu diperbaiki (minimal 10 karakter).") || "";
    if (!accepted && reason.trim().length < 10) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/agriculture", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: (accepted ? "verify_" : "reject_") + type, id, reason }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Status verifikasi belum berubah.");
      setNotice(accepted ? "Data berhasil diverifikasi." : "Data dikembalikan untuk perbaikan.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Koneksi terputus.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">Data lapangan terstruktur</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Pengelolaan Pertanian</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">Catat lahan anggota, komoditas, siklus tanam, dan hasil panen. Data baru belum menjadi angka laporan sebelum diperiksa dan disahkan.</p>
      </div>
      <button type="button" onClick={() => void load()} disabled={loading || busy} className="inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-sm font-medium hover:bg-muted disabled:opacity-50"><RefreshCw size={15}/> Muat ulang</button>
    </header>

    {(error || notice) && <div role={error ? "alert" : "status"} className={error ? "flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800" : "flex gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"}>
      {error ? <AlertCircle size={17} className="mt-0.5 shrink-0"/> : <CheckCircle2 size={17} className="mt-0.5 shrink-0"/>}{error || notice}
    </div>}

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">Anggota aktif terverifikasi</p><p className="mt-1 text-2xl font-semibold tabular-nums">{data.members.length}</p><p className="text-xs text-muted-foreground">Tersedia untuk pencatatan lahan</p></div>
      <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">Lahan terdaftar</p><p className="mt-1 text-2xl font-semibold tabular-nums">{data.parcels.length}</p><p className="text-xs text-muted-foreground">{data.parcels.filter(p => p.verification_status === "verified").length} terverifikasi</p></div>
      <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">Siklus tanam</p><p className="mt-1 text-2xl font-semibold tabular-nums">{data.cropCycles.length}</p><p className="text-xs text-muted-foreground">{data.cropCycles.filter(c => c.verification_status === "verified").length} terverifikasi</p></div>
      <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">Catatan panen</p><p className="mt-1 text-2xl font-semibold tabular-nums">{data.harvests.length}</p><p className="text-xs text-muted-foreground">{data.harvests.filter(h => h.verification_status === "verified").length} terverifikasi</p></div>
    </div>

    <div className="grid gap-5 xl:grid-cols-2">
      <section className="rounded-2xl border bg-card p-5">
        <div className="flex items-center gap-2"><Leaf size={19} className="text-emerald-700"/><h2 className="font-semibold">Master komoditas</h2></div>
        <p className="mt-1 text-sm text-muted-foreground">Satuan dasar harus konsisten untuk setiap komoditas. Panen akan dicatat menggunakan satuan ini.</p>
        {canManageCommodity && <form className="mt-4 grid gap-3 sm:grid-cols-[1fr_180px_auto]" onSubmit={(event) => void create(event, "create_commodity", { name: commodityName, defaultUnit: commodityUnit }, () => setCommodityName(""))}>
          <label className="grid gap-1 text-sm font-medium">Nama komoditas<input required minLength={2} maxLength={120} value={commodityName} onChange={e => setCommodityName(e.target.value)} className="min-h-10 rounded-lg border bg-background px-3" placeholder="Contoh: Cabai rawit"/></label>
          <label className="grid gap-1 text-sm font-medium">Satuan dasar<select value={commodityUnit} onChange={e => setCommodityUnit(e.target.value)} className="min-h-10 rounded-lg border bg-background px-2">{Object.entries(unitLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <div className="flex items-end"><button disabled={busy} className="inline-flex min-h-10 w-full items-center justify-center gap-1 rounded-lg bg-emerald-800 px-3 text-sm font-semibold text-white disabled:opacity-50"><Plus size={15}/> Tambah</button></div>
        </form>}
        <div className="mt-4 flex flex-wrap gap-2">{data.commodities.map(c => <span key={c.id} className="rounded-full border bg-muted/40 px-3 py-1.5 text-xs font-medium">{c.name} · {c.default_unit}</span>)}{!data.commodities.length && <p className="text-sm text-muted-foreground">Belum ada komoditas. Tambahkan daftar komoditas yang benar-benar dikelola.</p>}</div>
      </section>

      <section className="rounded-2xl border bg-card p-5">
        <div className="flex items-center gap-2"><Sprout size={19} className="text-emerald-700"/><h2 className="font-semibold">Catat lahan anggota</h2></div>
        {canManageLand && <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={(event) => void create(event, "create_parcel", { memberId, parcelCode, name: parcelName, areaM2, tenureType, locationLabel }, () => { setParcelCode(""); setParcelName(""); setAreaM2(""); setLocationLabel(""); })}>
          <label className="grid gap-1 text-sm font-medium sm:col-span-2">Anggota pemilik/penanggung jawab<select required value={memberId} onChange={e => setMemberId(e.target.value)} className="min-h-10 rounded-lg border bg-background px-3"><option value="">Pilih anggota aktif terverifikasi</option>{data.members.map(m => <option key={m.id} value={m.id}>{m.name}{m.dusun ? " · "+m.dusun : ""}</option>)}</select></label>
          <label className="grid gap-1 text-sm font-medium">Kode lahan<input required minLength={2} maxLength={80} value={parcelCode} onChange={e => setParcelCode(e.target.value)} className="min-h-10 rounded-lg border bg-background px-3" placeholder="SB-LHN-001"/></label>
          <label className="grid gap-1 text-sm font-medium">Nama/pengenal lahan<input required minLength={2} maxLength={140} value={parcelName} onChange={e => setParcelName(e.target.value)} className="min-h-10 rounded-lg border bg-background px-3" placeholder="Kebun utara"/></label>
          <label className="grid gap-1 text-sm font-medium">Luas (m²)<input required type="number" min="0.01" max="100000000" step="0.01" value={areaM2} onChange={e => setAreaM2(e.target.value)} className="min-h-10 rounded-lg border bg-background px-3" placeholder="1500"/></label>
          <label className="grid gap-1 text-sm font-medium">Status penguasaan<select value={tenureType} onChange={e => setTenureType(e.target.value)} className="min-h-10 rounded-lg border bg-background px-3">{Object.entries(tenureLabels).map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></label>
          <label className="grid gap-1 text-sm font-medium sm:col-span-2">Lokasi umum (opsional)<input maxLength={200} value={locationLabel} onChange={e => setLocationLabel(e.target.value)} className="min-h-10 rounded-lg border bg-background px-3" placeholder="Dusun / wilayah umum; jangan masukkan koordinat atau alamat pribadi"/></label>
          <p className="sm:col-span-2 text-xs leading-5 text-muted-foreground">Data lahan selalu berstatus menunggu verifikasi setelah dicatat. Alamat rinci dan koordinat GPS tidak diminta pada formulir ini.</p>
          <button disabled={busy || !data.members.length} className="sm:col-span-2 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-emerald-800 px-4 text-sm font-semibold text-white disabled:opacity-50"><Plus size={15}/> Simpan data lahan</button>
        </form>}
      </section>

      <section className="rounded-2xl border bg-card p-5">
        <div className="flex items-center gap-2"><Sprout size={19} className="text-emerald-700"/><h2 className="font-semibold">Catat siklus tanam</h2></div>
        {canManageTechnical && <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={(event) => void create(event, "create_crop_cycle", { parcelId, commodityId, seasonLabel, plantedAreaM2, plantingDate, expectedHarvestDate }, () => { setSeasonLabel(""); setPlantedAreaM2(""); setPlantingDate(""); setExpectedHarvestDate(""); })}>
          <label className="grid gap-1 text-sm font-medium sm:col-span-2">Lahan<select required value={parcelId} onChange={e => setParcelId(e.target.value)} className="min-h-10 rounded-lg border bg-background px-3"><option value="">Pilih lahan aktif</option>{activeParcels.map(p => <option key={p.id} value={p.id}>{p.parcel_code} · {p.name} ({numberLabel(p.area_m2)} m²)</option>)}</select></label>
          <label className="grid gap-1 text-sm font-medium sm:col-span-2">Komoditas<select required value={commodityId} onChange={e => setCommodityId(e.target.value)} className="min-h-10 rounded-lg border bg-background px-3"><option value="">Pilih komoditas</option>{activeCommodities.map(c => <option key={c.id} value={c.id}>{c.name} · {c.default_unit}</option>)}</select></label>
          <label className="grid gap-1 text-sm font-medium">Musim/periode tanam<input required minLength={2} maxLength={100} value={seasonLabel} onChange={e => setSeasonLabel(e.target.value)} className="min-h-10 rounded-lg border bg-background px-3" placeholder="Musim hujan 2026"/></label>
          <label className="grid gap-1 text-sm font-medium">Luas tanam (m²)<input required type="number" min="0.01" step="0.01" max="100000000" value={plantedAreaM2} onChange={e => setPlantedAreaM2(e.target.value)} className="min-h-10 rounded-lg border bg-background px-3"/></label>
          <label className="grid gap-1 text-sm font-medium">Tanggal tanam<input required type="date" value={plantingDate} onChange={e => setPlantingDate(e.target.value)} className="min-h-10 rounded-lg border bg-background px-3"/></label>
          <label className="grid gap-1 text-sm font-medium">Perkiraan panen<input type="date" min={plantingDate || undefined} value={expectedHarvestDate} onChange={e => setExpectedHarvestDate(e.target.value)} className="min-h-10 rounded-lg border bg-background px-3"/></label>
          <button disabled={busy || !activeParcels.length || !activeCommodities.length} className="sm:col-span-2 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-emerald-800 px-4 text-sm font-semibold text-white disabled:opacity-50"><Plus size={15}/> Simpan siklus tanam</button>
        </form>}
      </section>

      <section className="rounded-2xl border bg-card p-5">
        <div className="flex items-center gap-2"><Wheat size={19} className="text-emerald-700"/><h2 className="font-semibold">Catat hasil panen</h2></div>
        {canManageTechnical && <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={(event) => void create(event, "create_harvest", { cropCycleId, harvestDate, quantity, notes: harvestNotes }, () => { setHarvestDate(""); setQuantity(""); setHarvestNotes(""); })}>
          <label className="grid gap-1 text-sm font-medium sm:col-span-2">Siklus tanam<select required value={cropCycleId} onChange={e => setCropCycleId(e.target.value)} className="min-h-10 rounded-lg border bg-background px-3"><option value="">Pilih siklus tanam</option>{data.cropCycles.filter(c => c.status !== "failed").map(c => <option key={c.id} value={c.id}>{c.commodity_name} · {c.parcel_code} · {c.season_label}</option>)}</select></label>
          <label className="grid gap-1 text-sm font-medium">Tanggal panen<input required type="date" value={harvestDate} onChange={e => setHarvestDate(e.target.value)} className="min-h-10 rounded-lg border bg-background px-3"/></label>
          <label className="grid gap-1 text-sm font-medium">Jumlah hasil ({selectedCycle?.default_unit || "satuan"})<input required type="number" min="0.001" step="0.001" max="100000000000" value={quantity} onChange={e => setQuantity(e.target.value)} className="min-h-10 rounded-lg border bg-background px-3"/></label>
          <label className="grid gap-1 text-sm font-medium sm:col-span-2">Catatan panen (opsional)<textarea maxLength={2000} rows={2} value={harvestNotes} onChange={e => setHarvestNotes(e.target.value)} className="rounded-lg border bg-background p-3" placeholder="Kualitas, kondisi, atau keterangan pencatatan"/></label>
          <p className="sm:col-span-2 text-xs text-muted-foreground">Satuan mengikuti master komoditas. Hasil panen belum masuk ringkasan eksternal sebelum catatan, siklus, dan lahannya diverifikasi.</p>
          <button disabled={busy || !data.cropCycles.length} className="sm:col-span-2 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-emerald-800 px-4 text-sm font-semibold text-white disabled:opacity-50"><Plus size={15}/> Simpan catatan panen</button>
        </form>}
      </section>
    </div>

    <section className="rounded-2xl border bg-card p-5">
      <div className="flex items-center gap-2"><ClipboardCheck size={19}/><h2 className="font-semibold">Register lahan dan verifikasi</h2></div>
      <div className="mt-4 grid gap-3">{data.parcels.map(parcel => <article key={parcel.id} className="rounded-xl border p-4">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs text-muted-foreground">{parcel.parcel_code} · {parcel.member_name}</p><h3 className="font-semibold">{parcel.name}</h3><p className="mt-1 text-xs text-muted-foreground">{numberLabel(parcel.area_m2)} m² · {tenureLabels[parcel.tenure_type] || parcel.tenure_type}{parcel.location_label ? " · "+parcel.location_label : ""}</p></div><span className={`rounded-full border px-3 py-1 text-xs font-semibold ${verificationStyle[parcel.verification_status] || ""}`}>{verificationLabels[parcel.verification_status] || parcel.verification_status}</span></div>
        {parcel.status === "archived" && <p className="mt-2 text-xs font-medium text-muted-foreground">Register diarsipkan · tidak tersedia untuk siklus tanam baru</p>}
        {parcel.verification_note && <p className="mt-2 text-xs text-muted-foreground">{parcel.verification_note}</p>}
        {role === "sekretaris" && parcel.status === "active" && <div className="mt-3">
          {editingParcelId === parcel.id ? <form className="grid gap-3 rounded-xl bg-muted/30 p-3 sm:grid-cols-2" onSubmit={(event) => void saveParcel(event, parcel.id)}>
            <label className="grid gap-1 text-xs font-medium sm:col-span-2">Anggota penanggung jawab<select required value={parcelDraft.memberId} onChange={e => setParcelDraft(v => ({ ...v, memberId: e.target.value }))} className="min-h-10 rounded-lg border bg-background px-3 text-sm">{data.members.map(m => <option key={m.id} value={m.id}>{m.name}{m.dusun ? " · "+m.dusun : ""}</option>)}</select></label>
            <label className="grid gap-1 text-xs font-medium">Kode lahan<input required minLength={2} maxLength={80} value={parcelDraft.parcelCode} onChange={e => setParcelDraft(v => ({ ...v, parcelCode: e.target.value }))} className="min-h-10 rounded-lg border bg-background px-3 text-sm"/></label>
            <label className="grid gap-1 text-xs font-medium">Nama/pengenal lahan<input required minLength={2} maxLength={140} value={parcelDraft.name} onChange={e => setParcelDraft(v => ({ ...v, name: e.target.value }))} className="min-h-10 rounded-lg border bg-background px-3 text-sm"/></label>
            <label className="grid gap-1 text-xs font-medium">Luas (m²)<input required type="number" min="0.01" max="100000000" step="0.01" value={parcelDraft.areaM2} onChange={e => setParcelDraft(v => ({ ...v, areaM2: e.target.value }))} className="min-h-10 rounded-lg border bg-background px-3 text-sm"/></label>
            <label className="grid gap-1 text-xs font-medium">Status penguasaan<select value={parcelDraft.tenureType} onChange={e => setParcelDraft(v => ({ ...v, tenureType: e.target.value }))} className="min-h-10 rounded-lg border bg-background px-3 text-sm">{Object.entries(tenureLabels).map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></label>
            <label className="grid gap-1 text-xs font-medium sm:col-span-2">Lokasi umum<input maxLength={200} value={parcelDraft.locationLabel} onChange={e => setParcelDraft(v => ({ ...v, locationLabel: e.target.value }))} className="min-h-10 rounded-lg border bg-background px-3 text-sm"/></label>
            <p className="sm:col-span-2 text-xs text-muted-foreground">Perubahan data mengembalikan status verifikasi menjadi menunggu pemeriksaan Ketua.</p>
            <div className="sm:col-span-2 flex flex-wrap gap-2"><button disabled={busy} className="min-h-9 rounded-lg bg-emerald-800 px-3 text-xs font-semibold text-white disabled:opacity-50">Simpan perubahan</button><button type="button" disabled={busy} onClick={() => setEditingParcelId("")} className="min-h-9 rounded-lg border px-3 text-xs font-semibold disabled:opacity-50">Batal</button></div>
          </form> : <div className="flex flex-wrap gap-2"><button disabled={busy} onClick={() => editParcel(parcel)} className="min-h-9 rounded-lg border px-3 text-xs font-semibold disabled:opacity-50">Ubah register</button><button disabled={busy} onClick={() => void archiveParcel(parcel.id)} className="min-h-9 rounded-lg border border-amber-300 px-3 text-xs font-semibold text-amber-800 disabled:opacity-50">Arsipkan lahan</button></div>}
        </div>}
        {data.permissions.canVerify && parcel.verification_status !== "verified" && <div className="mt-3 flex flex-wrap gap-2"><button disabled={busy} onClick={() => void verify("parcel", parcel.id, true)} className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-emerald-800 px-3 text-xs font-semibold text-white disabled:opacity-50"><ShieldCheck size={14}/> Verifikasi lahan</button><button disabled={busy} onClick={() => void verify("parcel", parcel.id, false)} className="min-h-9 rounded-lg border border-red-200 px-3 text-xs font-semibold text-red-700 disabled:opacity-50">Kembalikan</button></div>}
      </article>)}{!data.parcels.length && <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Belum ada lahan yang dicatat.</p>}</div>
    </section>

    <section className="rounded-2xl border bg-card p-5">
      <div className="flex items-center gap-2"><Sprout size={19}/><h2 className="font-semibold">Siklus tanam</h2></div>
      <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b text-xs text-muted-foreground"><tr><th className="py-2 pr-3">Komoditas / lahan</th><th className="py-2 pr-3">Musim</th><th className="py-2 pr-3">Luas tanam</th><th className="py-2 pr-3">Tanggal tanam</th><th className="py-2 pr-3">Verifikasi</th><th className="py-2">Tindakan</th></tr></thead><tbody className="divide-y">{data.cropCycles.map(cycle => <tr key={cycle.id}><td className="py-3 pr-3"><p className="font-medium">{cycle.commodity_name}</p><p className="text-xs text-muted-foreground">{cycle.parcel_code} · {cycle.parcel_name}</p></td><td className="py-3 pr-3">{cycle.season_label}</td><td className="py-3 pr-3">{numberLabel(cycle.planted_area_m2)} m²</td><td className="py-3 pr-3">{dateLabel(cycle.planting_date)}</td><td className="py-3 pr-3"><span className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${verificationStyle[cycle.verification_status] || ""}`}>{verificationLabels[cycle.verification_status] || cycle.verification_status}</span></td><td className="py-3">{data.permissions.canVerify && cycle.verification_status !== "verified" && <button disabled={busy} onClick={() => void verify("crop_cycle", cycle.id, true)} className="text-xs font-semibold text-emerald-800 underline underline-offset-4">Verifikasi</button>}</td></tr>)}</tbody></table></div>
      {!data.cropCycles.length && <p className="mt-3 text-sm text-muted-foreground">Belum ada siklus tanam yang dicatat.</p>}
    </section>

    <section className="rounded-2xl border bg-card p-5">
      <div className="flex items-center gap-2"><Wheat size={19}/><h2 className="font-semibold">Hasil panen dan pemeriksaan</h2></div>
      <div className="mt-4 grid gap-3">{data.harvests.map(harvest => <article key={harvest.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
        <div><p className="text-xs text-muted-foreground">{dateLabel(harvest.harvest_date)} · {harvest.parcel_code}</p><h3 className="font-semibold">{harvest.commodity_name} · {numberLabel(harvest.quantity)} {harvest.unit_code}</h3><p className="mt-1 text-xs text-muted-foreground">{harvest.parcel_name} · {harvest.season_label}{harvest.notes ? " · "+harvest.notes : ""}</p><span className={`mt-2 inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold ${verificationStyle[harvest.verification_status] || ""}`}>{verificationLabels[harvest.verification_status] || harvest.verification_status}</span>{harvest.verification_note && <p className="mt-1 text-xs text-muted-foreground">{harvest.verification_note}</p>}</div>
        {data.permissions.canVerify && harvest.verification_status !== "verified" && <div className="flex gap-2"><button disabled={busy} onClick={() => void verify("harvest", harvest.id, true)} className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-emerald-800 px-3 text-xs font-semibold text-white disabled:opacity-50"><ShieldCheck size={14}/> Verifikasi</button><button disabled={busy} onClick={() => void verify("harvest", harvest.id, false)} className="min-h-9 rounded-lg border border-red-200 px-3 text-xs font-semibold text-red-700 disabled:opacity-50">Kembalikan</button></div>}
      </article>)}{!data.harvests.length && <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Belum ada hasil panen yang dicatat.</p>}</div>
    </section>

    <section className="rounded-2xl border bg-card p-5">
      <h2 className="font-semibold">Jejak audit pertanian</h2>
      <p className="mt-1 text-xs text-muted-foreground">Aktivitas pencatatan dan verifikasi disimpan bersama waktu dan akun pelaksana.</p>
      <div className="mt-3 divide-y">{data.audit.map((entry, index) => <div key={entry.target_id + entry.created_at + index} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><div><p className="font-medium">{entry.action}</p><p className="text-xs text-muted-foreground">{entry.target_type} · {entry.actor_role}{entry.reason ? " · "+entry.reason : ""}</p></div><time className="text-xs text-muted-foreground">{new Date(entry.created_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}</time></div>)}{!data.audit.length && <p className="py-4 text-sm text-muted-foreground">Belum ada aktivitas.</p>}</div>
    </section>
    {loading && <div className="fixed bottom-5 right-5 flex items-center gap-2 rounded-full border bg-background px-4 py-2 text-xs shadow-lg"><LoaderCircle size={14} className="animate-spin"/> Memuat data</div>}
  </div>;
}
