/** Organisation, membership and secretariat demo data. */

import type { Member, Meeting, Letter, DocumentRow, Notice, Approval } from "./types";

export const MEMBERS: Member[] = [
  { id: "M-001", name: "Sri Wulandari", role: "Ketua", scope: "Pengurus Harian", village: "Ngadimulyo", joined: "2016-03-12", status: "aktif", phone: "0812-0000-0101", interests: ["Kepemimpinan", "Kopi"], login: "ketua@demo.srikandibuana" },
  { id: "M-002", name: "Endang Puspitasari", role: "Sekretaris", scope: "Sekretariat", village: "Ngadimulyo", joined: "2016-03-12", status: "aktif", phone: "0812-0000-0102", interests: ["Administrasi", "Arsip"], login: "sekretaris@demo.srikandibuana" },
  { id: "M-003", name: "Titik Handayani", role: "Bendahara", scope: "Keuangan", village: "Ngadimulyo", joined: "2017-01-20", status: "aktif", phone: "0812-0000-0103", interests: ["Akuntansi", "Usaha"], login: "bendahara@demo.srikandibuana" },
  { id: "M-004", name: "Warsiti", role: "Anggota Bidang Pertanian", scope: "Bidang Pertanian & Produksi", field: "pertanian", village: "Ngadimulyo", joined: "2018-05-02", status: "aktif", phone: "0812-0000-0104", interests: ["Budidaya kopi", "Pascapanen"], login: "pertanian@demo.srikandibuana" },
  { id: "M-005", name: "Rukmini", role: "Anggota Bidang Pelatihan", scope: "Bidang Pemberdayaan & Pelatihan", field: "pelatihan", village: "Kedu", joined: "2019-02-11", status: "aktif", phone: "0812-0000-0105", interests: ["Pelatihan", "Motivator"], login: "pelatihan@demo.srikandibuana" },
  { id: "M-006", name: "Dwi Lestari", role: "Anggota Bidang Usaha", scope: "Bidang Usaha & Kemitraan", field: "usaha", village: "Ngadimulyo", joined: "2019-08-23", status: "aktif", phone: "0812-0000-0106", interests: ["Pemasaran", "Kemasan"], login: "usaha@demo.srikandibuana" },
  { id: "M-007", name: "Suyati", role: "Kasir POS", scope: "Penjualan", village: "Ngadimulyo", joined: "2020-06-30", status: "aktif", phone: "0812-0000-0107", interests: ["Kasir", "Layanan pelanggan"], login: "kasir@demo.srikandibuana" },
  { id: "M-008", name: "Parmi", role: "Anggota", scope: "Portal Anggota", village: "Ngadimulyo", joined: "2021-11-05", status: "aktif", phone: "0812-0000-0108", interests: ["Kebun sayur", "Kaderisasi"], login: "anggota@demo.srikandibuana" },
  { id: "M-009", name: "Suprapti", role: "Anggota", scope: "Portal Anggota", village: "Kedu", joined: "2022-03-17", status: "aktif", phone: "0812-0000-0109", interests: ["Madu", "Kemasan"] },
  { id: "M-010", name: "Ngatinem", role: "Anggota", scope: "Portal Anggota", village: "Ngadimulyo", joined: "2023-07-09", status: "aktif", phone: "0812-0000-0110", interests: ["Beras organik"] },
  { id: "M-011", name: "Siti Aminah", role: "Calon Anggota", scope: "—", village: "Kedu", joined: "2026-10-28", status: "menunggu", phone: "0812-0000-0111", interests: ["Ingin belajar kopi"] },
  { id: "M-012", name: "Kasiyem", role: "Anggota (nonaktif)", scope: "—", village: "Ngadimulyo", joined: "2017-04-04", status: "nonaktif", phone: "0812-0000-0112", interests: ["Pangan"] },
];

export const MEETINGS: Meeting[] = [
  {
    id: "RT-2026-11",
    title: "Rapat Pengurus Harian — Evaluasi November",
    date: "2026-11-18",
    type: "rapat pengurus",
    attendees: 9,
    decisions: [
      "Menetapkan jadwal Sekolah Tani edisi Desember pada 6 dan 13 Desember 2026.",
      "Menunda pembelian mesin sangrai sampai hasil reviu anggaran selesai.",
      "Meminta bidang usaha menyiapkan usulan kemasan baru sebelum rapat berikutnya.",
    ],
    notulenStatus: "final",
  },
  {
    id: "RT-2026-12",
    title: "Rapat Koordinasi Bidang — Persiapan Desember",
    date: "2026-11-25",
    type: "rapat bidang",
    attendees: 0,
    decisions: [],
    notulenStatus: "draft",
  },
  {
    id: "RT-2026-10",
    title: "Rapat Anggota Triwulan IV",
    date: "2026-10-14",
    type: "rapat anggota",
    attendees: 84,
    decisions: [
      "Menyetujui laporan realisasi anggaran triwulan III.",
      "Menerima pengunduran diri satu anggota karena pindah domisili.",
    ],
    notulenStatus: "final",
  },
];

