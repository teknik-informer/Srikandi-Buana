"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { Btn, DemoStateChip, NoRows, SearchBox, SearchProvider, useSearch } from "@/components/act";
import { Badge, Card, CardHeader, StatCard } from "@/components/ui";
import { formatDateFull, relativeID } from "@/lib/format";

/**
 * Daftar hadir rapat — dulu halaman ini hanya menampilkan "contoh format"
 * dengan nama demo. Sekarang kehadiran dicatat per orang per rapat, dan
 * jumlah hadir pada baris rapat dihitung ulang dari catatan yang sama.
 */
export function PresensiClient() {
  return (
    <SearchProvider>
      <Isi />
    </SearchProvider>
  );
}

function Isi() {
  const { state, dispatch, actor } = useStore();
  const { q } = useSearch();
  const rapat = [...state.meetings].sort((a, b) => b.date.localeCompare(a.date));
  const [pilih, setPilih] = useState<string | null>(rapat[0]?.id ?? null);

  const aktif = useMemo(() => rapat.find((m) => m.id === pilih) ?? null, [rapat, pilih]);

  const kehadiran = useMemo(
    () => state.meetingAttendance.filter((a) => a.meetingId === pilih),
    [state.meetingAttendance, pilih],
  );

  // Anggota aktif yang belum punya baris kehadiran — masih bisa ditandai
  // langsung tanpa harus "isi daftar" lebih dulu.
  const belumTercatat = useMemo(() => {
    const sudah = new Set(kehadiran.map((a) => a.memberId));
    return state.members.filter((m) => m.status === "aktif" && !sudah.has(m.id));
  }, [state.members, kehadiran]);

  const hadir = kehadiran.filter((a) => a.present).length;
  const tercatat = kehadiran.length;
  const totalRapat = rapat.filter((m) => state.meetingAttendance.some((a) => a.meetingId === m.id)).length;
  const totalHadirSemua = state.meetingAttendance.filter((a) => a.present).length;

  const tersaring = useMemo(() => {
    const dasar = kehadiran
      .map((a) => ({ ...a }))
      .sort((a, b) => Number(b.present) - Number(a.present) || a.memberName.localeCompare(b.memberName));
    if (!q.trim()) return dasar;
    const t = q.trim().toLowerCase();
    return dasar.filter((a) => `${a.memberName} ${a.role}`.toLowerCase().includes(t));
  }, [kehadiran, q]);

  const tandai = (memberId: string, present: boolean, note?: string) => {
    if (!pilih) return;
    dispatch({ type: "attendance.tandai", meetingId: pilih, memberId, present, note, actor });
  };

  return (
    <div className="pb-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="sb-label mb-1">Sekretariat</div>
          <h1 className="font-display text-[26px] leading-tight font-semibold text-ink">Daftar hadir rapat</h1>
          <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-muted">
            Kehadiran dicatat per orang. Jumlah hadir pada rapat dihitung ulang dari catatan ini dan
            ikut tampil di notulen serta laporan sekretariat.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DemoStateChip />
          <Link href="/app/sekretariat/rapat" className="sb-btn sb-btn-outline">Rapat</Link>
          <Link href="/app/sekretariat/notulen" className="sb-btn sb-btn-outline">Notulen</Link>
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <StatCard label="Rapat berdaftar hadir" value={totalRapat} note={`dari ${rapat.length} rapat tercatat`} tone="info" />
        <StatCard label="Total kehadiran" value={totalHadirSemua} note="Akumulasi orang-rapat" tone="success" />
        <StatCard
          label="Rapat dipilih"
          value={aktif ? `${hadir}/${tercatat || 0}` : "—"}
          note={aktif ? formatDateFull(aktif.date) : "Belum ada rapat"}
          tone="neutral"
        />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[300px_1fr]">
        <Card className="h-fit">
          <CardHeader title="Pilih rapat" subtitle={`${rapat.length} rapat`} />
          <ul className="max-h-[520px] divide-y divide-line overflow-y-auto">
            {rapat.map((m) => {
              const jumlah = state.meetingAttendance.filter((a) => a.meetingId === m.id && a.present).length;
              const ada = state.meetingAttendance.some((a) => a.meetingId === m.id);
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => setPilih(m.id)}
                    className={`flex w-full flex-col gap-1 px-4 py-3 text-left transition ${
                      pilih === m.id ? "bg-primary-50" : "hover:bg-[#f7faf6]"
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10.5px] text-muted2">{m.id}</span>
                      <span className="text-[10.5px] text-muted2">{relativeID(m.date)}</span>
                    </span>
                    <span className={`text-[12.5px] leading-snug ${pilih === m.id ? "font-semibold text-primary-900" : "font-medium text-ink"}`}>
                      {m.title}
                    </span>
                    <span className="flex items-center gap-1.5">
                      {ada ? (
                        <Badge tone={jumlah > 0 ? "success" : "warning"}>{jumlah} hadir</Badge>
                      ) : (
                        <Badge tone="neutral">belum ada daftar</Badge>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>

        <div className="min-w-0">
          {!aktif ? (
            <Card className="p-6">
              <p className="text-[13px] text-muted">Belum ada rapat yang bisa didaftar hadiri. Catat rapat dulu di halaman Rapat &amp; undangan.</p>
            </Card>
          ) : (
            <Card>
              <CardHeader
                title={aktif.title}
                subtitle={`${formatDateFull(aktif.date)} · ${aktif.type} · ${tercatat} orang tercatat, ${hadir} hadir`}
                action={
                  <div className="flex flex-wrap items-center gap-2">
                    <Btn
                      size="sm"
                      variant="outline"
                      onClick={() => dispatch({ type: "attendance.isi", meetingId: aktif.id, actor })}
                      disabled={belumTercatat.length === 0}
                    >
                      Isi dari buku induk{belumTercatat.length ? ` (${belumTercatat.length})` : ""}
                    </Btn>
                  </div>
                }
              />

              <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2.5">
                <SearchBox placeholder="Cari nama atau jabatan…" />
                <span className="text-[11px] text-muted2">
                  {hadir} hadir · {tercatat - hadir} tidak hadir
                </span>
              </div>

              {tersaring.length === 0 ? (
                <div className="px-4 py-6">
                  <p className="text-[12.5px] text-muted">
                    {tercatat === 0
                      ? "Daftar hadir rapat ini masih kosong. Tekan “Isi dari buku induk” untuk memasukkan semua anggota aktif, lalu tandai yang hadir."
                      : "Tidak ada nama yang cocok dengan pencarian."}
                  </p>
                  {tercatat === 0 ? (
                    <NoRows q={q} />
                  ) : null}
                </div>
              ) : (
                <div className="sb-scroll">
                  <table className="sb-table min-w-[620px]">
                    <thead>
                      <tr>
                        <th>Nama</th>
                        <th>Jabatan</th>
                        <th>Status</th>
                        <th>Catatan</th>
                        <th className="text-right">Tindakan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tersaring.map((a) => (
                        <tr key={a.memberId}>
                          <td className="font-medium text-ink">{a.memberName}</td>
                          <td className="text-muted">{a.role}</td>
                          <td>
                            <Badge tone={a.present ? "success" : "danger"}>{a.present ? "Hadir" : "Tidak hadir"}</Badge>
                          </td>
                          <td className="text-muted">{a.note ?? "—"}</td>
                          <td>
                            <div className="flex flex-wrap items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => tandai(a.memberId, !a.present)}
                                className="text-[11.5px] font-semibold text-primary-800 hover:underline"
                              >
                                {a.present ? "Batalkan hadir" : "Tandai hadir"}
                              </button>
                              <span aria-hidden className="text-line-strong">·</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const isi = window.prompt(`Catatan kehadiran ${a.memberName} (kosongkan untuk menghapus)`, a.note ?? "");
                                  if (isi === null) return;
                                  tandai(a.memberId, a.present, isi);
                                }}
                                className="text-[11.5px] font-semibold text-primary-800 hover:underline"
                              >
                                Catatan
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Anggota aktif yang belum masuk daftar: tandai langsung. */}
              {belumTercatat.length > 0 ? (
                <div className="border-t border-line px-4 py-3">
                  <p className="mb-2 text-[11.5px] font-semibold text-ink2">
                    Anggota aktif yang belum tercatat ({belumTercatat.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {belumTercatat.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => tandai(m.id, true)}
                        className="rounded-full border border-line bg-white px-2.5 py-1 text-[11.5px] font-medium text-ink2 transition hover:border-primary-300 hover:text-primary-800"
                        title="Tandai hadir"
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </Card>
          )}

          <p className="mt-3 text-[11.5px] leading-relaxed text-muted2">
            Catatan: kehadiran di sini adalah rekap digital. Daftar hadir fisik tetap ditandatangani dan
            diarsipkan bersama notulen — sistem tidak menggantikan tanda tangan.
          </p>
        </div>
      </div>
    </div>
  );
}
