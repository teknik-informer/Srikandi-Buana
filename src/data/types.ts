/** Domain types for the Srikandi Buana V9.1 demo dataset. */

export type AccountType = "aset" | "kewajiban" | "ekuitas" | "pendapatan" | "beban";

export interface Account {
  code: string;
  name: string;
  type: AccountType;
  normal: "debit" | "kredit";
  group: string;
  protected?: boolean;
  note?: string;
}

export interface JournalLine {
  accountCode: string;
  debit: number;
  credit: number;
  memo?: string;
  programCode?: string;
  fundCode?: string;
}

export type JournalStatus = "draft" | "menunggu" | "disetujui" | "diposting" | "dibatalkan";

export interface JournalEntry {
  id: string;
  number: string;
  date: string;
  description: string;
  source: "kas" | "bank" | "pos" | "pengadaan" | "hibah" | "kontribusi" | "pelatihan" | "penyesuaian";
  sourceRef?: string;
  status: JournalStatus;
  lines: JournalLine[];
  createdBy: string;
  approvedBy?: string;
  postedAt?: string;
  reversalOf?: string;
  idempotencyKey: string;
}

export interface BudgetLine {
  id: string;
  programCode: string;
  programName: string;
  bidang: string;
  accountCode: string;
  accountName: string;
  planned: number;
  note?: string;
}

export interface BankStatementRow {
  id: string;
  date: string;
  description: string;
  debit: number; // money in
  credit: number; // money out
  matchedJournalId?: string;
  status: "cocok" | "belum" | "selisih";
}

export interface Fund {
  code: string;
  name: string;
  source: "internal" | "hibah" | "pemerintah" | "mitra";
  restriction: string;
  received: number;
  used: number;
  status: "aktif" | "selesai";
}

export interface Member {
  id: string;
  name: string;
  role: string;
  scope: string;
  field?: string;
  village: string;
  joined: string;
  status: "aktif" | "nonaktif" | "menunggu";
  phone: string;
  interests: string[];
  login?: string;
}

export interface Program {
  code: string;
  name: string;
  bidang: string;
  objective: string;
  period: string;
  status: "perencanaan" | "berjalan" | "selesai" | "ditangguhkan";
  progress: number;
  budget: number;
  spent: number;
  indicators: { label: string; target: string; actual: string }[];
  published: boolean;
}

export interface Activity {
  id: string;
  name: string;
  programCode: string;
  bidang: string;
  date: string;
  time: string;
  location: string;
  participants: number;
  status: "terjadwal" | "berjalan" | "selesai" | "dibatalkan";
  openToPublic: boolean;
  person: string;
}

export interface Task {
  id: string;
  title: string;
  bidang: string;
  assignee: string;
  due: string;
  priority: "tinggi" | "sedang" | "rendah";
  status: "belum" | "proses" | "selesai" | "terlambat";
  programCode?: string;
}

export interface Approval {
  id: string;
  kind: "anggaran" | "kegiatan" | "pembayaran" | "dokumen" | "keanggotaan";
  title: string;
  bidang: string;
  amount?: number;
  submittedBy: string;
  submittedAt: string;
  status: "menunggu" | "disetujui" | "ditolak" | "revisi";
  currentStep: string;
  history: { actor: string; action: string; at: string; note?: string }[];
}

export interface NewsPost {
  slug: string;
  title: string;
  kind: "berita" | "artikel" | "pengumuman";
  excerpt: string;
  body: string[];
  author: string;
  date: string;
  status: "draft" | "review" | "published";
  tags: string[];
  image: string;
  featured?: boolean;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  stock: number;
  producer: string;
  story: string;
  published: boolean;
  image: string;
  hpp: number;
}

export interface Partner {
  id: string;
  name: string;
  type: "pemerintah" | "ngo" | "usaha" | "koperasi" | "akademik";
  contact: string;
  status: "aktif" | "penjajakan" | "selesai";
  since: string;
  milestone: string;
}

export interface Order {
  id: string;
  customer: string;
  date: string;
  items: { productId: string; qty: number; price: number }[];
  status: "baru" | "diproses" | "dikirim" | "lunas" | "batal";
  channel: "pos" | "whatsapp" | "mitra";
  journalId?: string;
}

export interface LandPlot {
  id: string;
  owner: string;
  areaHa: number;
  commodity: string;
  village: string;
  status: "produktif" | "persiapan" | "istirahat";
  plantedAt: string;
  lastVisit: string;
  notes: string;
}

export interface Harvest {
  id: string;
  date: string
  plotId: string;
  commodity: string;
  weightKg: number;
  grade: "A" | "B" | "C";
  pricePerKg: number;
  field: string;
  note?: string;
}

export interface Training {
  id: string;
  title: string;
  category: string;
  date: string;
  trainer: string;
  location: string;
  seats: number;
  registered: number;
  status: "rencana" | "dibuka" | "selesai";
  materials: string[];
  preScore?: number;
  postScore?: number;
}

export interface AttendanceRow {
  trainingId: string;
  memberName: string;
  present: boolean;
  note?: string;
}

export interface DocumentRow {
  id: string;
  number: string;
  title: string;
  category: "SK" | "Laporan" | "SOP" | "Surat" | "Notulen" | "Publikasi";
  date: string;
  owner: string;
  visibility: "publik" | "internal" | "terbatas";
  status: "final" | "draft" | "arsip";
}

export interface Letter {
  id: string;
  direction: "masuk" | "keluar";
  number: string;
  subject: string;
  counterpart: string;
  date: string;
  status: "baru" | "diproses" | "selesai";
  assignee: string;
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  type: "rapat pengurus" | "rapat bidang" | "rapat anggota";
  attendees: number;
  decisions: string[];
  notulenStatus: "draft" | "final";
}

export interface Notice {
  id: string;
  title: string;
  body: string;
  date: string;
  audience: string;
  read: boolean;
  href?: string;
  tone: "info" | "success" | "warning" | "danger";
}

export interface StudioPage {
  path: string;
  title: string;
  status: "draft" | "review" | "published";
  updatedAt: string;
  updatedBy: string;
  blocks: number;
  revisions: number;
}
