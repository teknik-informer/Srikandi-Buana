/**
 * REDUCER MURNI — satu-satunya tempat state operasional berubah.
 *
 * Berkas ini sengaja tidak mengandung React maupun jaringan: klien memakainya
 * untuk memperbarui layar seketika, dan server memakainya untuk menerapkan aksi
 * pada dokumen bersama. Dua-duanya menjalankan kode yang sama, sehingga
 * "yang saya lihat" dan "yang tersimpan" tidak pernah berbeda aturan.
 */

/**
 * SHARED OPERATIONAL STATE — the demo's working memory.
 *
 * Every screen in the demo reads the same store, so an action taken in one app
 * is visible in the others: approving a budget in Pengurus posts a journal in
 * Keuangan, which moves the balances on the Pengurus dashboard and adds credit
 * to the fund in Anggaran. Nothing is pre-rendered per page.
 *
 * PERSISTENSI: dokumen ini kini disimpan di server (v9.app_state) dan dibaca
 * semua perangkat. Fungsi-fungsi di berkas ini murni — tanpa React, tanpa
 * jaringan — sehingga SERVER dapat menerapkan aksi yang sama pada dokumen
 * yang paling baru. Itulah yang mencegah dua pengurus saling menimpa.
 *
 * Invariants carried over from the blueprint:
 *  - posted journals are immutable; corrections are reversal pairs;
 *  - every journal must balance before it can be posted;
 *  - separation of duties: an approval cannot be decided twice, and a decision
 *    records actor + timestamp in the history (audit trail).
 */

import { JOURNALS as SEED_JOURNALS, BANK_STATEMENT as SEED_BANK, BUDGETS as SEED_BUDGETS } from "@/data/finance";
import { LETTERS as SEED_LETTERS, NOTICES as SEED_NOTICES, APPROVALS as SEED_APPROVALS, DOCUMENTS as SEED_DOCUMENTS, MEMBERS as SEED_MEMBERS } from "@/data/organization";
import { MEETINGS as SEED_MEETINGS } from "@/data/organization";
import { TASKS as SEED_TASKS, PRODUCTS as SEED_PRODUCTS, PROGRAMS as SEED_PROGRAMS, TRAININGS as SEED_TRAININGS, INVENTORY as SEED_INVENTORY, LANDS as SEED_LANDS, PARTNERS as SEED_PARTNERS, ACTIVITIES as SEED_ACTIVITIES } from "@/data/operations";
import { COA as COA_CLIENT } from "@/data/coa";
import type { BlockKey } from "@/config/blocks";
import type { JournalEntry, JournalLine, Letter, Notice, Approval, Task, Product, BankStatementRow, InventoryItem, DocumentRow, LandPlot, Partner, Member, Activity, Program, Meeting, Training, MeetingAttendance } from "@/data/types";

export const STORE_VERSION = 7;
export const STORE_KEY = `sb_state_v${STORE_VERSION}`;

export interface AuditEvent {
  id: string;
  at: string;
  actor: string;
  actorRole: string;
  action: string;
  detail: string;
  app: "pengurus" | "keuangan" | "sekretariat" | "pos" | "anggota" | "usaha" | "sistem";
  href?: string;
}

export interface DraftJournal {
  id: string;
  date: string;
  description: string;
  lines: JournalLine[];
  idempotencyKey?: string;
}

/**
 * Site settings — the parts of the public footer (and the credit line) that the
 * organisation should be able to change without a developer. Kept in the same
 * store as everything else so every edit lands in the audit trail, and read by
 * the footer through a tiny subscription (see lib/site-settings.ts).
 */
export interface SiteSettings {
  /**
   * Branding lock-up shown in the footer: a wordmark image **with text**, so it
   * matches the header exactly. Chips below choose among the bundled assets;
   * `brandImage` may also be a data-URL uploaded from the studio.
   */
  brandImage: string;
  /** Shown under the emblem in the footer. */
  creditName: string;
  /** One line under the name — leave empty to hide the line entirely. */
  creditLine: string;
  email: string;
  hours: string;
  /** Footer badges: the blueprint stamp and the demo notice. */
  showBlueprint: boolean;
  showDemoNotice: boolean;
  /** Social links, in the order they appear under the emblem. */
  social: { key: SocialKey; href: string; on: boolean }[];
}

/**
 * Isi halaman publik yang dapat disunting dari Website Studio.
 *
 * MASALAH YANG DIPERBAIKI
 * -----------------------
 * Sebelum ini `src/lib/cms.ts` menyimpan suntingan halaman ke `localStorage`.
 * Akibatnya suntingan hanya berlaku di peramban yang menyunting: pengunjung
 * lain, dan perangkat lain, tetap melihat teks lama. Studio tampak berfungsi
 * tetapi tidak pernah mengubah apa pun yang dilihat orang.
 *
 * Bentuk data di sini sengaja identik dengan yang dipakai `cms.ts` supaya
 * penyunting yang sudah ada tidak perlu ditulis ulang — hanya tempat
 * simpannya yang berpindah, dari peramban ke `v9.app_state`.
 */
export interface CmsBlockFields {
  headline?: string;
  subheadline?: string;
  eyebrow?: string;
  ctaPrimary?: string;
  ctaSecondary?: string;
  hrefPrimary?: string;
  hrefSecondary?: string;
  note?: string;
  limit?: string;
}

export interface CmsBlock {
  uid: string;
  /** Kunci block pada registry `config/blocks.ts`. */
  block: BlockKey;
  fields: CmsBlockFields;
}

export type CmsPageStatus = "published" | "review" | "draft";

export interface CmsPage {
  path: string;
  title: string;
  status: CmsPageStatus;
  blocks: CmsBlock[];
  updatedAt: string;
  updatedBy: string;
}

export type SocialKey = "instagram" | "youtube" | "facebook" | "whatsapp" | "tiktok" | "email";

export const SOCIAL_LABEL: Record<SocialKey, string> = {
  instagram: "Instagram",
  youtube: "YouTube",
  facebook: "Facebook",
  whatsapp: "WhatsApp",
  tiktok: "TikTok",
  email: "Email",
};

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  brandImage: "/brand/wordmark-on-dark.png",
  creditName: "Srikandi Buana",
  creditLine: "Perempuan tani, penggerak kemandirian desa.",
  email: "halo@srikandibuana.org",
  hours: "Senin–Jumat, 08.00–15.00 WIB",
  showBlueprint: true,
  showDemoNotice: true,
  social: [
    { key: "instagram", href: "https://instagram.com/", on: true },
    { key: "youtube", href: "https://youtube.com/", on: true },
    { key: "facebook", href: "https://facebook.com/", on: true },
    { key: "whatsapp", href: "https://wa.me/6281200000000", on: true },
    { key: "tiktok", href: "https://tiktok.com/", on: false },
    { key: "email", href: "mailto:halo@srikandibuana.org", on: false },
  ],
};

export interface State {
  site: SiteSettings;
  /**
   * Halaman publik sebagaimana disunting dari Website Studio. Disimpan di
   * dokumen bersama supaya suntingan terlihat oleh semua pengunjung di semua
   * perangkat — bukan hanya di peramban yang menyunting.
   */
  cmsPages: CmsPage[];
  /**
   * Anggota kini bagian dari state, bukan konstanta statis. Tanpa ini buku
   * induk hanya bisa dibaca; dengan ini sekretariat benar-benar mengelola
   * keanggotaan, dan angka anggota di dasbor/laporan mengikuti.
   */
  members: Member[];
  /** Agenda kegiatan organisasi — sebelumnya data statis di operations.ts. */
  activities: Activity[];
  journals: JournalEntry[];
  letters: Letter[];
  notices: Notice[];
  approvals: Approval[];
  tasks: Task[];
  products: Product[];
  /** Barang/persediaan milik aplikasi Usaha (master data yang bisa di-CRUD). */
  inventories: InventoryItem[];
  /** Master data Sekretariat: arsip dokumen yang bisa di-CRUD. */
  documents: DocumentRow[];
  /** Master data Pertanian: petak lahan yang bisa di-CRUD. */
  lands: LandPlot[];
  /** Master data Usaha: mitra & kemitraan yang bisa di-CRUD. */
  partners: Partner[];
  programs: typeof SEED_PROGRAMS;
  /**
   * Rapat & notulen. Sebelumnya konstanta MEETINGS; kini bagian dari state
   * supaya sekretariat bisa mencatat rapat dan memfinalkan notulen.
   */
  meetings: Meeting[];
  /**
   * Kehadiran per orang per rapat. Sebelumnya daftar hadir hanya "contoh
   * format" (ATTENDANCE_MOCK); kini sekretariat benar-benar menandai hadir.
   */
  meetingAttendance: MeetingAttendance[];
  bank: BankStatementRow[];
  budgets: typeof SEED_BUDGETS;
  trainings: typeof SEED_TRAININGS;
  enrollments: { trainingId: string; memberId: string; at: string }[];
  drafts: DraftJournal[];
  audit: AuditEvent[];
  seq: number;
}

/* ------------------------------------------------------------------ */
/* Actor                                                               */
/* ------------------------------------------------------------------ */

export interface Actor {
  key: string;
  name: string;
  role: string;
  scope: string;
}

/** Deterministic demo clock: the dataset lives on 22 November 2026. */
const DEMO_DAY = "2026-11-22";
const DEMO_NOW = new Date("2026-11-22T09:15:00+07:00");

export function demoNow(): Date {
  return DEMO_NOW;
}