export const LETTERS: Letter[] = [
  { id: "SR-101", direction: "masuk", number: "12/KWT/XI/2026", subject: "Undangan pendampingan dari Dinas Pertanian", counterpart: "Dinas Pertanian Kab. Temanggung", date: "2026-11-19", status: "diproses", assignee: "Sekretaris" },
  { id: "SR-102", direction: "masuk", number: "47/MKR/XI/2026", subject: "Permintaan data produksi untuk survei pasar", counterpart: "Koperasi Mitra Sejahtera", date: "2026-11-17", status: "baru", assignee: "Bidang Usaha" },
  { id: "SR-103", direction: "keluar", number: "021/KWT-SB/XI/2026", subject: "Permohonan narasumber pelatihan pascapanen", counterpart: "Balai Penyuluhan Pertanian", date: "2026-11-12", status: "selesai", assignee: "Sekretaris" },
  { id: "SR-104", direction: "keluar", number: "020/KWT-SB/XI/2026", subject: "Pemberitahuan perubahan rekening organisasi", counterpart: "Bank BRI Cabang Temanggung", date: "2026-11-08", status: "selesai", assignee: "Bendahara" },
  { id: "SR-105", direction: "masuk", number: "09/PMD/XI/2026", subject: "Pencairan bantuan sarana produksi tahap 2", counterpart: "Pemerintah Desa Ngadimulyo", date: "2026-11-21", status: "baru", assignee: "Bendahara" },
];

export const DOCUMENTS: DocumentRow[] = [
  { id: "DOC-01", number: "SK-01/2016", title: "Akta pendirian KWT Srikandi Buana", category: "SK", date: "2016-03-12", owner: "Sekretariat", visibility: "publik", status: "final" },
  { id: "DOC-02", number: "SK-04/2024", title: "SK susunan pengurus periode 2024–2027", category: "SK", date: "2024-06-02", owner: "Sekretariat", visibility: "publik", status: "final" },
  { id: "DOC-03", number: "LAP-Q3-2026", title: "Laporan realisasi program triwulan III 2026", category: "Laporan", date: "2026-10-10", owner: "Pengurus Harian", visibility: "publik", status: "final" },
  { id: "DOC-04", number: "SOP-TANI-02", title: "SOP pascapanen dan penyimpanan kopi", category: "SOP", date: "2026-08-18", owner: "Bidang Pertanian", visibility: "internal", status: "final" },
  { id: "DOC-05", number: "NOT-2026-11", title: "Notulen rapat pengurus 18 November 2026", category: "Notulen", date: "2026-11-18", owner: "Sekretariat", visibility: "internal", status: "final" },
  { id: "DOC-06", number: "LAP-HIB-2026", title: "Laporan penggunaan hibah pemberdayaan (demo)", category: "Laporan", date: "2026-11-15", owner: "Keuangan", visibility: "terbatas", status: "final" },
  { id: "DOC-07", number: "SOP-USAHA-01", title: "SOP penerimaan pesanan dan pengemasan", category: "SOP", date: "2026-09-01", owner: "Bidang Usaha", visibility: "internal", status: "draft" },
  { id: "DOC-08", number: "PUB-2026-03", title: "Ringkasan program untuk mitra (versi publik)", category: "Publikasi", date: "2026-10-22", owner: "Pengurus Harian", visibility: "terbatas", status: "final" },
];

/** Example attendance sheet — names come from MEMBERS so nothing is invented. */
export const ATTENDANCE_MOCK: { name: string; role: string }[] = [
  { name: "Sri Wulandari", role: "Ketua" },
  { name: "Endang Puspitasari", role: "Sekretaris" },
  { name: "Titik Handayani", role: "Bendahara" },
  { name: "Warsiti", role: "Anggota Bidang Pertanian" },
  { name: "Rukmini", role: "Anggota Bidang Pelatihan" },
  { name: "Dwi Lestari", role: "Anggota Bidang Usaha" },
];

