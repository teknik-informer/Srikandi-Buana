"use client";

import { useStore } from "@/lib/store";
import { DataTable, type Column, type FormField } from "@/components/data-table";
import { Badge, StatusBadge } from "@/components/ui";
import { formatDateID, formatIDR } from "@/lib/format";
import type { DocumentRow, LandPlot, Partner } from "@/data/types";

/**
 * The three master-data tables that used to be read-only. Each one writes
 * through the store, so an edit on this screen is the same event the audit
 * trail and the other applications see.
 */

const visibilityLabel: Record<string, string> = { publik: "Publik", internal: "Internal", terbatas: "Terbatas" };

/* ── Sekretariat: arsip dokumen ───────────────────────────────────── */
export function DocumentCrud() {
  const { state, exec, actor } = useStore();

  const columns: Column<DocumentRow>[] = [
    { key: "number", label: "Nomor", render: (r) => <span className="font-mono text-[11.5px] text-muted">{r.number}</span> },
    { key: "title", label: "Judul", render: (r) => <span className="font-medium text-ink">{r.title}</span> },
    { key: "category", label: "Kategori" },
    { key: "date", label: "Tanggal", render: (r) => <span className="whitespace-nowrap text-muted">{formatDateID(r.date, "short")}</span> },
    { key: "owner", label: "Pemilik" },
    { key: "visibility", label: "Akses", render: (r) => (
      <Badge tone={r.visibility === "publik" ? "success" : r.visibility === "internal" ? "info" : "warning"}>
        {visibilityLabel[r.visibility]}
      </Badge>
    ) },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status === "final" ? "Final" : r.status === "draft" ? "Draf" : "Arsip"} /> },
  ];

  const fields: FormField<DocumentRow>[] = [
    { key: "number", label: "Nomor dokumen", type: "text", required: true, hint: "Mis. SK-07/2026 atau LAP-Q4-2026." },
    { key: "title", label: "Judul", type: "text", required: true },
    { key: "category", label: "Kategori", type: "select", required: true, options: [
      { value: "SK", label: "SK (Surat Keputusan)" },
      { value: "Laporan", label: "Laporan" },
      { value: "SOP", label: "SOP" },
      { value: "Surat", label: "Surat" },
      { value: "Notulen", label: "Notulen" },
      { value: "Publikasi", label: "Publikasi" },
    ] },
    { key: "date", label: "Tanggal", type: "date", required: true },
    { key: "owner", label: "Pemilik", type: "text", required: true, placeholder: "Sekretariat / Bidang Pertanian" },
    { key: "visibility", label: "Klasifikasi akses", type: "select", required: true, options: [
      { value: "publik", label: "Publik — boleh dibuka siapa pun" },
      { value: "internal", label: "Internal — anggota & pengurus" },
      { value: "terbatas", label: "Terbatas — pengurus berwenang" },
    ] },
    { key: "status", label: "Status", type: "select", required: true, options: [
      { value: "draft", label: "Draf" },
      { value: "final", label: "Final" },
      { value: "arsip", label: "Arsip" },
    ] },
  ];

  return (
    <DataTable<DocumentRow>
      rows={state.documents}
      columns={columns}
      fields={fields}
      getId={(r) => r.id}
      noun="dokumen"
      initialSort="date"
      makeEmpty={() => ({ id: "", number: "", title: "", category: "Surat", date: "2026-11-22", owner: "Sekretariat", visibility: "internal", status: "draft" })}
      validate={(d) => {
        if (!d.number?.trim()) return "Nomor dokumen wajib diisi.";
        if (!d.title?.trim()) return "Judul wajib diisi.";
        if (state.documents.some((x) => x.number.toLowerCase() === d.number.trim().toLowerCase() && x.id !== d.id))
          return `Nomor ${d.number} sudah dipakai dokumen lain.`;
        return null;
      }}
      onCreate={async (d) => exec({ type: "document.create", row: { ...d, number: d.number.trim(), title: d.title.trim() }, actor }).ok}
      onUpdate={async (row, d) => exec({ type: "document.update", id: row.id, patch: { ...d, id: row.id }, actor }).ok}
      onDelete={async (row) => exec({ type: "document.delete", id: row.id, actor }).ok}
    />
  );
}

