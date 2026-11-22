import Link from "next/link";
import type { FieldDef } from "@/config/fields";
import { TASKS, ACTIVITIES, PROGRAMS, LANDS, HARVESTS, TRAININGS, ATTENDANCE, PRODUCTS, ORDERS, PARTNERS } from "@/data/operations";
import { MEMBERS, DOCUMENTS, APPROVALS } from "@/data/organization";
import { BUDGETS } from "@/data/finance";
import { Badge, Card, CardHeader, EmptyState, Notice, PageHeader, Progress, StatusBadge } from "@/components/ui";
import { formatDateID, formatIDR, relativeID, percent } from "@/lib/format";

const TITLES: Record<string, { title: string; desc: string }> = {
  "profil-mandat": { title: "Profil & Mandat", desc: "Nama resmi, dasar pengesahan, fungsi, ruang lingkup, dan masa berlaku." },
  rencana: { title: "Rencana Kerja", desc: "Rencana periode, target, indikator, kebutuhan sumber daya, dan kalender." },
  kegiatan: { title: "Program & Kegiatan", desc: "Proposal, jadwal, lokasi, peserta, pelaksana, anggaran, hasil, dan evaluasi." },
  tugas: { title: "Tugas & Kolaborasi", desc: "Papan tugas, prioritas, tenggat, komentar, dan aktivitas tim." },
  tim: { title: "Manajemen Tim", desc: "Koordinator, anggota, penugasan, peran, masa tugas, dan histori personel." },
  data: { title: "Data Operasional", desc: "Entitas dan field khusus sesuai mandat bidang." },
  formulir: { title: "Formulir & Pendataan", desc: "Formulir internal/eksternal, validasi, persetujuan, impor, dan ekspor." },
  dokumen: { title: "Dokumen & Bukti", desc: "SOP, surat tugas, foto, berita acara, daftar hadir, dan arsip." },
  anggaran: { title: "Anggaran & Realisasi", desc: "Pengajuan kebutuhan biaya, komitmen, realisasi, dan kelengkapan bukti." },
  laporan: { title: "Laporan & Evaluasi", desc: "Laporan kegiatan, capaian indikator, kendala, dan rekomendasi." },
  pengaturan: { title: "Pengaturan Bidang", desc: "Konfigurasi operasional yang diizinkan; bukan perubahan struktur resmi." },
};

