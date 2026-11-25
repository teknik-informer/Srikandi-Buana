import "server-only";

/**
 * Ringkasan organisasi untuk halaman server.
 *
 * Sebagian halaman laporan dirender di server (mereka membaca buku besar dan
 * tidak butuh ganti-ganti). Halaman seperti itu tidak bisa memakai `useStore`,
 * tetapi tetap harus menampilkan angka yang SAMA dengan yang dilihat pengurus
 * di layar klien. Fungsi ini membaca dokumen bersama dan menjawab pertanyaan
 * kecil yang dibutuhkan laporan.
 *
 * Bila basis data belum diisi, ia jatuh ke benih dari store — sehingga
 * halaman tidak pernah pecah, hanya angkanya kembali ke data awal.
 */
import { readState } from "@/lib/state-store";
import { MEMBERS as SEED_MEMBERS } from "@/data/organization";
import {
  LANDS as SEED_LANDS, ACTIVITIES as SEED_ACTIVITIES,
  PROGRAMS as SEED_PROGRAMS, TASKS as SEED_TASKS, HARVESTS as SEED_HARVESTS,
} from "@/data/operations";
import { PRODUCTS as SEED_PRODUCTS, PARTNERS as SEED_PARTNERS } from "@/data/operations";
import { LETTERS as SEED_LETTERS, DOCUMENTS as SEED_DOCUMENTS } from "@/data/organization";
import { MEETINGS as SEED_MEETINGS } from "@/data/organization";
import { TRAININGS as SEED_TRAININGS } from "@/data/operations";
import type { Member, LandPlot, Activity, Task, Product, Partner, Approval, Letter, DocumentRow, Meeting, Training, MeetingAttendance } from "@/data/types";

export interface OrgSummary {
  members: Member[];
  lands: LandPlot[];
  activities: Activity[];
  programs: typeof SEED_PROGRAMS;
  tasks: Task[];
  harvests: typeof SEED_HARVESTS;
  /**
   * Katalog produk. Per 24 November 2026 belum ada aksi `product.*` di
   * reducer, jadi isinya masih benih — tetapi tetap dibaca dari dokumen
   * bersama supaya katalog publik dan katalog internal tidak pernah
   * berbeda sumber (mis. setelah reset atau setelah impor data).
   */
  products: Product[];
  /**
   * Mitra & kemitraan. Ada aksi partner.create/update/delete di reducer,
   * jadi koleksi ini benar-benar berubah — halaman publik wajib membacanya
   * dari dokumen bersama, bukan dari konstanta.
   */
  partners: Partner[];
  /**
   * Antrean persetujuan pengurus. approval.decide adalah aksi hidup, jadi
   * angka "menunggu" di launcher dan dasbor harus membaca sumber ini.
   */
  approvals: Approval[];
  /**
   * Surat & arsip dokumen. Keduanya punya aksi hidup (letter.register,
   * letter.status, document.create/update/delete), jadi laporan sekretariat
   * tidak boleh menghitung dari konstanta.
   */
  letters: Letter[];
  documents: DocumentRow[];
  /** Rapat & notulen — sejak meeting.create/update/notulen ada, ini hidup. */
  meetings: Meeting[];
  /** Kehadiran per orang per rapat — sejak attendance.tandai ada, ini hidup. */
  meetingAttendance: MeetingAttendance[];
  /** Pelatihan — sejak training.create/update/status ada, ini hidup. */
  trainings: Training[];
  /** true bila angka berasal dari dokumen bersama. */
  shared: boolean;
  updatedBy?: string;
  updatedAt?: string;
}

const SEED: OrgSummary = {
  members: SEED_MEMBERS,
  lands: SEED_LANDS,
  activities: SEED_ACTIVITIES,
  programs: SEED_PROGRAMS,
  tasks: SEED_TASKS,
  harvests: SEED_HARVESTS,
  products: SEED_PRODUCTS,
  partners: SEED_PARTNERS,
  approvals: [],
  letters: SEED_LETTERS,
  documents: SEED_DOCUMENTS,
  meetings: SEED_MEETINGS,
  meetingAttendance: [],
  trainings: SEED_TRAININGS,
  shared: false,
};

export async function orgSummary(): Promise<OrgSummary> {
  try {
    const row = await readState();
    if (!row) return SEED;
    const p = row.payload as Partial<{
      members: Member[]; lands: LandPlot[]; activities: Activity[];
      programs: typeof SEED_PROGRAMS; tasks: Task[]; harvests: typeof SEED_HARVESTS;
      products: Product[]; partners: Partner[]; approvals: Approval[];
      letters: Letter[]; documents: DocumentRow[]; meetings: Meeting[];
      meetingAttendance: MeetingAttendance[];
      trainings: Training[];
    }>;
    return {
      members: Array.isArray(p.members) ? p.members : SEED.members,
      lands: Array.isArray(p.lands) ? p.lands : SEED.lands,
      activities: Array.isArray(p.activities) ? p.activities : SEED.activities,
      // programs/tasks/harvests belum bisa diubah dari meja kerja, tetapi
      // dibaca dari dokumen bersama supaya angka laporan tidak menyimpang
      // setelah aksi yang mengubahnya (mis. program.publish).
      programs: Array.isArray(p.programs) ? p.programs : SEED.programs,
      tasks: Array.isArray(p.tasks) ? p.tasks : SEED.tasks,
      harvests: Array.isArray(p.harvests) ? p.harvests : SEED.harvests,
      products: Array.isArray(p.products) ? p.products : SEED.products,
      partners: Array.isArray(p.partners) ? p.partners : SEED.partners,
      approvals: Array.isArray(p.approvals) ? p.approvals : [],
      letters: Array.isArray(p.letters) ? p.letters : SEED.letters,
      documents: Array.isArray(p.documents) ? p.documents : SEED.documents,
      meetings: Array.isArray(p.meetings) ? p.meetings : SEED.meetings,
      meetingAttendance: Array.isArray(p.meetingAttendance) ? p.meetingAttendance : [],
      trainings: Array.isArray(p.trainings) ? p.trainings : SEED.trainings,
      shared: true,
      updatedBy: row.updatedBy,
      updatedAt: row.updatedAt,
    };
  } catch {
    return SEED;
  }
}

export function hitungAnggota(members: Member[]) {
  return {
    total: members.length,
    aktif: members.filter((m) => m.status === "aktif").length,
    menunggu: members.filter((m) => m.status === "menunggu").length,
    nonaktif: members.filter((m) => m.status === "nonaktif").length,
  };
}

export function hitungLahan(lands: LandPlot[]) {
  const totalHa = lands.reduce((s, l) => s + (Number(l.areaHa) || 0), 0);
  return {
    totalHa,
    jumlah: lands.length,
    produktif: lands.filter((l) => l.status === "produktif").length,
  };
}
