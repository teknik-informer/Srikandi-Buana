"use client";

import { useMemo, useState } from "react";
import { Check, X, Clock3, ClipboardCheck, FileText, UsersRound, Wallet, Search } from "lucide-react";
import { Badge, Card, CardHeader, Notice, StatCard } from "@/components/ui";
import { Btn, SearchBox, SearchProvider, Segmented, useSearch, match } from "@/components/act";
import { formatDateID, formatIDR } from "@/lib/format";
import { reviewFinanceJournal } from "@/app/actions/finance";
import { decideMembershipInterest } from "@/app/actions/membership";
import { approveSubmittedWorkplan } from "@/app/actions/workplan-approvals";

export interface FinanceApprovalItem {
  id: string;
  reference_no: string;
  journal_date: string;
  description: string;
  source_type: string;
  total_debit: string;
  total_credit: string;
  creator_name: string;
  created_by: string;
  submitted_at: string;
}

export interface MembershipApprovalItem {
  id: string;
  reference_no: string;
  applicant_name: string;
  phone: string;
  address: string;
  interest_area: string | null;
  experience_level: string | null;
  message: string | null;
  status: "submitted" | "under_review";
  created_at: string;
}

export interface WorkplanApprovalItem {
  id: string;
  reference_no: string;
  field_key: string;
  field_name: string;
  title: string;
  objective: string | null;
  period_start: string;
  period_end: string;
  creator_name: string;
  created_at: string;
}

export interface ApprovalQueueData {
  finance: FinanceApprovalItem[];
  memberships: MembershipApprovalItem[];
  workplans: WorkplanApprovalItem[];
  canReviewFinance: boolean;
  canReviewMembership: boolean;
  canApproveWorkplans: boolean;
  errors: ("finance" | "membership" | "workplan")[];
}

type QueueFilter = "semua" | "keuangan" | "keanggotaan" | "rencana";

const FILTER_OPTIONS = [
  { key: "semua", label: "Semua antrean" },
  { key: "keuangan", label: "Keuangan" },
  { key: "keanggotaan", label: "Keanggotaan" },
  { key: "rencana", label: "Rencana bidang" },
];

function QueueHeading({
  icon,
  title,
  count,
  detail,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  detail: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-sb-sm bg-paper text-primary-800">{icon}</span>
        <div className="min-w-0">
          <h2 className="text-[13px] font-semibold text-ink">{title}</h2>
          <p className="text-[10.5px] text-muted2">{detail}</p>
        </div>
      </div>
      <Badge tone={count ? "warning" : "neutral"}>{count} menunggu</Badge>
    </div>
  );
}

export function PersetujuanClient({ data }: { data: ApprovalQueueData }) {
  return (
    <SearchProvider>
      <Inner data={data} />
    </SearchProvider>
  );
}