export const NOTICES: Notice[] = [
  { id: "N-01", title: "Anggaran pelatihan Desember menunggu persetujuan Anda", body: "Bidang Pelatihan mengajukan Rp 2.000.000 untuk Sekolah Tani edisi Desember.", date: "2026-11-22", audience: "Bendahara · Ketua", read: false, href: "/app/pengurus/persetujuan", tone: "warning" },
  { id: "N-02", title: "Rapat koordinasi bidang 25 November", body: "Ruang balai pertemuan, 09.00 WIB. Koordinator bidang diharapkan menyiapkan catatan progres.", date: "2026-11-20", audience: "Semua bidang", read: false, href: "/app/sekretariat/agenda", tone: "info" },
  { id: "N-03", title: "Rekonsiliasi bank: 1 transaksi belum dicocokkan", body: "Biaya administrasi bank Rp 15.000 belum memiliki jurnal.", date: "2026-11-21", audience: "Bendahara", read: false, href: "/app/keuangan/kas-bank", tone: "warning" },
  { id: "N-04", title: "Panen kopi pekan ini tercatat 2.340 kg", body: "Grade A 1.180 kg dari 9 petak anggota.", date: "2026-11-19", audience: "Bidang Pertanian", read: true, href: "/app/bidang/pertanian", tone: "success" },
  { id: "N-05", title: "Notulen rapat 18 November telah difinalkan", body: "Sekretaris menyimpan salinan di arsip dokumen internal.", date: "2026-11-19", audience: "Pengurus", read: true, href: "/app/sekretariat/notulen", tone: "info" },
];

export const APPROVALS: Approval[] = [
  {
    id: "AP-01",
    kind: "anggaran",
    title: "Anggaran Sekolah Tani edisi Desember",
    bidang: "Pemberdayaan & Pelatihan",
    amount: 2_000_000,
    submittedBy: "Bidang Pelatihan",
    submittedAt: "2026-11-22",
    status: "menunggu",
    currentStep: "Persetujuan Bendahara",
    history: [
      { actor: "Rukmini (Bidang Pelatihan)", action: "Mengajukan", at: "2026-11-22 08:40", note: "Venue, konsumsi, dan honor narasumber" },
    ],
  },
  {
    id: "AP-02",
    kind: "kegiatan",
    title: "Kunjungan lapangan pendampingan budidaya (12 petak)",
    bidang: "Pertanian & Produksi",
    submittedBy: "Bidang Pertanian",
    submittedAt: "2026-11-20",
    status: "menunggu",
    currentStep: "Reviu Koordinator Bidang",
    history: [
      { actor: "Warsiti (Bidang Pertanian)", action: "Mengajukan", at: "2026-11-20 10:10" },
      { actor: "Sistem", action: "Diteruskan", at: "2026-11-20 10:10", note: "Nilai di bawah batas, tahap tunggal" },
    ],
  },
  {
    id: "AP-03",
    kind: "pembayaran",
    title: "Pelunasan CV Kemasan Jaya (Rp 1.100.000)",
    bidang: "Keuangan",
    amount: 1_100_000,
    submittedBy: "Bendahara",
    submittedAt: "2026-11-19",
    status: "disetujui",
    currentStep: "Selesai",
    history: [
      { actor: "Titik Handayani (Bendahara)", action: "Mengajukan", at: "2026-11-19 09:00" },
      { actor: "Sri Wulandari (Ketua)", action: "Menyetujui", at: "2026-11-19 14:25", note: "Sesuai PO-2026-10" },
      { actor: "Sistem", action: "Diposting", at: "2026-11-20 13:15", note: "JU/2026/11/0016" },
    ],
  },
  {
    id: "AP-04",
    kind: "keanggotaan",
    title: "Pendaftaran calon anggota baru",
    bidang: "Organisasi & Keanggotaan",
    submittedBy: "Formulir publik",
    submittedAt: "2026-10-28",
    status: "revisi",
    currentStep: "Menunggu kelengkapan data",
    history: [
      { actor: "Siti Aminah", action: "Mendaftar", at: "2026-10-28 19:42" },
      { actor: "Bidang Organisasi", action: "Meminta revisi", at: "2026-11-02 11:00", note: "Alamat dan nomor kontak belum lengkap" },
    ],
  },
  {
    id: "AP-05",
    kind: "dokumen",
    title: "Publikasi ringkasan program untuk mitra",
    bidang: "Pengurus Harian",
    submittedBy: "Sekretariat",
    submittedAt: "2026-10-20",
    status: "disetujui",
    currentStep: "Selesai",
    history: [
      { actor: "Endang Puspitasari (Sekretaris)", action: "Mengajukan", at: "2026-10-20 08:30" },
      { actor: "Sri Wulandari (Ketua)", action: "Menyetujui", at: "2026-10-22 09:10", note: "Tanpa data pribadi anggota" },
    ],
  },
];
