"use client";

/**
 * Buku induk anggota — kini BENAR-BENAR buku induk.
 *
 * Sebelumnya halaman ini membaca `MEMBERS` dari data statis: tabel yang tampak
 * hidup tetapi tidak menanggapi apa pun. Sekarang ia membaca state bersama,
 * sehingga anggota yang didaftarkan di Meja Kerja muncul di sini, dan
 * keputusan verifikasi di sini mengubah hitungan di dasbor dan laporan.
 */
import { useMemo, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { FIELDS } from "@/config/fields";
import { ORG } from "@/config/org";
import { Avatar, Badge, Card, CardHeader, Notice, PageHeader, StatCard, Tabs } from "@/components/ui";
import { Btn, Field, Modal, Select, TextInput } from "@/components/act";
import { formatDateID } from "@/lib/format";
import type { Member } from "@/data/types";

export function AnggotaClient({ status }: { status: string }) {
  const { state, exec, actor } = useStore();
  const [open, setOpen] = useState(false);

  const members = state.members;
  const active = status === "menunggu" || status === "nonaktif" ? status : "aktif";
  const list = members.filter((m) => m.status === active);
  const count = (s: Member["status"]) => members.filter((m) => m.status === s).length;

  const tanpaBidang = useMemo(() => members.filter((m) => !m.field && m.status === "aktif").length, [members]);

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Sekretariat · buku induk"
        title="Buku induk anggota"
        description="Sumber kebenaran keanggotaan: identitas, lingkup, bidang, status. Aplikasi lain membaca dari sini — daftar di Meja Kerja, hitungan di dasbor, dan laporan mengikuti apa yang tercatat di halaman ini."
        actions={
          <div className="flex items-center gap-2">
            <Link href="/app/kerja" className="sb-btn sb-btn-outline">Meja kerja</Link>
            <Btn variant="primary" onClick={() => setOpen(true)}>Tambah anggota</Btn>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Anggota aktif" value={count("aktif")} note={`${members.length} nomor induk`} tone="success" />
        <StatCard label="Menunggu verifikasi" value={count("menunggu")} note="Pendaftaran baru" tone="warning" />
        <StatCard label="Nonaktif" value={count("nonaktif")} note="Arsip — riwayat tetap disimpan" tone="neutral" />
      </div>

      <div className="mt-4">
        <Tabs
          active={active}
          tabs={[
            { key: "aktif", label: `Aktif (${count("aktif")})`, href: "/app/sekretariat/anggota?status=aktif" },
            { key: "menunggu", label: `Menunggu (${count("menunggu")})`, href: "/app/sekretariat/anggota?status=menunggu" },
            { key: "nonaktif", label: `Nonaktif (${count("nonaktif")})`, href: "/app/sekretariat/anggota?status=nonaktif" },
          ]}
        />
      </div>

      <div className="mt-4">
        <Card>
          <CardHeader
            title={active === "aktif" ? "Anggota aktif" : active === "menunggu" ? "Antrean verifikasi" : "Arsip anggota"}
            subtitle={`${list.length} baris`}
            action={<Badge tone="info">Data bersama</Badge>}
          />
          {list.length ? (
            <div className="sb-scroll">
              <table className="sb-table min-w-[900px]">
                <thead>
                  <tr>
                    <th>No. induk</th><th>Nama</th><th>Peran</th><th>Bidang</th><th>Desa</th>
                    <th>Bergabung</th><th>Kontak</th><th>Status</th><th>Tindakan</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((m) => {
                    const f = FIELDS.find((x) => x.slug === m.field);
                    return (
                      <tr key={m.id}>
                        <td className="whitespace-nowrap font-mono text-[11px] text-muted">{m.id}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <Avatar name={m.name} size={26} />
                            <span className="font-medium text-ink">{m.name}</span>
                          </div>
                        </td>
                        <td className="text-ink2">{m.role}</td>
                        <td className="text-muted">{f?.shortName ?? "—"}</td>
                        <td className="text-muted">{m.village}</td>
                        <td className="whitespace-nowrap text-muted">{formatDateID(m.joined, "short")}</td>
                        <td className="whitespace-nowrap text-muted">{m.phone || "—"}</td>
                        <td>
                          <Badge tone={m.status === "aktif" ? "success" : m.status === "menunggu" ? "warning" : "neutral"}>
                            {m.status}
                          </Badge>
                        </td>
                        <td className="whitespace-nowrap">
                          {m.status === "menunggu" ? (
                            <div className="flex gap-1.5">
                              <button
                                className="sb-btn sb-btn-primary !px-2.5 !py-1 text-[11px]"
                                onClick={() => exec({ type: "member.status", id: m.id, status: "aktif", actor })}
                              >
                                Verifikasi
                              </button>
                              <button
                                className="sb-btn sb-btn-outline !px-2.5 !py-1 text-[11px]"
                                onClick={() => exec({ type: "member.status", id: m.id, status: "nonaktif", actor })}
                              >
                                Tolak
                              </button>
                            </div>
                          ) : m.status === "aktif" ? (
                            <button
                              className="sb-btn sb-btn-outline !px-2.5 !py-1 text-[11px]"
                              onClick={() => exec({ type: "member.status", id: m.id, status: "nonaktif", actor })}
                            >
                              Nonaktifkan
                            </button>
                          ) : (
                            <button
                              className="sb-btn sb-btn-outline !px-2.5 !py-1 text-[11px]"
                              onClick={() => exec({ type: "member.status", id: m.id, status: "aktif", actor })}
                            >
                              Aktifkan
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-4 py-10 text-center text-[12.5px] text-muted">
              Tidak ada anggota pada status ini.{" "}
              <button className="font-semibold text-primary-700" onClick={() => setOpen(true)}>Tambah satu</button>.
            </div>
          )}
        </Card>
      </div>

      <div className="mt-5">
        <Notice tone="info" title="Privasi & ketentuan iuran">
          Nomor telepon ditampilkan untuk pengurus berwenang; akses data pribadi dibatasi menurut peran (§13.4) dan
          tercatat pada audit akses. Ketentuan iuran: <strong>{ORG.duesStatus}</strong>.{" "}
          {tanpaBidang > 0 ? `${tanpaBidang} anggota aktif belum masuk bidang — pertimbangkan penempatan di peta bidang.` : "Semua anggota aktif sudah masuk bidang."}
        </Notice>
      </div>

      <AddMember open={open} onClose={() => setOpen(false)} />
      <Detail open={open} />
    </div>
  );
}

/** Dialog pendaftaran anggota baru — menulis lewat aksi store yang sama. */
function AddMember({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { exec, actor } = useStore();
  const [f, setF] = useState({ name: "", role: "Anggota", village: "Ngadimulyo", phone: "", field: "" });
  const [err, setErr] = useState<string | null>(null);

  function simpan() {
    const r = exec({
      type: "member.create",
      member: {
        name: f.name, role: f.role, scope: "anggota", village: f.village, phone: f.phone,
        field: f.field || undefined, status: "menunggu",
      },
      actor,
    });
    if (r.ok) {
      onClose();
      setF({ name: "", role: "Anggota", village: "Ngadimulyo", phone: "", field: "" });
    } else setErr(r.message);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Anggota baru"
      description="Pendaftar masuk antrean verifikasi; verifikasi di tabel menjadikannya anggota aktif."
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Batal</Btn>
          <Btn variant="primary" onClick={simpan}>Simpan anggota</Btn>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Nama lengkap" required error={err ?? undefined}>
          {(id) => <TextInput id={id} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="mis. Sumiyati" />}
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Desa">{(id) => (
            <Select id={id} value={f.village} onChange={(e) => setF({ ...f, village: e.target.value })}>
              <option>Ngadimulyo</option><option>Kedu</option><option>Krajan</option>
            </Select>
          )}</Field>
          <Field label="Bidang">{(id) => (
            <Select id={id} value={f.field} onChange={(e) => setF({ ...f, field: e.target.value })}>
              <option value="">— belum ditentukan —</option>
              {FIELDS.map((x) => <option key={x.slug} value={x.slug}>{x.shortName}</option>)}
            </Select>
          )}</Field>
          <Field label="Peran">{(id) => (
            <Select id={id} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
              <option>Anggota</option><option>Pengurus bidang</option><option>Pengurus harian</option>
            </Select>
          )}</Field>
          <Field label="Telepon">{(id) => (
            <TextInput id={id} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="08…" inputMode="tel" />
          )}</Field>
        </div>
      </div>
    </Modal>
  );
}

function Detail({ open }: { open: boolean }) {
  void open;
  return null;
}