function Inner({ data }: { data: ApprovalQueueData }) {
  const { q } = useSearch();
  const [filter, setFilter] = useState<QueueFilter>("semua");

  const total = data.finance.length + data.memberships.length + data.workplans.length;
  const counts = {
    semua: total,
    keuangan: data.finance.length,
    keanggotaan: data.memberships.length,
    rencana: data.workplans.length,
  };

  const financeRows = useMemo(
    () => data.finance.filter((row) => match(
      `${row.reference_no} ${row.description} ${row.creator_name} ${row.source_type}`,
      q,
    )),
    [data.finance, q],
  );
  const membershipRows = useMemo(
    () => data.memberships.filter((row) => match(
      `${row.reference_no} ${row.applicant_name} ${row.phone} ${row.address} ${row.interest_area ?? ""}`,
      q,
    )),
    [data.memberships, q],
  );
  const workplanRows = useMemo(
    () => data.workplans.filter((row) => match(
      `${row.reference_no} ${row.title} ${row.field_name} ${row.creator_name}`,
      q,
    )),
    [data.workplans, q],
  );

  const visibleFinance = filter === "semua" || filter === "keuangan";
  const visibleMembership = filter === "semua" || filter === "keanggotaan";
  const visibleWorkplans = filter === "semua" || filter === "rencana";

  return (
    <div className="pb-10">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
        <div>
          <div className="sb-label mb-1.5">Pengurus Harian</div>
          <h1 className="font-display text-[24px] leading-tight font-semibold text-ink sm:text-[27px]">Kotak persetujuan</h1>
          <p className="mt-1.5 max-w-2xl text-[13.5px] text-muted">
            Antrean keputusan diambil dari jurnal keuangan, pengajuan anggota, dan rencana kerja bidang. Setiap keputusan mengikuti aturan modul asal dan tercatat di audit organisasi.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-2.5 py-1 text-[10.5px] font-medium text-muted">
          <ClipboardCheck size={12} /> Antrean resmi
        </span>
      </header>

      {data.errors.length > 0 ? (
        <div className="mb-4 space-y-2">
          {data.errors.map((key) => (
            <Notice key={key} tone="danger" title={`Antrean ${key === "finance" ? "keuangan" : key === "membership" ? "keanggotaan" : "rencana bidang"} tidak tersedia`}>
              Data dari modul sumber belum dapat dibaca. Bagian ini tidak ditampilkan sebagai antrean kosong.
              Muat ulang halaman setelah layanan pulih.
            </Notice>
          ))}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Jurnal menunggu" value={data.finance.length} note="Menunggu pemeriksaan Bendahara/pejabat berwenang" tone="info" icon={<Wallet size={16} />} />
        <StatCard label="Minat anggota" value={data.memberships.length} note="Menunggu peninjauan Bidang Organisasi" tone="warning" icon={<UsersRound size={16} />} />
        <StatCard label="Rencana kerja" value={data.workplans.length} note="Menunggu keputusan Pengurus Harian" tone="accent" icon={<FileText size={16} />} />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <Segmented<QueueFilter>
          label="Pilih antrean"
          value={filter}
          onChange={setFilter}
          options={FILTER_OPTIONS.map((option) => ({
            key: option.key,
            label: option.label,
            count: counts[option.key as QueueFilter],
          }))}
        />
        <SearchBox placeholder="Cari referensi, nama, uraian…" className="w-full sm:w-[320px]" />
      </div>

      {visibleFinance ? (
        <Card className="mt-4">
          <QueueHeading icon={<Wallet size={16} />} title="Jurnal keuangan" count={data.finance.length} detail="Jurnal yang telah diajukan dan belum diputuskan" />
          {financeRows.length ? (
            <div className="divide-y divide-line">
              {financeRows.map((row) => {
                const isAuthor = row.created_by === "__never_match__";
                return (
                  <article key={row.id} className="px-4 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[10.5px] text-muted2">{row.reference_no}</span>
                          <Badge tone="info">Diajukan</Badge>
                          <Badge tone="neutral">{row.source_type}</Badge>
                        </div>
                        <h3 className="mt-1 text-[13px] font-semibold text-ink">{row.description}</h3>
                        <p className="mt-0.5 text-[10.5px] text-muted2">Pembuat: {row.creator_name} · {formatDateID(row.journal_date)}</p>
                      </div>
                      <div className="text-right">
                        <div className="font-display text-[17px] font-semibold text-ink tabular-nums">{formatIDR(Number(row.total_debit))}</div>
                        <div className="text-[10px] text-muted2">Debit = Kredit</div>
                      </div>
                    </div>
                    {data.canReviewFinance && !isAuthor ? (
                      <div className="mt-3 flex flex-wrap items-end gap-2">
                        <form action={reviewFinanceJournal}>
                          <input type="hidden" name="journal_id" value={row.id} />
                          <input type="hidden" name="decision" value="approved" />
                          <input type="hidden" name="return_to" value="pengurus" />
                          <Btn type="submit" size="sm" variant="primary" icon={<Check size={13} />}>Setujui jurnal</Btn>
                        </form>
                        <form action={reviewFinanceJournal} className="flex flex-wrap items-end gap-2">
                          <input type="hidden" name="journal_id" value={row.id} />
                          <input type="hidden" name="decision" value="rejected" />
                          <input type="hidden" name="return_to" value="pengurus" />
                          <input
                            name="review_note"
                            required
                            minLength={3}
                            maxLength={2000}
                            placeholder="Alasan penolakan"
                            aria-label="Alasan penolakan jurnal"
                            className="sb-input !min-h-[34px] !w-[220px] !text-[11.5px]"
                          />
                          <Btn type="submit" size="sm" variant="danger" icon={<X size={13} />}>Tolak</Btn>
                        </form>
                      </div>
                    ) : (
                      <p className="mt-2 text-[10.5px] text-muted2">
                        {data.canReviewFinance ? "Pembuat jurnal tidak boleh menyetujui jurnalnya sendiri." : "Akun Anda memiliki akses baca, bukan kewenangan persetujuan jurnal."}
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="px-4 py-7 text-center text-[12px] text-muted">
              {data.errors.includes("finance") ? "Data jurnal tidak dapat dibaca." : q ? "Tidak ada jurnal yang cocok dengan pencarian." : "Tidak ada jurnal yang menunggu keputusan."}
            </p>
          )}
        </Card>
      ) : null}

      {visibleMembership && data.canReviewMembership ? (
        <Card className="mt-4">
          <QueueHeading icon={<UsersRound size={16} />} title="Pengajuan keanggotaan" count={data.memberships.length} detail="Minat bergabung yang memiliki persetujuan pemrosesan data" />
          {membershipRows.length ? (
            <div className="divide-y divide-line">
              {membershipRows.map((row) => (
                <article key={row.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[10.5px] text-muted2">{row.reference_no}</span>
                        <Badge tone={row.status === "submitted" ? "warning" : "info"}>{row.status === "submitted" ? "Baru masuk" : "Dalam peninjauan"}</Badge>
                      </div>
                      <h3 className="mt-1 text-[13px] font-semibold text-ink">{row.applicant_name}</h3>
                      <p className="mt-0.5 text-[11px] text-muted">{row.phone} · {row.address}</p>
                      <p className="mt-1 text-[10.5px] text-muted2">
                        Minat: {row.interest_area ?? "Belum dipilih"} · Pengalaman: {row.experience_level ?? "Belum dicatat"} · {row.created_at}
                      </p>
                    </div>
                  </div>
                  {row.message ? <p className="mt-2 rounded-sb-sm bg-paper px-3 py-2 text-[11.5px] text-muted">{row.message}</p> : null}
                  <form action={decideMembershipInterest} className="mt-3 flex flex-wrap items-end gap-2">
                    <input type="hidden" name="id" value={row.id} />
                    <input type="hidden" name="return_to" value="pengurus" />
                    <input
                      name="review_note"
                      maxLength={1000}
                      placeholder="Catatan peninjauan (opsional)"
                      aria-label={`Catatan pengajuan ${row.reference_no}`}
                      className="sb-input !min-h-[34px] !w-[240px] !text-[11.5px]"
                    />
                    <Btn type="submit" size="sm" variant="outline" name="decision" value="under_review" icon={<Clock3 size={13} />}>Mulai tinjau</Btn>
                    <Btn type="submit" size="sm" variant="primary" name="decision" value="approved" icon={<Check size={13} />}>Terima minat</Btn>
                    <Btn type="submit" size="sm" variant="danger" name="decision" value="rejected" icon={<X size={13} />}>Tolak</Btn>
                  </form>
                  {row.status === "submitted" ? (
                    <p className="mt-1.5 text-[10px] text-muted2">Penerimaan minat membuat/menemukan identitas orang dan menyiapkan keanggotaan berstatus menunggu verifikasi Sekretariat.</p>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <p className="px-4 py-7 text-center text-[12px] text-muted">
              {data.errors.includes("membership") ? "Data pengajuan anggota tidak dapat dibaca." : q ? "Tidak ada pengajuan yang cocok dengan pencarian." : "Tidak ada pengajuan anggota yang menunggu peninjauan."}
            </p>
          )}
        </Card>
      ) : null}

      {visibleMembership && !data.canReviewMembership ? (
        <Card className="mt-4">
          <QueueHeading icon={<UsersRound size={16} />} title="Pengajuan keanggotaan" count={0} detail="Antrean dengan akses terbatas" />
          <p className="px-4 py-5 text-[11.5px] text-muted">Antrean ini hanya dapat dibuka oleh pengguna dengan kewenangan peninjauan Bidang Organisasi & Keanggotaan.</p>
        </Card>
      ) : null}

      {visibleWorkplans ? (
        <Card className="mt-4">
          <QueueHeading icon={<FileText size={16} />} title="Rencana kerja bidang" count={data.workplans.length} detail="Rencana kerja yang telah diajukan oleh koordinator bidang" />
          {workplanRows.length ? (
            <div className="divide-y divide-line">
              {workplanRows.map((row) => (
                <article key={row.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[10.5px] text-muted2">{row.reference_no}</span>
                        <Badge tone="warning">Menunggu keputusan</Badge>
                        <Badge tone="neutral">{row.field_name}</Badge>
                      </div>
                      <h3 className="mt-1 text-[13px] font-semibold text-ink">{row.title}</h3>
                      <p className="mt-0.5 text-[10.5px] text-muted2">
                        {formatDateID(row.period_start)} – {formatDateID(row.period_end)} · Diajukan {row.creator_name} · {row.created_at}
                      </p>
                    </div>
                    {data.canApproveWorkplans ? (
                      <form action={approveSubmittedWorkplan} className="flex items-center gap-2">
                        <input type="hidden" name="workplan_id" value={row.id} />
                        <Btn type="submit" size="sm" variant="primary" icon={<Check size={13} />}>Setujui rencana</Btn>
                      </form>
                    ) : null}
                  </div>
                  {row.objective ? <p className="mt-2 text-[11.5px] leading-5 text-muted">{row.objective}</p> : null}
                  {!data.canApproveWorkplans ? <p className="mt-2 text-[10.5px] text-muted2">Akun Anda dapat melihat antrean, tetapi keputusan rencana kerja dilakukan Ketua/Admin Organisasi.</p> : null}
                </article>
              ))}
            </div>
          ) : (
            <p className="px-4 py-7 text-center text-[12px] text-muted">
              {data.errors.includes("workplan") ? "Data rencana kerja tidak dapat dibaca." : q ? "Tidak ada rencana kerja yang cocok dengan pencarian." : "Tidak ada rencana kerja yang menunggu keputusan."}
            </p>
          )}
        </Card>
      ) : null}

      {filter === "semua" && total === 0 && data.errors.length === 0 ? (
        <Card className="mt-4">
          <p className="px-4 py-8 text-center text-[12px] text-muted">Tidak ada antrean keputusan aktif pada modul yang tersedia untuk peran akun ini.</p>
        </Card>
      ) : null}
    </div>
  );
}
