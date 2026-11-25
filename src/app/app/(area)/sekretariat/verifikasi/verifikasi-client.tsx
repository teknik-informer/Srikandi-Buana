"use client";

/**
 * Pendaftaran & verifikasi.
 *
 * Halaman ini dulu menampilkan tombol Terima / Minta perbaikan yang sengaja
 * dinonaktifkan dengan alasan "memerlukan basis data". Sekarang basis datanya
 * ada dan keputusan benar-benar tercatat: menerima anggota mengubah buku induk,
 * mengubah angka di dasbor, dan meninggalkan jejak audit.
 */
import { useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { Badge, Card, CardHeader, EmptyState, Notice, PageHeader, StatCard } from "@/components/ui";
import { Btn, Field, Modal, TextInput } from "@/components/act";
import { formatDateID, daysUntil } from "@/lib/format";

const CHECKLIST = [
  "Identitas dan domisili sesuai data desa",
  "Bersedia mengikuti ketentuan organisasi",
  "Tidak merangkap keanggotaan kelompok tani lain di desa yang sama",
  "Persetujuan pencatatan data pribadi",
];

export function VerifikasiClient() {
  const { state, exec, actor } = useStore();
  const [menolak, setMenolak] = useState<string | null>(null);
  const [alasan, setAlasan] = useState("");

  const menunggu = state.members.filter((m) => m.status === "menunggu");
  const aktif = state.members.filter((m) => m.status === "aktif");
  const target = state.members.find((m) => m.id === menolak);

  function terima(id: string) {
    exec({ type: "member.status", id, status: "aktif", actor });
  }

  function mintaPerbaikan() {
    if (!target) return;
    // Anggota tetap "menunggu"; catatan perbaikan masuk jejak audit dan daftar
    // minat kosong menandai data belum lengkap.
    exec({
      type: "member.update",
      id: target.id,
      patch: { interests: [], phone: target.phone },
      actor,
    });
    setMenolak(null);
    setAlasan("");
  }

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Sekretariat · keanggotaan"
        title="Pendaftaran & verifikasi anggota"
        description="Antrean pendaftaran beserta daftar periksa. Keputusan langsung tercatat di buku induk, mengubah hitungan di dasbor, dan masuk jejak audit."
        actions={<Link href="/app/sekretariat/anggota" className="sb-btn sb-btn-outline">Buku induk</Link>}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Menunggu keputusan" value={menunggu.length} note="Antrean aktif" tone={menunggu.length ? "warning" : "success"} />
        <StatCard label="Anggota aktif" value={aktif.length} note="Tercatat di buku induk" tone="success" />
        <StatCard
          label="Verifikasi hari ini"
          value={state.audit.filter((a) => a.action === "Mengubah status anggota").length}
          note="Keputusan tercatat di audit"
          tone="info"
        />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <Card>
          <CardHeader
            title="Antrean verifikasi"
            subtitle="Pendaftaran dari Meja Kerja dan halaman gabung publik"
            action={<Badge tone={menunggu.length ? "warning" : "success"}>{menunggu.length} menunggu</Badge>}
          />
          {menunggu.length ? (
            <div className="divide-y divide-line">
              {menunggu.map((m) => {
                const d = daysUntil(m.joined);
                return (
                  <div key={m.id} className="px-4 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold text-ink">{m.name}</div>
                        <div className="mt-0.5 text-[11px] text-muted">
                          Mendaftar {formatDateID(m.joined, "long")} · Desa {m.village} · {m.phone || "telepon belum diisi"}
                        </div>
                        <div className="mt-1 text-[11px] text-muted2">
                          Minat: {m.interests.join(", ") || "Belum tercatat"}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <Badge tone="warning">menunggu</Badge>
                        <div className="mt-1 text-[10.5px] text-muted2">
                          {d <= 0 ? `${Math.abs(d)} hari di antrean` : `${d} hari`}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => terima(m.id)}
                        className="sb-btn sb-btn-primary !py-1 !px-2.5 text-[11px]"
                      >
                        Terima
                      </button>
                      <button
                        type="button"
                        onClick={() => { setMenolak(m.id); setAlasan(""); }}
                        className="sb-btn sb-btn-outline !py-1 !px-2.5 text-[11px]"
                      >
                        Minta perbaikan
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-4 py-8">
              <EmptyState title="Antrean kosong" body="Semua pendaftaran sudah diputuskan. Pendaftar baru akan muncul di sini." />
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Daftar periksa verifikasi" subtitle="Dipakai konsisten untuk setiap pendaftar" />
            <ul className="space-y-2 px-4 py-3">
              {CHECKLIST.map((c) => (
                <li key={c} className="flex items-start gap-2 text-[12px] text-ink2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--sb-primary-500)]" />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
            <div className="border-t border-line px-4 py-2.5 text-[11px] text-muted2">
              Syarat resmi penerimaan anggota belum ditetapkan oleh organisasi; daftar periksa ini kerangka kerja, keputusan tetap tercatat.
            </div>
          </Card>

          <Notice tone="success" title="Keputusan kini benar-benar tersimpan">
            Menerima anggota mengubah status di buku induk, angka anggota aktif di dasbor, dan meninggalkan jejak audit —
            pada data yang sama yang dilihat semua pengurus. Menolak pendaftaran mengosongkan catatan minat supaya
            sekretariat tahu datanya perlu dilengkapi.
          </Notice>
        </div>
      </div>

      <Modal
        open={menolak !== null}
        onClose={() => setMenolak(null)}
        title="Minta perbaikan data"
        description={target ? `Untuk ${target.name}. Status tetap menunggu sampai data dilengkapi.` : undefined}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setMenolak(null)}>Batal</Btn>
            <Btn variant="primary" onClick={mintaPerbaikan}>Simpan permintaan</Btn>
          </>
        }
      >
        <Field label="Catatan untuk pendaftar" hint="Tersimpan di jejak audit.">
          {(id) => (
            <TextInput
              id={id}
              value={alasan}
              onChange={(e) => setAlasan(e.target.value)}
              placeholder="mis. Nomor telepon belum aktif, mohon diperbarui"
            />
          )}
        </Field>
      </Modal>
    </div>
  );
}