/** Wall-clock stamp in WIB, used for audit rows. */
function stamp(offsetMinutes = 0): string {
  const d = new Date(DEMO_NOW.getTime() + offsetMinutes * 60_000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(
    (d.getUTCHours() + 7) % 24,
  )}:${p(d.getUTCMinutes())}`;
}

export { DEMO_DAY };

/* ------------------------------------------------------------------ */
/* Seed                                                                */
/* ------------------------------------------------------------------ */

export function seedState(): State {
  return {
    site: { ...DEFAULT_SITE_SETTINGS, social: DEFAULT_SITE_SETTINGS.social.map((x) => ({ ...x })) },
    // Kosong berarti "belum pernah disunting": halaman memakai susunan default
    // dari `lib/cms.ts`. Begitu disunting sekali, isinya menimpa default.
    cmsPages: [],
    members: SEED_MEMBERS.map((m) => ({ ...m, interests: [...m.interests] })),
    activities: SEED_ACTIVITIES.map((a) => ({ ...a })),
    journals: SEED_JOURNALS.map((j) => ({ ...j })),
    letters: SEED_LETTERS.map((l) => ({ ...l })),
    notices: SEED_NOTICES.map((n) => ({ ...n })),
    approvals: SEED_APPROVALS.map((a) => ({ ...a, history: [...a.history] })),
    tasks: SEED_TASKS.map((t) => ({ ...t })),
    products: SEED_PRODUCTS.map((p) => ({ ...p })),
    inventories: SEED_INVENTORY.map((i) => ({ ...i })),
    documents: SEED_DOCUMENTS.map((d) => ({ ...d })),
    lands: SEED_LANDS.map((l) => ({ ...l })),
    partners: SEED_PARTNERS.map((p) => ({ ...p })),
    programs: SEED_PROGRAMS.map((p) => ({ ...p })),
    meetings: SEED_MEETINGS.map((m) => ({ ...m })),
    meetingAttendance: [],
    bank: SEED_BANK.map((b) => ({ ...b })),
    budgets: SEED_BUDGETS.map((b) => ({ ...b })),
    trainings: SEED_TRAININGS.map((t) => ({ ...t })),
    enrollments: [],
    drafts: [],
    audit: [
      {
        id: "AUD-0",
        at: "2026-11-22 08:40",
        actor: "Sistem",
        actorRole: "Integrasi",
        action: "Sesi demo dimulai",
        detail: "Data awal 22 November 2026 dimuat. Setiap tindakan Anda dicatat di jejak audit ini.",
        app: "sistem",
      },
    ],
    seq: 100,
  };
}

/* ------------------------------------------------------------------ */
/* Reducer                                                             */
/* ------------------------------------------------------------------ */

export type Action =
  | { type: "hydrate"; state: State }
  | { type: "reset" }
  | { type: "approval.decide"; id: string; decision: "disetujui" | "ditolak" | "revisi"; note: string; actor: Actor }
  | { type: "task.status"; id: string; status: Task["status"]; actor: Actor }
  | { type: "task.assign"; id: string; assignee: string; due: string; actor: Actor }
  | { type: "task.create"; title: string; bidang: string; assignee: string; due: string; priority: Task["priority"]; actor: Actor }
  | { type: "meeting.create"; title: string; date: string; kind: Meeting["type"]; attendees: number; decisions: string[]; actor: Actor }
  | { type: "meeting.update"; id: string; patch: Partial<Pick<Meeting, "title" | "date" | "type" | "attendees" | "decisions" | "notulenStatus">>; actor: Actor }
  | { type: "meeting.notulen"; id: string; status: Meeting["notulenStatus"]; actor: Actor }
  /* Kehadiran per orang pada rapat: satu orang, satu rapat. */
  | { type: "attendance.tandai"; meetingId: string; memberId: string; present: boolean; note?: string; actor: Actor }
  | { type: "attendance.isi"; meetingId: string; actor: Actor }
  | { type: "letter.register"; direction: Letter["direction"]; subject: string; counterpart: string; number: string; assignee: string; actor: Actor }
  | { type: "letter.status"; id: string; status: Letter["status"]; actor: Actor }
  | { type: "journal.draft"; draft: Omit<DraftJournal, "id">; actor: Actor }
  | { type: "journal.post"; id: string; actor: Actor }
  | { type: "journal.discard"; id: string; actor: Actor }
  | { type: "journal.reverse"; id: string; actor: Actor }
  | { type: "pos.sale"; items: { id: string; qty: number }[]; paid: number; receiptNo: string; actor: Actor }
  /* Pengurus mengumumkan sendiri — sebelumnya notifikasi hanya lahir dari
     aksi lain, dan SEED_NOTICES tidak bisa ditambah dari antarmuka. */
  | { type: "notice.broadcast"; title: string; body: string; audience: string; tone: Notice["tone"]; href?: string; actor: Actor }
  | { type: "notice.delete"; id: string; actor: Actor }
  | { type: "notice.read"; id: string }
  | { type: "notice.readAll" }
  | { type: "profile.update"; name: string; village: string; phone: string; interests: string[]; actor: Actor }
  | { type: "site.update"; patch: Partial<Omit<SiteSettings, "social">>; actor: Actor }
  | { type: "site.social"; key: SocialKey; href?: string; on?: boolean; actor: Actor }
  /**
   * Simpan satu halaman publik hasil suntingan Website Studio.
   *
   * Mengapa per-halaman, bukan seluruh koleksi: dua penyunting yang membuka
   * halaman berbeda tidak boleh saling menimpa. Server menerapkan aksi ini di
   * atas dokumen terbaru, jadi hanya halaman yang disebut yang berubah.
   */
  | {
      type: "cms.save";
      page: CmsPage;
      actor: Actor;
    }
  /** Kembalikan satu halaman ke susunan default dari kode. */
  | { type: "cms.reset"; path: string; actor: Actor }
  | { type: "program.publish"; code: string; actor: Actor }
  | { type: "bank.reconcile"; id: string; journalId: string; actor: Actor }
  | { type: "budget.request"; budgetId: string; amount: number; note: string; actor: Actor }
  | { type: "training.enroll"; trainingId: string; actor: Actor }
  /* Bidang Pelatihan mengelola rencana & sesi sendiri: rencana, buka/tutup
     pendaftaran, tandai selesai. Bukan lagi benih statis. */
  | { type: "training.create"; training: Omit<Training, "id" | "registered" | "materials"> & { materials?: string[] }; actor: Actor }
  | { type: "training.update"; id: string; patch: Partial<Omit<Training, "id">>; actor: Actor }
  | { type: "training.status"; id: string; status: Training["status"]; actor: Actor }
  /* Master data Usaha: barang & persediaan — create/update/delete yang tercatat. */
  | { type: "inventory.create"; item: Omit<InventoryItem, "id" | "updatedAt"> & { id?: string }; actor: Actor }
  | { type: "inventory.update"; id: string; patch: Partial<InventoryItem>; actor: Actor }
  | { type: "inventory.delete"; id: string; actor: Actor }
  | { type: "document.create"; row: Omit<DocumentRow, "id">; actor: Actor }
  | { type: "document.update"; id: string; patch: Partial<DocumentRow>; actor: Actor }
  | { type: "document.delete"; id: string; actor: Actor }
  | { type: "land.create"; row: Omit<LandPlot, "id">; actor: Actor }
  | { type: "land.update"; id: string; patch: Partial<LandPlot>; actor: Actor }
  | { type: "land.delete"; id: string; actor: Actor }
  /* Katalog produk — publik melihat harga yang ditulis di sini. */
  | { type: "product.create"; row: Omit<Product, "id" | "slug"> & { slug?: string }; actor: Actor }
  | { type: "product.update"; id: string; patch: Partial<Omit<Product, "id">>; actor: Actor }
  | { type: "product.delete"; id: string; actor: Actor }
  | { type: "partner.create"; row: Omit<Partner, "id">; actor: Actor }
  | { type: "partner.update"; id: string; patch: Partial<Partner>; actor: Actor }
  | { type: "partner.delete"; id: string; actor: Actor }
  /* Keanggotaan — sebelumnya tidak ada aksi sama sekali karena anggota hanya
     konstanta statis. Sekarang sekretariat benar-benar mengelola buku induk. */
  | { type: "member.create"; member: Omit<Member, "id" | "joined" | "interests"> & { interests?: string[] }; actor: Actor }
  | { type: "member.update"; id: string; patch: Partial<Omit<Member, "id">>; actor: Actor }
  | { type: "member.status"; id: string; status: Member["status"]; actor: Actor }
  /* Agenda kegiatan organisasi. */
  | { type: "activity.create"; activity: Omit<Activity, "id">; actor: Actor }
  | { type: "activity.status"; id: string; status: Activity["status"]; actor: Actor }
  /* Program & rencana kerja — sebelumnya hanya bisa dibaca dan diterbitkan. */
  | { type: "program.create"; program: Omit<Program, "code">; actor: Actor }
  | { type: "program.update"; code: string; patch: Partial<Omit<Program, "code">>; actor: Actor }
  | { type: "program.status"; code: string; status: Program["status"]; actor: Actor };

export interface ExecResult {
  ok: boolean;
  message: string;
  href?: string;
  /** Machine-readable side effect, e.g. the journal number a sale produced. */
  detail?: string;
}

/* --- helpers ------------------------------------------------------ */

function linesBalance(lines: JournalLine[]): boolean {
  const d = lines.reduce((s, l) => s + l.debit, 0);
  const c = lines.reduce((s, l) => s + l.credit, 0);
  return d === c && d > 0;
}

function addAudit(s: State, e: Omit<AuditEvent, "id" | "at"> & { at?: string }): AuditEvent[] {
  const entry: AuditEvent = {
    id: `AUD-${s.seq}`,
    at: e.at ?? stamp(),
    actor: e.actor,
    actorRole: e.actorRole,
    action: e.action,
    detail: e.detail,
    app: e.app,
    href: e.href,
  };
  return [entry, ...s.audit].slice(0, 200);
}

/**
 * Never reuse an identifier. `seq` is monotonic, but a prefix such as SR- can
 * collide with seeded rows (SR-101…SR-105), so advance until the id is free.
 */
function uniqueId(prefix: string, start: number, taken: Set<string>): { id: string; n: number } {
  let n = start;
  while (taken.has(`${prefix}-${n}`)) n += 1;
  return { id: `${prefix}-${n}`, n };
}

function fmtIDR(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}

/**
 * Build the posted journal pair for an approved budget. Drilling into a budget
 * line posts to expense (5-1200) against cash (1-1000), tagged with the program
 * so programSpend() picks it up immediately.
 */
export function budgetJournalLines(amount: number, programCode: string, memo: string): JournalLine[] {
  return [
    { accountCode: "5-1200", debit: amount, credit: 0, memo, programCode },
    { accountCode: "1-1000", debit: 0, credit: amount, memo, programCode },
  ];
}

export function applyAction(state: State, action: Action): { state: State; result: ExecResult } {
  const ok = (s: State, message: string, href?: string) => ({ state: s, result: { ok: true, message, href } });
  const fail = (message: string) => ({ state, result: { ok: false, message } });

  switch (action.type) {
    /* ---------------- approvals ---------------- */
    case "approval.decide": {
      const target = state.approvals.find((a) => a.id === action.id);
      if (!target) return fail("Pengajuan tidak ditemukan.");
      if (target.status !== "menunggu" && target.status !== "revisi")
        return fail("Pengajuan ini sudah diputuskan — keputusan bersifat final.");

      const a = action.actor;
      const decisionLabel =
        action.decision === "disetujui" ? "Menyetujui" : action.decision === "ditolak" ? "Menolak" : "Meminta revisi";
      const step = action.decision === "disetujui" ? "Selesai" : action.decision === "ditolak" ? "Ditolak" : "Revisi pemohon";

      const seq = state.seq + 1;
      const approvals = state.approvals.map((row) =>
        row.id !== action.id
          ? row
          : {
              ...row,
              status: action.decision,
              currentStep: step,
              history: [
                ...row.history,
                { actor: `${a.name} (${a.role})`, action: decisionLabel, at: stamp(), note: action.note || undefined },
              ],
            },
      );

      let journals = state.journals;
      let notices = state.notices;
      let postedNumber: string | null = null;
      let auditAction = decisionLabel;
      let detail = `${target.title} — ${action.note || "tanpa catatan"}`;
      let href: string | undefined = "/app/pengurus/persetujuan";

      // Approved budget → the money actually moves: post a balanced journal.
      if (action.decision === "disetujui" && target.amount && target.kind === "anggaran") {
        const programCode = target.title.toLowerCase().includes("sekolah tani")
          ? "PRG-DAYA-01"
          : target.title.toLowerCase().includes("kunjungan")
            ? "PRG-TANI-01"
            : "PRG-ORG-01";
        const number = `JU/2026/11/${String(seq).padStart(4, "0")}`;
        const entry: JournalEntry = {
          id: `JRN-${seq}`,
          number,
          date: DEMO_DAY,
          description: `Realisasi anggaran — ${target.title}`,
          source: "pengadaan",
          sourceRef: target.id,
          status: "diposting",
          createdBy: a.name,
          approvedBy: a.name,
          postedAt: new Date().toISOString(),
          idempotencyKey: `approval-${target.id}-${seq}`,
          lines: budgetJournalLines(target.amount, programCode, `Persetujuan ${target.id}`),
        };
        journals = [entry, ...state.journals];
        postedNumber = number;
        auditAction = "Menyetujui & memposting";
        detail = `${target.title} — ${fmtIDR(target.amount)}. Jurnal ${number} diposting ke Keuangan.`;
        href = "/app/keuangan/jurnal";
        notices = [
          {
            id: `N-${seq}`,
            title: `Jurnal ${number} diposting otomatis`,
            body: `Persetujuan ${target.id} memicu posting ${fmtIDR(target.amount)} oleh ${a.name}.`,
            date: DEMO_DAY,
            audience: "Bendahara",
            read: false,
            href: "/app/keuangan/jurnal",
            tone: "success",
          },
          ...state.notices,
        ];
      }

      const next: State = {
        ...state,
        seq,
        approvals,
        journals,
        notices,
        audit: addAudit(state, {
          actor: a.name,
          actorRole: a.role,
          action: auditAction,
          detail,
          app: "pengurus",
          href,
        }),
      };
      const message = postedNumber
        ? `${target.id} disetujui — jurnal ${postedNumber} (${fmtIDR(target.amount ?? 0)}) diposting ke Keuangan.`
        : `${target.id} ${action.decision}.`;
      return ok(next, message, href);
    }

    /* ---------------- tasks ---------------- */
    case "task.status": {
      const t = state.tasks.find((x) => x.id === action.id);
      if (!t) return fail("Tugas tidak ditemukan.");
      if (t.status === action.status) return fail("Status tidak berubah.");
      const label: Record<Task["status"], string> = {
        belum: "Belum dikerjakan",
        proses: "Sedang dikerjakan",
        selesai: "Selesai",
        terlambat: "Terlambat",
      };
      const next: State = {
        ...state,
        seq: state.seq + 1,
        tasks: state.tasks.map((x) => (x.id === action.id ? { ...x, status: action.status } : x)),
        audit: addAudit(state, {
          actor: action.actor.name,
          actorRole: action.actor.role,
          action: "Mengubah status tugas",
          detail: `${t.title} → ${label[action.status]}`,
          app: "pengurus",
          href: "/app/pengurus/tugas",
        }),
      };
      return ok(next, `Status tugas diperbarui: ${label[action.status]}.`);
    }

    case "task.assign": {
      const t = state.tasks.find((x) => x.id === action.id);
      if (!t) return fail("Tugas tidak ditemukan.");
      const next: State = {
        ...state,
        seq: state.seq + 1,
        tasks: state.tasks.map((x) => (x.id === action.id ? { ...x, assignee: action.assignee, due: action.due } : x)),
        audit: addAudit(state, {
          actor: action.actor.name,
          actorRole: action.actor.role,
          action: "Mendelegasikan tugas",
          detail: `${t.title} → ${action.assignee}, tenggat ${action.due}`,
          app: "pengurus",
          href: "/app/pengurus/tugas",
        }),
      };
      return ok(next, `Ditugaskan ke ${action.assignee}.`);
    }

    case "task.create": {
      if (action.title.trim().length < 4) return fail("Judul tugas minimal 4 karakter.");
      if (!action.due) return fail("Tenggat wajib diisi.");
      const seq = state.seq + 1;
      const task: Task = {
        id: `T-${seq}`,
        title: action.title.trim(),
        bidang: action.bidang,
        assignee: action.assignee,
        due: action.due,
        priority: action.priority,
        status: "belum",
      };
      const next: State = {
        ...state,
        seq,
        tasks: [task, ...state.tasks],
        audit: addAudit(state, {
          actor: action.actor.name,
          actorRole: action.actor.role,
          action: "Membuat tugas",
          detail: `${task.title} → ${task.assignee}`,
          app: "pengurus",
          href: "/app/pengurus/tugas",
        }),
      };
      return ok(next, `Tugas ${task.id} dibuat.`);
    }

    /* ---------------- meetings ---------------- */
    case "meeting.create": {
      if (action.title.trim().length < 4) return fail("Judul rapat minimal 4 karakter.");
      if (!action.date) return fail("Tanggal rapat wajib diisi.");
      if (action.attendees < 0) return fail("Jumlah hadir tidak boleh negatif.");
      const seq = state.seq + 1;
      const bulan = action.date.slice(0, 7);
      // Nomor urut per bulan, dilewati bila bentrok dengan rapat yang sudah ada.
      const dipakai = new Set(state.meetings.map((m) => m.id));
      let nomor = state.meetings.filter((m) => m.date.startsWith(bulan)).length + 1;
      let id = `RT-${bulan}-${String(nomor).padStart(2, "0")}`;
      while (dipakai.has(id)) {
        nomor += 1;
        id = `RT-${bulan}-${String(nomor).padStart(2, "0")}`;
      }
      const rapat: Meeting = {
        id,
        title: action.title.trim(),
        date: action.date,
        type: action.kind,
        attendees: action.attendees,
        decisions: action.decisions.filter((d) => d.trim().length > 0),
        notulenStatus: "draft",
      };
      const next: State = {
        ...state,
        seq,
        meetings: [rapat, ...state.meetings],
        audit: addAudit(state, {
          actor: action.actor.name,
          actorRole: action.actor.role,
          action: "Mencatat rapat",
          detail: `${rapat.title} · ${rapat.date}`,
          app: "sekretariat",
          href: "/app/sekretariat/rapat",
        }),
      };
      return ok(next, `Rapat ${rapat.id} dicatat.`);
    }

    case "meeting.update": {
      const rapat = state.meetings.find((m) => m.id === action.id);
      if (!rapat) return fail("Rapat tidak ditemukan.");
      const patch = action.patch;
      if (patch.title !== undefined && patch.title.trim().length < 4) return fail("Judul rapat minimal 4 karakter.");
      const next: State = {
        ...state,
        meetings: state.meetings.map((m) => (m.id === action.id ? { ...m, ...patch, title: (patch.title ?? m.title).trim() } : m)),
        audit: addAudit(state, {
          actor: action.actor.name,
          actorRole: action.actor.role,
          action: "Mengubah rapat",
          detail: `${action.id}`,
          app: "sekretariat",
          href: "/app/sekretariat/rapat",
        }),
      };
      return ok(next, `Rapat ${action.id} diperbarui.`);
    }

    case "meeting.notulen": {
      const rapat = state.meetings.find((m) => m.id === action.id);
      if (!rapat) return fail("Rapat tidak ditemukan.");
      if (action.status === "final" && rapat.decisions.length === 0)
        return fail("Notulen tidak bisa difinalkan tanpa satu pun keputusan.");
      const next: State = {
        ...state,
        meetings: state.meetings.map((m) => (m.id === action.id ? { ...m, notulenStatus: action.status } : m)),
        audit: addAudit(state, {
          actor: action.actor.name,
          actorRole: action.actor.role,
          action: action.status === "final" ? "Memfinalkan notulen" : "Membuka kembali notulen",
          detail: `${action.id} · ${rapat.title}`,
          app: "sekretariat",
          href: "/app/sekretariat/notulen",
        }),
      };
      return ok(next, action.status === "final" ? "Notulen difinalkan." : "Notulen dibuka kembali sebagai draf.");
    }

    /* ---------------- letters ---------------- */
    case "letter.register": {
      if (action.subject.trim().length < 4) return fail("Perihal minimal 4 karakter.");
      if (action.counterpart.trim().length < 3) return fail("Asal/tujuan surat wajib diisi.");
      const seq = state.seq + 1;
      const { id: letterId } = uniqueId("SR", seq, new Set(state.letters.map((x) => x.id)));
      const letter: Letter = {
        id: letterId,
        direction: action.direction,
        number: action.number.trim() || `—/${action.direction === "masuk" ? "MASUK" : "KELUAR"}/XI/2026`,
        subject: action.subject.trim(),
        counterpart: action.counterpart.trim(),
        date: DEMO_DAY,
        status: "baru",
        assignee: action.assignee,
      };
      const next: State = {
        ...state,
        seq,
        letters: [letter, ...state.letters],
        audit: addAudit(state, {
          actor: action.actor.name,
          actorRole: action.actor.role,
          action: `Meregistrasi surat ${action.direction}`,
          detail: `${letter.number} — ${letter.subject}`,
          app: "sekretariat",
          href: "/app/sekretariat/surat",
        }),
      };
      return ok(next, `Surat ${letter.id} terdaftar.`);
    }

    case "letter.status": {
      const l = state.letters.find((x) => x.id === action.id);
      if (!l) return fail("Surat tidak ditemukan.");
      if (l.status === action.status) return fail("Status tidak berubah.");
      const next: State = {
        ...state,
        seq: state.seq + 1,
        letters: state.letters.map((x) => (x.id === action.id ? { ...x, status: action.status } : x)),
        audit: addAudit(state, {
          actor: action.actor.name,
          actorRole: action.actor.role,
          action: "Memperbarui surat",
          detail: `${l.number} → ${action.status}`,
          app: "sekretariat",
          href: "/app/sekretariat/surat",
        }),
      };
      return ok(next, `Surat ${l.number} → ${action.status}.`);
    }

    /* ---------------- journals ---------------- */
    case "journal.draft": {
      const d = action.draft;
      if (d.description.trim().length < 5) return fail("Keterangan jurnal minimal 5 karakter.");
      const clean = d.lines.filter((l) => l.debit > 0 || l.credit > 0);
      if (clean.length < 2) return fail("Jurnal memerlukan minimal dua baris bernilai.");
      const neg = clean.some((l) => l.debit < 0 || l.credit < 0);
      if (neg) return fail("Nilai negatif tidak diizinkan; gunakan baris lawan.");
      const both = clean.some((l) => l.debit > 0 && l.credit > 0);
      if (both) return fail("Satu baris tidak boleh memiliki debit dan kredit sekaligus.");
      if (!linesBalance(clean)) {
        const dr = clean.reduce((s, l) => s + l.debit, 0);
        const cr = clean.reduce((s, l) => s + l.credit, 0);
        return fail(`Jurnal tidak seimbang: debit ${fmtIDR(dr)} ≠ kredit ${fmtIDR(cr)}.`);
      }
      const seq = state.seq + 1;
      const draft: DraftJournal = { ...d, id: `DRF-${seq}`, lines: clean };
      const next: State = {
        ...state,
        seq,
        drafts: [draft, ...state.drafts],
        audit: addAudit(state, {
          actor: action.actor.name,
          actorRole: action.actor.role,
          action: "Menyimpan draf jurnal",
          detail: `${draft.id} — ${draft.description} (${fmtIDR(clean.reduce((s, l) => s + l.debit, 0))})`,
          app: "keuangan",
          href: "/app/keuangan/jurnal",
        }),
      };
      return ok(next, `Draf ${draft.id} disimpan. Posting untuk menjadikannya final.`);
    }

    case "journal.post": {
      const draft = state.drafts.find((d) => d.id === action.id);
      if (!draft) return fail("Draf tidak ditemukan.");
      if (!linesBalance(draft.lines)) return fail("Draf tidak seimbang — posting ditolak.");
      const seq = state.seq + 1;
      const number = `JU/2026/11/${String(seq).padStart(4, "0")}`;
      const entry: JournalEntry = {
        id: `JRN-${seq}`,
        number,
        date: draft.date || DEMO_DAY,
        description: draft.description,
        source: "penyesuaian",
        status: "diposting",
        createdBy: action.actor.name,
        approvedBy: action.actor.name,
        postedAt: new Date().toISOString(),
        idempotencyKey: draft.idempotencyKey || `manual-${seq}`,
        lines: draft.lines,
      };
      const next: State = {
        ...state,
        seq,
        drafts: state.drafts.filter((d) => d.id !== action.id),
        journals: [entry, ...state.journals],
        audit: addAudit(state, {
          actor: action.actor.name,
          actorRole: action.actor.role,
          action: "Memposting jurnal",
          detail: `${number} — ${entry.description} (${fmtIDR(draft.lines.reduce((s, l) => s + l.debit, 0))})`,
          app: "keuangan",
          href: "/app/keuangan/jurnal",
        }),
      };
      return ok(next, `${number} diposting ${fmtIDR(draft.lines.reduce((s, l) => s + l.debit, 0))}. Saldo langsung berubah.`);
    }

    case "journal.discard": {
      const draft = state.drafts.find((d) => d.id === action.id);
      if (!draft) return fail("Draf tidak ditemukan.");
      const next: State = {
        ...state,
        seq: state.seq + 1,
        drafts: state.drafts.filter((d) => d.id !== action.id),
        audit: addAudit(state, {
          actor: action.actor.name,
          actorRole: action.actor.role,
          action: "Membuang draf jurnal",
          detail: `${draft.id} — ${draft.description}`,
          app: "keuangan",
          href: "/app/keuangan/jurnal",
        }),
      };
      return ok(next, `Draf ${draft.id} dibuang.`);
    }

    case "journal.reverse": {
      const original = state.journals.find((j) => j.id === action.id);
      if (!original) return fail("Jurnal tidak ditemukan.");
      if (original.status !== "diposting") return fail("Hanya jurnal yang diposting dapat dibalik.");
      if (original.reversalOf) return fail("Jurnal pembalik tidak dapat dibalik lagi.");
      const already = state.journals.some((j) => j.reversalOf === original.id);
      if (already) return fail("Jurnal ini sudah memiliki pembalik.");
      const seq = state.seq + 1;
      const number = `JU/2026/11/${String(seq).padStart(4, "0")}`;
      const entry: JournalEntry = {
        id: `JRN-${seq}`,
        number,
        date: DEMO_DAY,
        description: `Pembalik — ${original.description}`,
        source: "penyesuaian",
        status: "diposting",
        createdBy: action.actor.name,
        approvedBy: action.actor.name,
        postedAt: new Date().toISOString(),
        reversalOf: original.id,
        idempotencyKey: `reversal-${original.id}`,
        lines: original.lines.map((l) => ({ ...l, debit: l.credit, credit: l.debit })),
      };
      const next: State = {
        ...state,
        seq,
        journals: [entry, ...state.journals],
        audit: addAudit(state, {
          actor: action.actor.name,
          actorRole: action.actor.role,
          action: "Membalik jurnal",
          detail: `${original.number} dibalik oleh ${number}. Jurnal asli tetap utuh.`,
          app: "keuangan",
          href: "/app/keuangan/jurnal",
        }),
      };
      return ok(next, `${number} diposting sebagai pembalik ${original.number}.`);
    }

    /* ---------------- POS ---------------- */
    case "pos.sale": {
      if (!action.items.length) return fail("Keranjang kosong.");
      const lines = action.items.map((it) => {
        const p = state.products.find((x) => x.id === it.id);
        return { product: p!, qty: it.qty };
      });
      if (lines.some((l) => !l.product)) return fail("Produk tidak ditemukan.");
      for (const l of lines) {
        if (l.qty > l.product.stock) return fail(`Stok ${l.product.name} tidak cukup (tersisa ${l.product.stock}).`);
      }
      const total = lines.reduce((s, l) => s + l.product.price * l.qty, 0);
      const hpp = lines.reduce((s, l) => s + l.product.hpp * l.qty, 0);
      if (action.paid < total) return fail("Uang diterima kurang dari total.");

      const seq = state.seq + 1;
      const number = `JU/2026/11/${String(seq).padStart(4, "0")}`;
      const receiptNo = action.receiptNo;
      const entry: JournalEntry = {
        id: `JRN-${seq}`,
        number,
        date: DEMO_DAY,
        description: `Penjualan POS — ${lines.map((l) => l.product.name).join(", ").slice(0, 60)}`,
        source: "pos",
        sourceRef: receiptNo,
        status: "diposting",
        createdBy: action.actor.name,
        postedAt: new Date().toISOString(),
        idempotencyKey: `pos-${receiptNo}`,
        lines: [
          { accountCode: "1-1000", debit: total, credit: 0, memo: `Kas dari ${receiptNo}` },
          { accountCode: "4-1000", debit: 0, credit: total, memo: "Penjualan produk" },
          { accountCode: "5-1000", debit: hpp, credit: 0, memo: "Harga pokok penjualan" },
          { accountCode: "1-1300", debit: 0, credit: hpp, memo: "Pengurangan persediaan" },
        ],
      };
      const next: State = {
        ...state,
        seq,
        journals: [entry, ...state.journals],
        products: state.products.map((p) => {
          const line = lines.find((l) => l.product.id === p.id);
          return line ? { ...p, stock: p.stock - line.qty } : p;
        }),
        audit: addAudit(state, {
          actor: action.actor.name,
          actorRole: action.actor.role,
          action: "Transaksi POS",
          detail: `${receiptNo} — ${lines.length} item, ${fmtIDR(total)}. Stok berkurang, jurnal ${number} diposting.`,
          app: "pos",
          href: "/app/keuangan/jurnal",
        }),
      };
      return {
        state: next,
        result: {
          ok: true,
          message: `${receiptNo} — ${fmtIDR(total)}. Jurnal ${number} diposting, stok berkurang.`,
          href: "/app/keuangan/jurnal",
          detail: number,
        },
      };
    }

    /* ---------------- master data: barang & persediaan ---------------- */
    case "inventory.create": {
      const seq = state.seq + 1;
      const taken = new Set(state.inventories.map((i) => i.id));
      const prefix = "BRG-";
      const nextId = action.item.id?.trim() || uniqueId(prefix, seq + 100, taken).id;
      if (taken.has(nextId)) return fail(`Kode barang ${nextId} sudah dipakai.`);
      const row: InventoryItem = {
        ...action.item,
        id: nextId,
        updatedAt: DEMO_DAY,
      };
      const next: State = {
        ...state,
        seq,
        inventories: [row, ...state.inventories],
        audit: addAudit(state, {
          actor: action.actor.name,
          actorRole: action.actor.role,
          action: "Menambah barang",
          detail: `${row.id} — ${row.name}, stok ${row.stock} ${row.unit}.`,
          app: "usaha",
          href: "/app/bidang/usaha/data",
        }),
      };
      return ok(next, `Barang ${row.id} ditambahkan.`, "/app/bidang/usaha/data");
    }
    case "inventory.update": {
      const before = state.inventories.find((i) => i.id === action.id);
      if (!before) return fail("Barang tidak ditemukan.");
      const after: InventoryItem = { ...before, ...action.patch, id: before.id, updatedAt: DEMO_DAY };
      const changes: string[] = [];
      for (const k of Object.keys(action.patch) as (keyof InventoryItem)[]) {
        if (k === "id" || k === "updatedAt") continue;
        if (String(before[k]) !== String(after[k])) changes.push(`${k}: ${String(before[k])} → ${String(after[k])}`);
      }
      const next: State = {
        ...state,
        inventories: state.inventories.map((i) => (i.id === action.id ? after : i)),
        audit: addAudit(state, {
          actor: action.actor.name,
          actorRole: action.actor.role,
          action: "Mengubah barang",
          detail: `${after.id} — ${after.name}. ${changes.length ? changes.join("; ") : "Tanpa perubahan nilai."}`,
          app: "usaha",
          href: "/app/bidang/usaha/data",
        }),
      };
      return ok(next, `Barang ${after.id} diperbarui.`);
    }
    case "inventory.delete": {
      const row = state.inventories.find((i) => i.id === action.id);
      if (!row) return fail("Barang tidak ditemukan.");
      const next: State = {
        ...state,
        inventories: state.inventories.filter((i) => i.id !== action.id),
        audit: addAudit(state, {
          actor: action.actor.name,
          actorRole: action.actor.role,
          action: "Menghapus barang",
          detail: `${row.id} — ${row.name} dihapus dari daftar barang.`,
          app: "usaha",
          href: "/app/bidang/usaha/data",
        }),
      };
      return ok(next, `Barang ${row.id} dihapus.`);
    }

    /* ---------------- master data: dokumen, lahan, mitra ---------------- */
    case "document.create": {
      const taken = new Set(state.documents.map((d) => d.id));
      const id = uniqueId("DOC", state.seq + 20, taken).id;
      const row: DocumentRow = { ...action.row, id };
      return ok(
        {
          ...state,
          seq: state.seq + 1,
          documents: [row, ...state.documents],
          audit: addAudit(state, {
            actor: action.actor.name, actorRole: action.actor.role,
            action: "Menambah dokumen",
            detail: `${row.number} — ${row.title} (${row.category}, akses ${row.visibility}).`,
            app: "sekretariat", href: "/app/sekretariat/dokumen",
          }),
        },
        `Dokumen ${row.number} ditambahkan.`,
      );
    }
    case "document.update": {
      const before = state.documents.find((d) => d.id === action.id);
      if (!before) return fail("Dokumen tidak ditemukan.");
      const after = { ...before, ...action.patch, id: before.id };
      return ok(
        {
          ...state,
          documents: state.documents.map((d) => (d.id === action.id ? after : d)),
          audit: addAudit(state, {
            actor: action.actor.name, actorRole: action.actor.role,
            action: "Mengubah dokumen",
            detail: `${after.number} — ${after.title}. Status ${before.status} → ${after.status}, akses ${before.visibility} → ${after.visibility}.`,
            app: "sekretariat", href: "/app/sekretariat/dokumen",
          }),
        },
        `Dokumen ${after.number} diperbarui.`,
      );
    }
    case "document.delete": {
      const row = state.documents.find((d) => d.id === action.id);
      if (!row) return fail("Dokumen tidak ditemukan.");
      return ok(
        {
          ...state,
          documents: state.documents.filter((d) => d.id !== action.id),
          audit: addAudit(state, {
            actor: action.actor.name, actorRole: action.actor.role,
            action: "Menghapus dokumen",
            detail: `${row.number} — ${row.title} dihapus dari arsip aktif.`,
            app: "sekretariat", href: "/app/sekretariat/dokumen",
          }),
        },
        `Dokumen ${row.number} dihapus.`,
      );
    }
    case "land.create": {
      const taken = new Set(state.lands.map((l) => l.id));
      const id = uniqueId("L", state.lands.length + 10, taken).id;
      const row: LandPlot = { ...action.row, id };
      return ok(
        {
          ...state,
          seq: state.seq + 1,
          lands: [row, ...state.lands],
          audit: addAudit(state, {
            actor: action.actor.name, actorRole: action.actor.role,
            action: "Menambah petak lahan",
            detail: `${row.id} — ${row.commodity}, ${row.areaHa} ha, pemilik ${row.owner}.`,
            app: "pengurus", href: "/app/bidang/pertanian/data",
          }),
        },
        `Petak ${row.id} ditambahkan.`,
      );
    }
    case "land.update": {
      const before = state.lands.find((l) => l.id === action.id);
      if (!before) return fail("Petak tidak ditemukan.");
      const after = { ...before, ...action.patch, id: before.id };
      return ok(
        {
          ...state,
          lands: state.lands.map((l) => (l.id === action.id ? after : l)),
          audit: addAudit(state, {
            actor: action.actor.name, actorRole: action.actor.role,
            action: "Mengubah petak lahan",
            detail: `${after.id} — ${after.commodity}. Status ${before.status} → ${after.status}, luas ${before.areaHa} → ${after.areaHa} ha.`,
            app: "pengurus", href: "/app/bidang/pertanian/data",
          }),
        },
        `Petak ${after.id} diperbarui.`,
      );
    }
    case "land.delete": {
      const row = state.lands.find((l) => l.id === action.id);
      if (!row) return fail("Petak tidak ditemukan.");
      return ok(
        {
          ...state,
          lands: state.lands.filter((l) => l.id !== action.id),
          audit: addAudit(state, {
            actor: action.actor.name, actorRole: action.actor.role,
            action: "Menghapus petak lahan",
            detail: `${row.id} — ${row.commodity} (${row.owner}) dihapus dari daftar petak.`,
            app: "pengurus", href: "/app/bidang/pertanian/data",
          }),
        },
        `Petak ${row.id} dihapus.`,
      );
    }
    case "partner.create": {
      const taken = new Set(state.partners.map((p) => p.id));
      const id = uniqueId("MT", state.partners.length + 10, taken).id;
      const row: Partner = { ...action.row, id };
      return ok(
        {
          ...state,
          seq: state.seq + 1,
          partners: [row, ...state.partners],
          audit: addAudit(state, {
            actor: action.actor.name, actorRole: action.actor.role,
            action: "Menambah mitra",
            detail: `${row.id} — ${row.name} (${row.type}), status ${row.status}.`,
            app: "usaha", href: "/app/bidang/usaha/data",
          }),
        },
        `Mitra ${row.id} ditambahkan.`,
      );
    }
    case "partner.update": {
      const before = state.partners.find((p) => p.id === action.id);
      if (!before) return fail("Mitra tidak ditemukan.");
      const after = { ...before, ...action.patch, id: before.id };
      return ok(
        {
          ...state,
          partners: state.partners.map((p) => (p.id === action.id ? after : p)),
          audit: addAudit(state, {
            actor: action.actor.name, actorRole: action.actor.role,
            action: "Mengubah mitra",
            detail: `${after.id} — ${after.name}. Status ${before.status} → ${after.status}.`,
            app: "usaha", href: "/app/bidang/usaha/data",
          }),
        },
        `Mitra ${after.id} diperbarui.`,
      );
    }
    case "partner.delete": {
      const row = state.partners.find((p) => p.id === action.id);
      if (!row) return fail("Mitra tidak ditemukan.");
      return ok(
        {
          ...state,
          partners: state.partners.filter((p) => p.id !== action.id),
          audit: addAudit(state, {
            actor: action.actor.name, actorRole: action.actor.role,
            action: "Menghapus mitra",
            detail: `${row.id} — ${row.name} dihapus dari daftar mitra.`,
            app: "usaha", href: "/app/bidang/usaha/data",
          }),
        },
        `Mitra ${row.id} dihapus.`,
      );
    }

    /* ── Katalog produk ───────────────────────────────────────────── */
    case "product.create": {
      const taken = new Set(state.products.map((p) => p.id));
      const id = uniqueId("PRD", state.products.length + 1, taken).id;
      const slugDasar = action.row.name
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 48) || `produk-${id.toLowerCase()}`;
      const slugTaken = new Set(state.products.map((p) => p.slug));
      let slug = slugDasar;
      let n = 2;
      while (slugTaken.has(slug)) slug = `${slugDasar}-${n++}`;
      const row: Product = { ...action.row, id, slug: action.row.slug?.trim() || slug };
      return ok(
        {
          ...state,
          seq: state.seq + 1,
          products: [row, ...state.products],
          audit: addAudit(state, {
            actor: action.actor.name, actorRole: action.actor.role,
            action: "Menambah produk katalog",
            detail: `${row.id} — ${row.name}, ${fmtIDR(row.price)} per ${row.unit}, ${row.published ? "tayang" : "draf"}.`,
            app: "usaha", href: "/app/bidang/usaha/data",
          }),
        },
        `Produk ${row.name} ditambahkan.`,
      );
    }
    case "product.update": {
      const before = state.products.find((p) => p.id === action.id);
      if (!before) return fail("Produk tidak ditemukan.");
      const after: Product = { ...before, ...action.patch, id: before.id };
      // POS memakai harga & stok dari baris ini; jangan biarkan keduanya
      // menjadi angka yang mustahil.
      if (after.price < 0) return fail("Harga tidak boleh negatif.");
      if (after.stock < 0) return fail("Stok tidak boleh negatif.");
      const beda = [
        before.price !== after.price ? `harga ${fmtIDR(before.price)} → ${fmtIDR(after.price)}` : null,
        before.stock !== after.stock ? `stok ${before.stock} → ${after.stock}` : null,
        before.published !== after.published ? (after.published ? "ditayangkan" : "ditarik ke draf") : null,
      ].filter(Boolean);
      return ok(
        {
          ...state,
          products: state.products.map((p) => (p.id === action.id ? after : p)),
          audit: addAudit(state, {
            actor: action.actor.name, actorRole: action.actor.role,
            action: "Mengubah produk katalog",
            detail: `${after.id} — ${after.name}${beda.length ? ": " + beda.join(", ") : ""}.`,
            app: "usaha", href: "/app/bidang/usaha/data",
          }),
        },
        `Produk ${after.name} diperbarui.`,
      );
    }
    case "product.delete": {
      const row = state.products.find((p) => p.id === action.id);
      if (!row) return fail("Produk tidak ditemukan.");
      return ok(
        {
          ...state,
          products: state.products.filter((p) => p.id !== action.id),
          audit: addAudit(state, {
            actor: action.actor.name, actorRole: action.actor.role,
            action: "Menghapus produk katalog",
            detail: `${row.id} — ${row.name} dihapus dari katalog.`,
            app: "usaha", href: "/app/bidang/usaha/data",
          }),
        },
        `Produk ${row.name} dihapus.`,
      );
    }

    /* ── Keanggotaan ──────────────────────────────────────────────── */
    case "member.create": {
      const m = action.member;
      if (!m.name.trim()) return fail("Nama anggota wajib diisi.");
      const taken = new Set(state.members.map((x) => x.id));
      const { id } = uniqueId("M", state.members.length + 1, taken);
      const row: Member = {
        id,
        name: m.name.trim(),
        role: m.role,
        scope: m.scope,
        field: m.field,
        village: m.village,
        joined: "2026-11-22",
        status: m.status,
        phone: m.phone,
        interests: m.interests ?? [],
      };
      return ok(
        {
          ...state,
          seq: state.seq + 1,
          members: [row, ...state.members],
          audit: addAudit(state, {
            actor: action.actor.name, actorRole: action.actor.role,
            action: "Mendaftarkan anggota",
            detail: `${row.id} — ${row.name}, ${row.village}, status ${row.status}.`,
            app: "sekretariat", href: "/app/sekretariat/anggota",
          }),
        },
        `${row.name} terdaftar sebagai ${row.status}.`,
        "/app/sekretariat/anggota",
      );
    }

    case "member.update": {
      const t = state.members.find((x) => x.id === action.id);
      if (!t) return fail("Anggota tidak ditemukan.");
      return ok(
        {
          ...state,
          seq: state.seq + 1,
          members: state.members.map((x) => (x.id === action.id ? { ...x, ...action.patch } : x)),
          audit: addAudit(state, {
            actor: action.actor.name, actorRole: action.actor.role,
            action: "Memperbarui data anggota",
            detail: `${t.id} — ${t.name}.`,
            app: "sekretariat", href: "/app/sekretariat/anggota",
          }),
        },
        `Data ${t.name} diperbarui.`,
      );
    }

    case "member.status": {
      const t = state.members.find((x) => x.id === action.id);
      if (!t) return fail("Anggota tidak ditemukan.");
      return ok(
        {
          ...state,
          seq: state.seq + 1,
          members: state.members.map((x) => (x.id === action.id ? { ...x, status: action.status } : x)),
          audit: addAudit(state, {
            actor: action.actor.name, actorRole: action.actor.role,
            action: "Mengubah status anggota",
            detail: `${t.id} — ${t.name}: ${t.status} → ${action.status}.`,
            app: "sekretariat", href: "/app/sekretariat/anggota",
          }),
        },
        `${t.name} kini ${action.status}.`,
      );
    }

    /* ── Program ──────────────────────────────────────────────────── */
    case "program.create": {
      const p = action.program;
      if (!p.name.trim()) return fail("Nama program wajib diisi.");
      if (!Number.isFinite(p.budget) || p.budget < 0) return fail("Anggaran tidak boleh negatif.");
      const taken = new Set(state.programs.map((x) => x.code));
      // Kode mengikuti bidang, mis. PRG-USAHA-02 — sama dengan pola data awal.
      const prefix = `PRG-${(p.bidang || "org").slice(0, 5).toUpperCase()}`;
      let n = 1;
      while (taken.has(`${prefix}-${String(n).padStart(2, "0")}`)) n += 1;
      const code = `${prefix}-${String(n).padStart(2, "0")}`;
      const row: Program = { ...p, code };
      return ok(
        {
          ...state,
          seq: state.seq + 1,
          programs: [row, ...state.programs],
          audit: addAudit(state, {
            actor: action.actor.name, actorRole: action.actor.role,
            action: "Membuat program",
            detail: `${code} — ${row.name}, anggaran ${fmtIDR(row.budget)}.`,
            app: "pengurus", href: "/app/pengurus/program",
          }),
        },
        `Program ${code} dibuat.`,
        "/app/pengurus/program",
      );
    }

    case "program.update": {
      const t = state.programs.find((x) => x.code === action.code);
      if (!t) return fail("Program tidak ditemukan.");
      return ok(
        {
          ...state,
          seq: state.seq + 1,
          programs: state.programs.map((x) => (x.code === action.code ? { ...x, ...action.patch } : x)),
          audit: addAudit(state, {
            actor: action.actor.name, actorRole: action.actor.role,
            action: "Memperbarui program",
            detail: `${t.code} — ${t.name}.`,
            app: "pengurus", href: "/app/pengurus/program",
          }),
        },
        `Program ${t.name} diperbarui.`,
      );
    }

    case "program.status": {
      const t = state.programs.find((x) => x.code === action.code);
      if (!t) return fail("Program tidak ditemukan.");
      return ok(
        {
          ...state,
          seq: state.seq + 1,
          programs: state.programs.map((x) => (x.code === action.code ? { ...x, status: action.status } : x)),
          audit: addAudit(state, {
            actor: action.actor.name, actorRole: action.actor.role,
            action: "Mengubah status program",
            detail: `${t.code} — ${t.name}: ${t.status} → ${action.status}.`,
            app: "pengurus", href: "/app/pengurus/program",
          }),
        },
        `${t.name} kini ${action.status}.`,
      );
    }

    /* ── Agenda ───────────────────────────────────────────────────── */
    case "activity.create": {
      const a = action.activity;
      if (!a.name.trim()) return fail("Nama kegiatan wajib diisi.");
      if (!a.date) return fail("Tanggal kegiatan wajib diisi.");
      const taken = new Set(state.activities.map((x) => x.id));
      const { id } = uniqueId("K", state.activities.length + 200, taken);
      const row: Activity = { ...a, id };
      return ok(
        {
          ...state,
          seq: state.seq + 1,
          activities: [...state.activities, row],
          audit: addAudit(state, {
            actor: action.actor.name, actorRole: action.actor.role,
            action: "Menambah agenda",
            detail: `${row.id} — ${row.name}, ${row.date} di ${row.location}.`,
            app: "sekretariat", href: "/app/sekretariat/agenda",
          }),
        },
        `Agenda "${row.name}" dicatat.`,
        "/app/sekretariat/agenda",
      );
    }

    case "activity.status": {
      const t = state.activities.find((x) => x.id === action.id);
      if (!t) return fail("Agenda tidak ditemukan.");
      return ok(
        {
          ...state,
          seq: state.seq + 1,
          activities: state.activities.map((x) => (x.id === action.id ? { ...x, status: action.status } : x)),
          audit: addAudit(state, {
            actor: action.actor.name, actorRole: action.actor.role,
            action: "Mengubah status agenda",
            detail: `${t.id} — ${t.name}: ${action.status}.`,
            app: "sekretariat", href: "/app/sekretariat/agenda",
          }),
        },
        `Agenda ${t.name} ditandai ${action.status}.`,
      );
    }

    /* ---------------- notices ---------------- */
    case "notice.broadcast": {
      const judul = action.title.trim();
      const isi = action.body.trim();
      if (judul.length < 4) return fail("Judul pengumuman minimal 4 huruf.");
      if (isi.length < 8) return fail("Isi pengumuman minimal 8 huruf — beri tahu siapa, apa, dan kapan.");
      const taken = new Set(state.notices.map((n) => n.id));
      let n = state.notices.length + 1;
      while (taken.has(`N-${n}`)) n += 1;
      const row: Notice = {
        id: `N-${n}`,
        title: judul,
        body: isi,
        date: DEMO_DAY,
        audience: action.audience.trim() || "Semua pengurus",
        read: false,
        href: action.href?.trim() || undefined,
        tone: action.tone,
      };
      return ok(
        {
          ...state,
          seq: state.seq + 1,
          notices: [row, ...state.notices],
          audit: addAudit(state, {
            actor: action.actor.name, actorRole: action.actor.role,
            action: "Mengumumkan pemberitahuan",
            detail: `${row.id} — ${row.title} (untuk ${row.audience}).`,
            app: "pengurus", href: "/app/notifikasi",
          }),
        },
        `Pengumuman terkirim ke ${row.audience}.`,
      );
    }
    case "notice.delete": {
      const row = state.notices.find((n) => n.id === action.id);
      if (!row) return fail("Notifikasi tidak ditemukan.");
      return ok(
        {
          ...state,
          notices: state.notices.filter((n) => n.id !== action.id),
          audit: addAudit(state, {
            actor: action.actor.name, actorRole: action.actor.role,
            action: "Menghapus pemberitahuan",
            detail: `${row.id} — ${row.title}.`,
            app: "pengurus", href: "/app/notifikasi",
          }),
        },
        `Notifikasi "${row.title}" dihapus.`,
      );
    }
    case "notice.read": {
      const next: State = {
        ...state,
        notices: state.notices.map((n) => (n.id === action.id ? { ...n, read: true } : n)),
      };
      return ok(next, "Notifikasi ditandai sudah dibaca.");
    }
    case "notice.readAll": {
      const next: State = { ...state, notices: state.notices.map((n) => ({ ...n, read: true })) };
      return ok(next, "Semua notifikasi ditandai sudah dibaca.");
    }

    /* ---------------- site settings ---------------- */
    case "site.update": {
      const next: State = {
        ...state,
        seq: state.seq + 1,
        site: { ...state.site, ...action.patch },
        audit: addAudit(state, {
          actor: action.actor.name,
          actorRole: action.actor.role,
          action: "Memperbarui pengaturan situs",
          detail: Object.keys(action.patch).join(", "),
          app: "sistem",
          href: "/studio/website#pengaturan",
        }),
      };
      return ok(next, "Pengaturan situs tersimpan.");
    }
    case "site.social": {
      const next: State = {
        ...state,
        seq: state.seq + 1,
        site: {
          ...state.site,
          social: state.site.social.map((x) =>
            x.key === action.key ? { ...x, href: action.href ?? x.href, on: action.on ?? x.on } : x,
          ),
        },
        audit: addAudit(state, {
          actor: action.actor.name,
          actorRole: action.actor.role,
          action: "Mengubah tautan sosial",
          detail: `${action.key}${action.on === undefined ? "" : action.on ? " diaktifkan" : " dimatikan"}`,
          app: "sistem",
          href: "/studio/website#pengaturan",
        }),
      };
      return ok(next, "Tautan sosial diperbarui.");
    }

    /* ---------------- halaman publik (CMS) ---------------- */

    case "cms.save": {
      const halaman = action.page;
      if (!halaman || !halaman.path) {
        return fail("Halaman tidak dikenali.");
      }
      const sebelumnya = (state.cmsPages ?? []).find((p) => p.path === halaman.path);
      const daftar = (state.cmsPages ?? []).filter((p) => p.path !== halaman.path);

      // Stempel waktu & penyunting selalu diisi server-side agar jejak audit
      // dan tanggal di halaman publik tidak bergantung pada jam perangkat.
      const tersimpan: CmsPage = {
        ...halaman,
        updatedAt: stamp(),
        updatedBy: action.actor.name,
      };

      const next: State = {
        ...state,
        seq: state.seq + 1,
        cmsPages: [...daftar, tersimpan],
        audit: addAudit(state, {
          actor: action.actor.name,
          actorRole: action.actor.role,
          action: sebelumnya ? "Menyunting halaman publik" : "Menyusun halaman publik",
          detail: `${tersimpan.title} (${tersimpan.path}) — ${tersimpan.blocks.length} block`,
          app: "sistem",
          href: "/studio/website#halaman",
        }),
      };
      return ok(next, `Halaman ${tersimpan.title} tersimpan untuk semua pengunjung.`);
    }

    case "cms.reset": {
      const sebelumnya = (state.cmsPages ?? []).find((p) => p.path === action.path);
      if (!sebelumnya) return fail("Halaman ini memang belum pernah disunting.");
      const next: State = {
        ...state,
        seq: state.seq + 1,
        cmsPages: (state.cmsPages ?? []).filter((p) => p.path !== action.path),
        audit: addAudit(state, {
          actor: action.actor.name,
          actorRole: action.actor.role,
          action: "Mengembalikan halaman ke susunan awal",
          detail: sebelumnya.title,
          app: "sistem",
          href: "/studio/website#halaman",
        }),
      };
      return ok(next, "Halaman dikembalikan ke susunan awal.");
    }

    /* ---------------- member profile ---------------- */
    case "profile.update": {
      if (action.name.trim().length < 3) return fail("Nama minimal 3 karakter.");
      const next: State = {
        ...state,
        seq: state.seq + 1,
        audit: addAudit(state, {
          actor: action.actor.name,
          actorRole: action.actor.role,
          action: "Memperbarui profil",
          detail: `Nama ${action.name}, desa ${action.village}, ${action.interests.length} minat.`,
          app: "anggota",
          href: "/app/anggota/profil",
        }),
      };
      return ok(next, "Profil tersimpan.");
    }

    /* ---------------- programs ---------------- */
    case "program.publish": {
      const p = state.programs.find((x) => x.code === action.code);
      if (!p) return fail("Program tidak ditemukan.");
      const next: State = {
        ...state,
        seq: state.seq + 1,
        programs: state.programs.map((x) => (x.code === action.code ? { ...x, published: !x.published } : x)),
        audit: addAudit(state, {
          actor: action.actor.name,
          actorRole: action.actor.role,
          action: p.published ? "Menarik publikasi program" : "Mempublikasikan program",
          detail: `${p.code} — ${p.name}`,
          app: "pengurus",
          href: "/app/pengurus/program",
        }),
      };
      return ok(next, p.published ? "Program ditarik dari publikasi." : "Program dipublikasikan ke website.");
    }

    /* ---------------- training enrolment ---------------- */
    /* ---------------- presensi rapat ---------------- */
    case "attendance.tandai": {
      const rapat = state.meetings.find((m) => m.id === action.meetingId);
      if (!rapat) return fail("Rapat tidak ditemukan.");
      const anggota = state.members.find((m) => m.id === action.memberId);
      const baris = state.meetingAttendance.find(
        (a) => a.meetingId === action.meetingId && a.memberId === action.memberId,
      );
      if (!baris && !anggota) return fail("Anggota tidak ditemukan di buku induk.");
      const baru: MeetingAttendance = baris
        ? { ...baris, present: action.present, note: action.note?.trim() || baris.note }
        : {
            meetingId: action.meetingId,
            memberId: action.memberId,
            memberName: anggota!.name,
            role: anggota!.role,
            present: action.present,
            note: action.note?.trim() || undefined,
          };
      const lain = state.meetingAttendance.filter(
        (a) => !(a.meetingId === action.meetingId && a.memberId === action.memberId),
      );
      const hadir = [...lain, baru].filter((a) => a.meetingId === action.meetingId && a.present).length;
      return ok(
        {
          ...state,
          meetingAttendance: [...lain, baru],
          // Jumlah hadir di baris rapat dihitung ulang dari kehadiran nyata.
          meetings: state.meetings.map((m) => (m.id === action.meetingId ? { ...m, attendees: hadir } : m)),
          audit: addAudit(state, {
            actor: action.actor.name, actorRole: action.actor.role,
            action: action.present ? "Menandai hadir" : "Menandai tidak hadir",
            detail: `${rapat.id} — ${baru.memberName}${action.present ? " hadir" : " tidak hadir"} (${hadir} hadir).`,
            app: "sekretariat", href: "/app/sekretariat/presensi",
          }),
        },
        `${baru.memberName} ditandai ${action.present ? "hadir" : "tidak hadir"} · ${hadir} hadir.`,
      );
    }
    case "attendance.isi": {
      const rapat = state.meetings.find((m) => m.id === action.meetingId);
      if (!rapat) return fail("Rapat tidak ditemukan.");
      const aktif = state.members.filter((m) => m.status === "aktif");
      if (aktif.length === 0) return fail("Buku induk belum punya anggota aktif.");
      const sudah = new Map(
        state.meetingAttendance.filter((a) => a.meetingId === action.meetingId).map((a) => [a.memberId, a]),
      );
      const tambahan: MeetingAttendance[] = aktif
        .filter((m) => !sudah.has(m.id))
        .map((m) => ({
          meetingId: action.meetingId,
          memberId: m.id,
          memberName: m.name,
          role: m.role,
          present: false,
        }));
      if (tambahan.length === 0) return fail("Semua anggota aktif sudah ada di daftar hadir rapat ini.");
      return ok(
        {
          ...state,
          meetingAttendance: [...state.meetingAttendance, ...tambahan],
          audit: addAudit(state, {
            actor: action.actor.name, actorRole: action.actor.role,
            action: "Menyiapkan daftar hadir",
            detail: `${rapat.id} — ${tambahan.length} anggota aktif ditambahkan sebagai belum hadir.`,
            app: "sekretariat", href: "/app/sekretariat/presensi",
          }),
        },
        `${tambahan.length} anggota aktif masuk daftar hadir ${rapat.id}.`,
      );
    }

    /* ---------------- pelatihan: rencana, buka, tutup ---------------- */
    case "training.create": {
      const tahun = (action.training.date || stamp()).slice(0, 4);
      const taken = new Set(state.trainings.map((t) => t.id));
      // Lanjutkan dari nomor tertinggi tahun itu, bukan dari 01 — supaya
      // pelatihan baru tidak menyelip di depan deret yang sudah berjalan.
      const awal = state.trainings.reduce((maks, t) => {
        const cocok = t.id.match(new RegExp(`^PLT-${tahun}-(\\d+)$`));
        return cocok ? Math.max(maks, Number(cocok[1]) + 1) : maks;
      }, 1);
      let n = awal;
      while (taken.has(`PLT-${tahun}-${String(n).padStart(2, "0")}`)) n += 1;
      const id = `PLT-${tahun}-${String(n).padStart(2, "0")}`;
      const row: Training = {
        ...action.training,
        id,
        registered: 0,
        materials: action.training.materials ?? [],
      };
      return ok(
        {
          ...state,
          seq: state.seq + 1,
          trainings: [row, ...state.trainings],
          audit: addAudit(state, {
            actor: action.actor.name, actorRole: action.actor.role,
            action: "Menyusun rencana pelatihan",
            detail: `${row.id} — ${row.title}, ${row.date}, ${row.seats} kursi.`,
            app: "pengurus", href: "/app/bidang/pelatihan/data",
          }),
        },
        `Pelatihan ${row.id} dibuat sebagai rencana.`,
      );
    }
    case "training.update": {
      const before = state.trainings.find((t) => t.id === action.id);
      if (!before) return fail("Pelatihan tidak ditemukan.");
      const seats = action.patch.seats ?? before.seats;
      if (seats < before.registered)
        return fail(`Kursi tidak boleh kurang dari ${before.registered} pendaftar yang sudah masuk.`);
      const after: Training = { ...before, ...action.patch, id: before.id };
      return ok(
        {
          ...state,
          trainings: state.trainings.map((t) => (t.id === action.id ? after : t)),
          audit: addAudit(state, {
            actor: action.actor.name, actorRole: action.actor.role,
            action: "Memperbarui pelatihan",
            detail: `${after.id} — ${after.title}. ${before.date} → ${after.date}, kursi ${before.seats} → ${after.seats}.`,
            app: "pengurus", href: "/app/bidang/pelatihan/data",
          }),
        },
        `Pelatihan ${after.id} diperbarui.`,
      );
    }
    case "training.status": {
      const t = state.trainings.find((x) => x.id === action.id);
      if (!t) return fail("Pelatihan tidak ditemukan.");
      if (action.status === "dibuka" && t.date < stamp().slice(0, 10))
        return fail("Pelatihan bertanggal lampau tidak bisa dibuka pendaftarannya.");
      const label = (v: Training["status"]) => (v === "dibuka" ? "dibuka" : v === "selesai" ? "selesai" : "rencana");
      return ok(
        {
          ...state,
          trainings: state.trainings.map((x) => (x.id === action.id ? { ...x, status: action.status } : x)),
          audit: addAudit(state, {
            actor: action.actor.name, actorRole: action.actor.role,
            action: "Mengubah status pelatihan",
            detail: `${t.id} — ${t.title}: ${label(t.status)} → ${label(action.status)}.`,
            app: "pengurus", href: "/app/bidang/pelatihan/data",
          }),
        },
        `Status ${t.id} menjadi ${label(action.status)}.`,
      );
    }
    case "training.enroll": {
      const t = state.trainings.find((x) => x.id === action.trainingId);
      if (!t) return fail("Pelatihan tidak ditemukan.");
      if (t.status !== "dibuka") return fail("Pendaftaran pelatihan ini sudah ditutup.");
      const already = state.enrollments.some(
        (e) => e.trainingId === action.trainingId && e.memberId === action.actor.key,
      );
      if (already) return fail("Anda sudah terdaftar pada pelatihan ini.");
      if (t.registered >= t.seats) return fail("Kursi pelatihan ini sudah penuh.");
      const seq = state.seq + 1;
      const next: State = {
        ...state,
        seq,
        trainings: state.trainings.map((x) => (x.id === action.trainingId ? { ...x, registered: x.registered + 1 } : x)),
        enrollments: [...state.enrollments, { trainingId: action.trainingId, memberId: action.actor.key, at: stamp() }],
        notices: [
          {
            id: `N-${seq}`,
            title: `Pendaftaran pelatihan terkirim`,
            body: `${action.actor.name} mendaftar ${t.title}. Bidang Pelatihan akan mengonfirmasi kursi.`,
            date: DEMO_DAY,
            audience: "Bidang Pelatihan",
            read: false,
            href: "/app/anggota/agenda",
            tone: "success",
          },
          ...state.notices,
        ],
        audit: addAudit(state, {
          actor: action.actor.name,
          actorRole: action.actor.role,
          action: "Mendaftar pelatihan",
          detail: `${t.title} — kursi ${t.registered + 1}/${t.seats}`,
          app: "anggota",
          href: "/app/anggota/agenda",
        }),
      };
      return ok(next, `Terdaftar di ${t.title}. Kursi ${t.registered + 1}/${t.seats}.`);
    }

    /* ---------------- budget request ---------------- */
    case "budget.request": {
      const b = state.budgets.find((x) => x.id === action.budgetId);
      if (!b) return fail("Baris anggaran tidak ditemukan.");
      if (action.amount < 10_000) return fail("Nilai pengajuan minimal Rp 10.000.");
      const spend = (code: string) => {
        let t = 0;
        for (const j of state.journals) {
          if (j.status !== "diposting") continue;
          for (const l of j.lines) {
            if (l.programCode === code && l.accountCode.startsWith("5-")) t += l.debit - l.credit;
          }
        }
        return t;
      };
      const planned = state.budgets.filter((x) => x.programCode === b.programCode).reduce((s2, x) => s2 + x.planned, 0);
      const remaining = planned - spend(b.programCode);
      if (action.amount > remaining) return fail(`Melebihi sisa anggaran program (${fmtIDR(Math.max(0, remaining))}).`);

      const seq = state.seq + 1;
      const id = `AP-${seq}`;
      const approval: Approval = {
        id,
        kind: "anggaran",
        title: `Realisasi ${b.programName} — ${b.accountName}`,
        bidang: b.bidang,
        amount: action.amount,
        submittedBy: `${action.actor.name} (${action.actor.role})`,
        submittedAt: DEMO_DAY,
        status: "menunggu",
        currentStep: "Persetujuan Ketua",
        history: [
          {
            actor: `${action.actor.name} (${action.actor.role})`,
            action: "Mengajukan",
            at: stamp(),
            note: action.note || undefined,
          },
        ],
      };
      const next: State = {
        ...state,
        seq,
        approvals: [approval, ...state.approvals],
        notices: [
          {
            id: `N-${seq}`,
            title: `Pengajuan ${id} menunggu persetujuan`,
            body: `${action.actor.name} mengajukan ${fmtIDR(action.amount)} untuk ${b.programName}.`,
            date: DEMO_DAY,
            audience: "Ketua",
            read: false,
            href: "/app/pengurus/persetujuan",
            tone: "warning",
          },
          ...state.notices,
        ],
        audit: addAudit(state, {
          actor: action.actor.name,
          actorRole: action.actor.role,
          action: "Mengajukan realisasi anggaran",
          detail: `${b.programName} — ${fmtIDR(action.amount)}. Menunggu persetujuan Ketua.`,
          app: "keuangan",
          href: "/app/pengurus/persetujuan",
        }),
      };
      return ok(next, `Pengajuan ${id} terkirim ke Kotak Persetujuan Ketua.`, "/app/pengurus/persetujuan");
    }

    /* ---------------- bank reconciliation ---------------- */
    case "bank.reconcile": {
      const row = state.bank.find((b) => b.id === action.id);
      if (!row) return fail("Baris mutasi tidak ditemukan.");
      if (row.status === "cocok") return fail("Baris ini sudah dicocokkan.");
      if (!action.journalId) return fail("Pilih jurnal yang menjadi pasangan mutasi.");
      const j = state.journals.find((x) => x.number === action.journalId || x.id === action.journalId);
      if (!j) return fail("Jurnal tidak ditemukan.");
      const next: State = {
        ...state,
        seq: state.seq + 1,
        bank: state.bank.map((b) => (b.id === action.id ? { ...b, status: "cocok" as const, matchedJournalId: j.number } : b)),
        audit: addAudit(state, {
          actor: action.actor.name,
          actorRole: action.actor.role,
          action: "Mencocokkan mutasi bank",
          detail: `${row.description} ↔ ${j.number}. Exception berkurang; saldo tidak diubah otomatis.`,
          app: "keuangan",
          href: "/app/keuangan/kas-bank",
        }),
      };
      return ok(next, `Mutasi dicocokkan dengan ${j.number}.`);
    }

    default:
      return { state, result: { ok: false, message: "Aksi tidak dikenal." } };
  }
}