/* ── Pertanian: petak lahan ───────────────────────────────────────── */
export function LandCrud() {
  const { state, exec, actor } = useStore();

  const columns: Column<LandPlot>[] = [
    { key: "id", label: "Petak", width: "86px", render: (r) => <span className="font-mono text-[11.5px] text-muted">{r.id}</span> },
    { key: "owner", label: "Pemilik", render: (r) => <span className="font-medium text-ink">{r.owner}</span> },
    { key: "commodity", label: "Komoditas" },
    { key: "areaHa", label: "Luas (ha)", numeric: true, render: (r) => r.areaHa.toFixed(2) },
    { key: "village", label: "Desa" },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status === "produktif" ? "Produktif" : r.status === "persiapan" ? "Persiapan" : "Istirahat"} /> },
    { key: "lastVisit", label: "Kunjungan", render: (r) => <span className="whitespace-nowrap text-muted">{r.lastVisit === "—" ? "—" : formatDateID(r.lastVisit, "short")}</span> },
  ];

  const fields: FormField<LandPlot>[] = [
    { key: "owner", label: "Pemilik / penggarap", type: "text", required: true },
    { key: "commodity", label: "Komoditas", type: "text", required: true, placeholder: "Kopi Arabika / Madu / Beras Merah" },
    { key: "areaHa", label: "Luas (hektar)", type: "number", required: true, min: 0, step: 0.01 },
    { key: "village", label: "Desa", type: "select", required: true, options: [
      { value: "Ngadimulyo", label: "Ngadimulyo" },
      { value: "Kedu", label: "Kedu" },
    ] },
    { key: "status", label: "Status petak", type: "select", required: true, options: [
      { value: "produktif", label: "Produktif" },
      { value: "persiapan", label: "Persiapan" },
      { value: "istirahat", label: "Istirahat / rehabilitasi" },
    ] },
    { key: "plantedAt", label: "Tanggal tanam", type: "date" },
    { key: "lastVisit", label: "Kunjungan terakhir", type: "date" },
    { key: "notes", label: "Catatan lapangan", type: "textarea" },
  ];

  return (
    <DataTable<LandPlot>
      rows={state.lands}
      columns={columns}
      fields={fields}
      getId={(r) => r.id}
      noun="petak"
      initialSort="id"
      makeEmpty={() => ({ id: "", owner: "", areaHa: 0, commodity: "", village: "Ngadimulyo", status: "persiapan", plantedAt: "", lastVisit: "", notes: "" })}
      validate={(d) => {
        if (!d.owner?.trim()) return "Pemilik wajib diisi.";
        if (!d.commodity?.trim()) return "Komoditas wajib diisi.";
        if (!Number.isFinite(d.areaHa) || d.areaHa <= 0) return "Luas harus lebih besar dari nol hektar.";
        if (d.areaHa > 5) return "Luas di atas 5 ha tidak lazim untuk petak anggota — periksa kembali satuannya (hektar).";
        return null;
      }}
      onCreate={async (d) => exec({ type: "land.create", row: { ...d, areaHa: Number(d.areaHa) }, actor }).ok}
      onUpdate={async (row, d) => exec({ type: "land.update", id: row.id, patch: { ...d, areaHa: Number(d.areaHa) }, actor }).ok}
      onDelete={async (row) => exec({ type: "land.delete", id: row.id, actor }).ok}
      detail={(r) => (
        <div className="rounded-sb-sm border border-line bg-paper px-3 py-2 text-[11.5px] text-muted">
          Catatan lapangan: <span className="text-ink">{r.notes || "—"}</span>
        </div>
      )}
    />
  );
}

/* ── Usaha: mitra & kemitraan ─────────────────────────────────────── */
const partnerTypeLabel: Record<string, string> = {
  pemerintah: "Pemerintah", ngo: "NGO / yayasan", usaha: "Usaha / UMKM", koperasi: "Koperasi", akademik: "Akademik",
};

export function PartnerCrud() {
  const { state, exec, actor } = useStore();

  const columns: Column<Partner>[] = [
    { key: "id", label: "Kode", width: "84px", render: (r) => <span className="font-mono text-[11.5px] text-muted">{r.id}</span> },
    { key: "name", label: "Mitra", render: (r) => <span className="font-medium text-ink">{r.name}</span> },
    { key: "type", label: "Jenis", render: (r) => partnerTypeLabel[r.type] ?? r.type },
    { key: "contact", label: "Kontak" },
    { key: "status", label: "Status", render: (r) => (
      <Badge tone={r.status === "aktif" ? "success" : r.status === "penjajakan" ? "warning" : "neutral"}>
        {r.status === "aktif" ? "Aktif" : r.status === "penjajakan" ? "Penjajakan" : "Selesai"}
      </Badge>
    ) },
    { key: "since", label: "Sejak", render: (r) => <span className="whitespace-nowrap text-muted">{formatDateID(r.since, "short")}</span> },
  ];

  const fields: FormField<Partner>[] = [
    { key: "name", label: "Nama mitra", type: "text", required: true },
    { key: "type", label: "Jenis", type: "select", required: true, options: [
      { value: "pemerintah", label: "Pemerintah" },
      { value: "ngo", label: "NGO / yayasan" },
      { value: "usaha", label: "Usaha / UMKM" },
      { value: "koperasi", label: "Koperasi" },
      { value: "akademik", label: "Akademik" },
    ] },
    { key: "contact", label: "Kontak", type: "text", required: true, placeholder: "Nama orang / posisi" },
    { key: "status", label: "Status kerja sama", type: "select", required: true, options: [
      { value: "aktif", label: "Aktif" },
      { value: "penjajakan", label: "Penjajakan" },
      { value: "selesai", label: "Selesai" },
    ] },
    { key: "since", label: "Mulai", type: "date", required: true },
    { key: "milestone", label: "Tonggak / bentuk kerja sama", type: "textarea" },
  ];

  return (
    <DataTable<Partner>
      rows={state.partners}
      columns={columns}
      fields={fields}
      getId={(r) => r.id}
      noun="mitra"
      makeEmpty={() => ({ id: "", name: "", type: "usaha", contact: "", status: "penjajakan", since: "2026-11-22", milestone: "" })}
      validate={(d) => {
        if (!d.name?.trim()) return "Nama mitra wajib diisi.";
        if (!d.contact?.trim()) return "Kontak wajib diisi — satu nama orang atau posisi.";
        if (state.partners.some((p) => p.name.trim().toLowerCase() === d.name.trim().toLowerCase() && p.id !== d.id))
          return "Mitra dengan nama ini sudah tercatat.";
        return null;
      }}
      onCreate={async (d) => exec({ type: "partner.create", row: { ...d, name: d.name.trim() }, actor }).ok}
      onUpdate={async (row, d) => exec({ type: "partner.update", id: row.id, patch: { ...d, id: row.id }, actor }).ok}
      onDelete={async (row) => exec({ type: "partner.delete", id: row.id, actor }).ok}
    />
  );
}

export { formatIDR };