function TableWrap({ head, children, min = 620 }: { head: string[]; children: React.ReactNode; min?: number }) {
  return (
    <div className="sb-scroll">
      <table className="sb-table" style={{ minWidth: min }}>
        <thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function FieldSectionView({ field, section }: { field: FieldDef; section: string }) {
  const meta = TITLES[section] ?? { title: section, desc: "" };
  const code = field.slug;
  const tasks = TASKS.filter((t) => t.bidang === code);
  const programs = PROGRAMS.filter((p) => p.bidang === code);
  const agenda = ACTIVITIES.filter((a) => a.bidang === code);
  const team = MEMBERS.filter((m) => m.field === code);
  const budgets = BUDGETS.filter((b) => b.bidang.includes(field.shortName.split(" & ")[0]));

  return (
    <div className="pb-10">
      <PageHeader eyebrow={field.name} title={meta.title} description={meta.desc} />

      {section === "profil-mandat" && (
        <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <Card>
            <CardHeader title="Identitas resmi bidang" />
            <dl className="divide-y divide-line">
              {[
                ["Nama resmi", field.name],
                ["Kode bidang", field.code],
                ["Field ID permanen", field.fieldId],
                ["Mandat", field.mandate],
                ["Dasar keputusan", `${field.decision.kind}`],
                ["Nomor keputusan", field.decision.number],
                ["Tanggal keputusan", field.decision.date],
                ["Masa berlaku", `${field.period.start} – ${field.period.end}`],
                ["Koordinator", field.coordinator],
                ["Status aplikasi", field.appStatus],
              ].map(([k, v]) => (
                <div key={k} className="grid gap-1 px-4 py-2.5 sm:grid-cols-[180px_1fr]">
                  <dt className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-muted">{k}</dt>
                  <dd className="text-[13px] text-ink2">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="px-4 pb-4">
              <Notice tone="warning" title="Atribut belum tercatat">
                {field.decision.note} {field.coordinatorNote}
              </Notice>
            </div>
          </Card>
          <div className="space-y-4">
            <Card>
              <CardHeader title="Modul domain yang diaktifkan" subtitle={`${field.modules.length} modul`} />
              <div className="flex flex-wrap gap-1.5 p-4">
                {field.modules.map((m) => <span key={m} className="sb-chip !bg-white">{m}</span>)}
              </div>
            </Card>
            <Card>
              <CardHeader title="Paket minimum siklus kerja" />
              <ol className="space-y-2 px-4 py-3 text-[12.5px] text-ink2">
                {[
                  "Mandat & target bidang",
                  "Rencana kerja dan program",
                  "Pengajuan kebutuhan / anggaran",
                  "Persetujuan sesuai kewenangan",
                  "Penugasan tim dan jadwal",
                  "Pelaksanaan, data, dan bukti",
                  "Pemeriksaan koordinator",
                  "Laporan → evaluasi → tindak lanjut",
                ].map((s, i) => (
                  <li key={s} className="flex gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-100 text-[10px] font-bold text-primary-800">{i + 1}</span>
                    {s}
                  </li>
                ))}
              </ol>
            </Card>
          </div>
        </div>
      )}

      {section === "rencana" && (
        <Card>
          <CardHeader title="Rencana & indikator periode berjalan" subtitle="Target operasional bidang — dasar pengajuan anggaran" />
          <div className="divide-y divide-line">
            {programs.map((p) => (
              <div key={p.code} className="px-4 py-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-[13.5px] font-semibold text-ink">{p.name}</div>
                    <div className="text-[11px] text-muted">{p.code} · {p.period}</div>
                  </div>
                  <StatusBadge status={p.status === "berjalan" ? "Berjalan" : p.status} />
                </div>
                <div className="mt-2.5"><Progress value={p.progress} /></div>
                <div className="mt-2.5">
                  <TableWrap head={["Indikator", "Target", "Capaian", "Catatan"]} min={520}>
                    {p.indicators.map((i) => (
                      <tr key={i.label}>
                        <td className="font-medium text-ink">{i.label}</td>
                        <td>{i.target}</td>
                        <td className="font-semibold text-primary-800">{i.actual}</td>
                        <td className="text-muted">—</td>
                      </tr>
                    ))}
                  </TableWrap>
                </div>
              </div>
            ))}
            {programs.length === 0 && <EmptyState title="Rencana belum dibuat" body="Rencana kerja bidang pada periode ini belum disusun." />}
          </div>
        </Card>
      )}

      {section === "kegiatan" && (
        <Card>
          <CardHeader title="Kegiatan bidang" subtitle={`${agenda.length} kegiatan`} action={<Badge tone="neutral">Kalender</Badge>} />
          <div className="divide-y divide-line">
            {agenda.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <div className="text-[13px] font-semibold text-ink">{a.name}</div>
                  <div className="text-[11px] text-muted">{formatDateID(a.date)} · {a.time} · {a.location}</div>
                  <div className="text-[10.5px] text-muted2">PIC {a.person} · {a.participants} peserta · program {a.programCode}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone="neutral">{relativeID(a.date)}</Badge>
                  <StatusBadge status={a.status === "terjadwal" ? "Terjadwal" : a.status === "selesai" ? "Selesai" : a.status} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {section === "tugas" && (
        <div className="grid gap-3 md:grid-cols-3">
          {(["belum", "proses", "selesai"] as const).map((col) => {
            const items = tasks.filter((t) => (col === "selesai" ? t.status === "selesai" : t.status === col || (col === "belum" && t.status === "terlambat")));
            return (
              <Card key={col}>
                <CardHeader
                  title={col === "belum" ? "Belum mulai" : col === "proses" ? "Dikerjakan" : "Selesai"}
                  subtitle={`${items.length} tugas`}
                  action={col === "belum" ? <Badge tone="warning">{tasks.filter((t) => t.status === "terlambat").length} terlambat</Badge> : undefined}
                />
                <ul className="space-y-2 p-2.5">
                  {items.map((t) => (
                    <li key={t.id} className="rounded-sb-sm border border-line bg-white px-3 py-2">
                      <div className="text-[12px] font-medium leading-snug text-ink">{t.title}</div>
                      <div className="mt-1 flex items-center justify-between text-[10.5px] text-muted2">
                        <span>{t.assignee}</span>
                        <span className={t.status === "terlambat" ? "font-semibold text-[var(--sb-danger)]" : ""}>{relativeID(t.due)}</span>
                      </div>
                      <div className="mt-1.5 flex gap-1">
                        <Badge tone={t.priority === "tinggi" ? "danger" : t.priority === "sedang" ? "warning" : "neutral"}>{t.priority}</Badge>
                        {t.programCode && <span className="sb-chip !text-[9.5px]">{t.programCode}</span>}
                      </div>
                    </li>
                  ))}
                  {items.length === 0 && <li className="px-2 py-3 text-[11.5px] text-muted">Tidak ada tugas.</li>}
                </ul>
              </Card>
            );
          })}
        </div>
      )}

      {section === "tim" && (
        <Card>
          <CardHeader title="Tim bidang" subtitle="Peran dan masa tugas tercatat; perubahan tidak menghapus histori" action={<Badge tone="neutral">{team.length + 2} anggota</Badge>} />
          <TableWrap head={["Nama", "Peran", "Cakupan", "Sejak", "Status"]}>
            {(team.length ? team : MEMBERS.slice(0, 4)).map((m) => (
              <tr key={m.id}>
                <td className="font-medium text-ink">{m.name}</td>
                <td>{m.role}</td>
                <td className="text-muted">{m.scope}</td>
                <td className="text-muted">{formatDateID(m.joined, "short")}</td>
                <td><StatusBadge status={m.status === "aktif" ? "Aktif" : m.status} /></td>
              </tr>
            ))}
            <tr>
              <td className="text-muted">(Koordinator)</td>
              <td>Koordinator bidang</td>
              <td className="text-muted">—</td>
              <td className="text-[11.5px] text-[var(--sb-warning)]">Belum tercatat</td>
              <td><Badge tone="warning">Menunggu keputusan</Badge></td>
            </tr>
          </TableWrap>
        </Card>
      )}

      {section === "data" && (
        <div className="space-y-4">
          {code === "pertanian" && (
            <>
              <Card>
                <CardHeader title="Lahan / petak" subtitle={`${LANDS.length} petak · ${LANDS.reduce((s, l) => s + l.areaHa, 0).toFixed(2)} ha`} />
                <TableWrap head={["ID", "Pemilik", "Komoditas", "Luas", "Desa", "Status", "Kunjungan"]}>
                  {LANDS.map((l) => (
                    <tr key={l.id}>
                      <td className="font-mono text-[11.5px] text-muted">{l.id}</td>
                      <td className="font-medium text-ink">{l.owner}</td>
                      <td>{l.commodity}</td>
                      <td>{l.areaHa.toFixed(2)} ha</td>
                      <td className="text-muted">{l.village}</td>
                      <td><StatusBadge status={l.status === "produktif" ? "Produktif" : l.status} /></td>
                      <td className="text-muted">{formatDateID(l.lastVisit, "short")}</td>
                    </tr>
                  ))}
                </TableWrap>
              </Card>
              <Card>
                <CardHeader title="Catatan panen" subtitle={`${HARVESTS.length} catatan · ${HARVESTS.reduce((s, h) => s + h.weightKg, 0).toLocaleString("id-ID")} kg`} />
                <TableWrap head={["Tanggal", "Petak", "Komoditas", "Berat", "Grade", "Harga/kg", "Catatan"]}>
                  {HARVESTS.map((h) => (
                    <tr key={h.id}>
                      <td className="whitespace-nowrap text-muted">{formatDateID(h.date, "short")}</td>
                      <td className="font-mono text-[11.5px] text-muted">{h.plotId}</td>
                      <td className="font-medium text-ink">{h.commodity}</td>
                      <td>{h.weightKg.toLocaleString("id-ID")} kg</td>
                      <td><Badge tone={h.grade === "A" ? "success" : h.grade === "B" ? "warning" : "neutral"}>{h.grade}</Badge></td>
                      <td>{formatIDR(h.pricePerKg)}</td>
                      <td className="text-muted">{h.note ?? "—"}</td>
                    </tr>
                  ))}
                </TableWrap>
              </Card>
            </>
          )}
          {code === "pelatihan" && (
            <>
              <Card>
                <CardHeader title="Rencana & sesi pelatihan" subtitle={`${TRAININGS.length} pelatihan tahun 2026`} />
                <TableWrap head={["Pelatihan", "Kategori", "Tanggal", "Narasumber", "Peserta", "Status"]}>
                  {TRAININGS.map((t) => (
                    <tr key={t.id}>
                      <td className="font-medium text-ink">{t.title}</td>
                      <td>{t.category}</td>
                      <td className="whitespace-nowrap text-muted">{formatDateID(t.date, "short")}</td>
                      <td className="text-muted">{t.trainer}</td>
                      <td>{t.registered}/{t.seats}</td>
                      <td><StatusBadge status={t.status === "selesai" ? "Selesai" : t.status === "dibuka" ? "Dibuka" : "Rencana"} /></td>
                    </tr>
                  ))}
                </TableWrap>
              </Card>
              <Card>
                <CardHeader title="Presensi sesi terakhir" subtitle="PLT-2026-07 · Pengolahan Pascapanen Kopi" />
                <TableWrap head={["Peserta", "Kehadiran", "Catatan"]} min={480}>
                  {ATTENDANCE.slice(0, 6).map((a, i) => (
                    <tr key={i}>
                      <td className="font-medium text-ink">{a.memberName}</td>
                      <td><Badge tone={a.present ? "success" : "danger"}>{a.present ? "Hadir" : "Tidak hadir"}</Badge></td>
                      <td className="text-muted">{a.note ?? "—"}</td>
                    </tr>
                  ))}
                </TableWrap>
              </Card>
            </>
          )}
          {code === "usaha" && (
            <>
              <Card>
                <CardHeader title="Katalog & stok" subtitle={`${PRODUCTS.length} produk · ${PRODUCTS.filter((p) => p.published).length} terpublikasi`} />
                <TableWrap head={["Produk", "Kategori", "Harga", "HPP", "Margin", "Stok", "Publikasi"]}>
                  {PRODUCTS.map((p) => (
                    <tr key={p.id}>
                      <td className="font-medium text-ink">{p.name}</td>
                      <td>{p.category}</td>
                      <td>{formatIDR(p.price)}</td>
                      <td className="text-muted">{formatIDR(p.hpp)}</td>
                      <td className="font-semibold text-primary-800">{percent(p.price - p.hpp, p.price)}%</td>
                      <td>{p.stock}</td>
                      <td><Badge tone={p.published ? "success" : "neutral"}>{p.published ? "Tayang" : "Draf"}</Badge></td>
                    </tr>
                  ))}
                </TableWrap>
              </Card>
              <Card>
                <CardHeader title="Pesanan" subtitle="Terhubung ke POS dan posting service keuangan" />
                <TableWrap head={["ID", "Pelanggan", "Tanggal", "Kanal", "Nilai", "Status", "Jurnal"]}>
                  {ORDERS.map((o) => (
                    <tr key={o.id}>
                      <td className="font-mono text-[11.5px] text-muted">{o.id}</td>
                      <td className="font-medium text-ink">{o.customer}</td>
                      <td className="text-muted">{formatDateID(o.date, "short")}</td>
                      <td className="capitalize">{o.channel}</td>
                      <td>{formatIDR(o.items.reduce((s, i) => s + i.qty * i.price, 0))}</td>
                      <td><StatusBadge status={o.status === "lunas" ? "Lunas" : o.status} /></td>
                      <td className="font-mono text-[11px] text-muted">{o.journalId ?? "—"}</td>
                    </tr>
                  ))}
                </TableWrap>
              </Card>
            </>
          )}
          {code === "organisasi" && (
            <Card>
              <CardHeader title="Buku induk anggota" subtitle="Master data dimiliki layanan Organisasi pusat" />
              <TableWrap head={["ID", "Nama", "Peran", "Cakupan", "Desa", "Bergabung", "Status"]}>
                {MEMBERS.map((m) => (
                  <tr key={m.id}>
                    <td className="font-mono text-[11.5px] text-muted">{m.id}</td>
                    <td className="font-medium text-ink">{m.name}</td>
                    <td>{m.role}</td>
                    <td className="text-muted">{m.scope}</td>
                    <td className="text-muted">{m.village}</td>
                    <td className="whitespace-nowrap text-muted">{formatDateID(m.joined, "short")}</td>
                    <td><StatusBadge status={m.status === "aktif" ? "Aktif" : m.status === "menunggu" ? "Menunggu" : "Nonaktif"} /></td>
                  </tr>
                ))}
              </TableWrap>
            </Card>
          )}
        </div>
      )}

      {section === "formulir" && (
        <div className="grid gap-4 md:grid-cols-2">
          {[
            { name: code === "pertanian" ? "Formulir catatan panen" : code === "pelatihan" ? "Formulir pendaftaran peserta" : code === "usaha" ? "Formulir pesanan baru" : "Formulir usulan anggota", status: "aktif", fields: code === "pertanian" ? 7 : code === "pelatihan" ? 6 : code === "usaha" ? 8 : 5 },
            { name: "Formulir laporan kegiatan", status: "aktif", fields: 9 },
            { name: "Formulir pengajuan anggaran", status: "aktif", fields: 8 },
            { name: "Formulir survei kepuasan", status: "draft", fields: 5 },
          ].map((f) => (
            <Card key={f.name} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[13px] font-semibold text-ink">{f.name}</div>
                  <div className="mt-0.5 text-[11px] text-muted">{f.fields} field · validasi client &amp; server</div>
                </div>
                <Badge tone={f.status === "aktif" ? "success" : "warning"}>{f.status}</Badge>
              </div>
              <div className="mt-2.5 flex flex-wrap gap-1.5 text-[10.5px] text-muted">
                <span className="sb-chip !text-[10px]">wajib: 3</span>
                <span className="sb-chip !text-[10px]">persetujuan: workflow</span>
                <span className="sb-chip !text-[10px]">ekspor: CSV</span>
              </div>
              <div className="mt-3 flex gap-2">
                <button type="button" className="sb-btn sb-btn-outline !py-1.5 !px-3 text-[11.5px]" disabled>Pratinjau</button>
                <button type="button" className="sb-btn sb-btn-ghost !py-1.5 !px-3 text-[11.5px]" disabled>Ubah di Form Builder</button>
              </div>
              <p className="mt-1.5 text-[10px] text-muted2">Kontrol dinonaktifkan pada demo ini untuk menghindari pengumpulan data nyata.</p>
            </Card>
          ))}
        </div>
      )}

      {section === "dokumen" && (
        <Card>
          <CardHeader title="Dokumen & bukti bidang" subtitle="Klasifikasi akses melekat pada setiap dokumen" />
          <TableWrap head={["Nomor", "Judul", "Kategori", "Tanggal", "Pemilik", "Akses", "Status"]}>
            {DOCUMENTS.filter((d) => d.owner.includes("Bidang") || field.name.includes(d.owner.split(" ")[1] ?? "x")).concat(DOCUMENTS.slice(0, 3)).slice(0, 6).map((d) => (
              <tr key={d.id}>
                <td className="font-mono text-[11.5px] text-muted">{d.number}</td>
                <td className="font-medium text-ink">{d.title}</td>
                <td>{d.category}</td>
                <td className="whitespace-nowrap text-muted">{formatDateID(d.date, "short")}</td>
                <td className="text-muted">{d.owner}</td>
                <td><Badge tone={d.visibility === "publik" ? "success" : d.visibility === "internal" ? "info" : "warning"}>{d.visibility}</Badge></td>
                <td><StatusBadge status={d.status === "final" ? "Final" : "Draf"} /></td>
              </tr>
            ))}
          </TableWrap>
        </Card>
      )}

      {section === "anggaran" && (
        <div className="space-y-4">
          <Card>
            <CardHeader title="Usulan & realisasi anggaran bidang" subtitle="Bidang mengajukan; Keuangan yang membukukan" action={<Badge tone="accent">Posting via Keuangan</Badge>} />
            <TableWrap head={["Program", "Akun", "Anggaran", "Komitmen", "Realisasi", "Sisa"]}>
              {(budgets.length ? budgets : BUDGETS.slice(0, 2)).map((b) => {
                const actual = Math.round(b.planned * 0.62);
                return (
                  <tr key={b.id}>
                    <td className="font-medium text-ink">{b.programName}</td>
                    <td className="text-muted">{b.accountCode} · {b.accountName}</td>
                    <td>{formatIDR(b.planned)}</td>
                    <td className="text-muted">—</td>
                    <td>{formatIDR(actual)}</td>
                    <td className="font-semibold text-primary-800">{formatIDR(b.planned - actual)}</td>
                  </tr>
                );
              })}
            </TableWrap>
          </Card>
          <Notice tone="info" title="Pemisahan kewenangan">
            Bidang tidak membuat posting jurnal langsung. Dampak akuntansi tercatat melalui posting
            service Keuangan setelah pengajuan disetujui (Blueprint §8.4 &amp; §16.6).
          </Notice>
          <Card>
            <CardHeader title="Pengajuan terkait bidang" />
            <div className="divide-y divide-line">
              {APPROVALS.filter((a) => a.kind === "anggaran" || a.kind === "kegiatan").map((a) => (
                <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                  <div>
                    <div className="text-[12.5px] font-semibold text-ink">{a.title}</div>
                    <div className="text-[10.5px] text-muted">{a.kind} · diajukan {a.submittedBy} · {formatDateID(a.submittedAt, "short")}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.amount ? <span className="text-[12px] font-semibold text-primary-800">{formatIDR(a.amount)}</span> : null}
                    <StatusBadge status={a.status === "menunggu" ? "Menunggu" : a.status === "disetujui" ? "Disetujui" : a.status} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {section === "laporan" && (
        <div className="space-y-4">
          <Card>
            <CardHeader title="Laporan kegiatan & evaluasi" subtitle="Draft di bidang → pemeriksaan koordinator → pengurus" />
            <div className="divide-y divide-line">
              {programs.map((p) => (
                <div key={p.code} className="px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-[13px] font-semibold text-ink">{p.name}</div>
                    <Badge tone={p.published ? "success" : "neutral"}>{p.published ? "Ringkasan publik tersedia" : "Internal"}</Badge>
                  </div>
                  <div className="mt-1.5 grid gap-2 text-[11.5px] text-muted sm:grid-cols-3">
                    <div>Indikator tercapai: {p.indicators.filter((i) => parseFloat(i.actual.replace(/\D/g, "")) >= parseFloat(i.target.replace(/\D/g, "")) * 0.9).length}/{p.indicators.length}</div>
                    <div>Anggaran terserap: {percent(p.spent, p.budget)}%</div>
                    <div>Status: {p.status}</div>
                  </div>
                  <div className="mt-2"><Progress value={p.progress} /></div>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className="sb-btn sb-btn-outline" disabled>Ekspor laporan (demo)</button>
              <span className="text-[11px] text-muted2">Tombol dinonaktifkan: pembuatan PDF/laporan final berada di luar cakupan demo ini.</span>
            </div>
          </Card>
        </div>
      )}

      {section === "pengaturan" && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader title="Konfigurasi yang diizinkan" subtitle="Untuk koordinator bidang" />
            <ul className="divide-y divide-line text-[12.5px]">
              {[
                ["Nama tampilan aplikasi", "Dapat diubah"],
                ["Menu yang ditampilkan", "Dapat diubah (modul inti wajib tetap ada)"],
                ["Template formulir", "Dapat diubah dalam batas field aman"],
                ["Widget dashboard", "Dapat diubah dari registry widget"],
                ["Notifikasi & pengingat", "Dapat diubah"],
              ].map(([k, v]) => (
                <li key={k} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-ink2">{k}</span>
                  <span className="text-muted">{v}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <CardHeader title="Tidak dapat diubah dari sini" />
            <ul className="divide-y divide-line text-[12.5px]">
              {[
                ["Nama & mandat resmi bidang", "Melalui proses administrasi organisasi"],
                ["Struktur keamanan & role inti", "Developer + pengurus"],
                ["Skema & aturan ledger keuangan", "Domain service Keuangan"],
                ["Aturan persetujuan bernilai besar", "Workflow Builder + persetujuan pengurus"],
              ].map(([k, v]) => (
                <li key={k} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <span className="text-ink2">{k}</span>
                  <Badge tone="warning">{v}</Badge>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}
