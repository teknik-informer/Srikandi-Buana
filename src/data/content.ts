/** Public content: news, agenda, gallery, FAQ, studio pages. */

import type { NewsPost, StudioPage } from "./types";

export const NEWS: NewsPost[] = [
  {
    slug: "panen-kopi-arabika-2026",
    title: "Panen kopi arabika mulai, 1.180 kg grade A dari sembilan petak",
    kind: "berita",
    excerpt:
      "Musim panen kopi arabika di Ngadimulyo dimulai pekan ini. Sortasi awal mencatat 1.180 kg grade A dari sembilan petak anggota.",
    body: [
      "Musim panen kopi arabika di Dusun Ngadimulyo dimulai pekan ini. Dari sembilan petak yang dipanen serentak, sortasi awal mencatat 1.180 kg biji grade A dan 1.160 kg grade B.",
      "Bidang Pertanian & Produksi mendampingi proses petik merah, fermentasi 36 jam, dan pengeringan di rumah jemur bersama. Catatan panen diinput melalui aplikasi bidang agar stok dan HPP selalu diperbarui.",
      "Ketua kelompok menyampaikan bahwa harga grade A tahun ini disepakati bersama anggota. Keputusan harga jual final tetap menunggu pembahasan dengan mitra pembeli.",
    ],
    author: "Sekretariat",
    date: "2026-11-19",
    status: "published",
    tags: ["Pertanian", "Panen", "Kopi"],
    image: "/images/hero-kebun.jpg",
    featured: true,
  },
  {
    slug: "sekolah-tani-desember",
    title: "Sekolah Tani edisi Desember: kemasan dan harga jual",
    kind: "pengumuman",
    excerpt: "Kelas terbuka untuk anggota dan warga desa. Pendaftaran dibuka sampai 3 Desember 2026.",
    body: [
      "Sekolah Tani Perempuan edisi Desember akan membahas kemasan produk dan cara menghitung harga jual yang sehat untuk usaha anggota.",
      "Kelas berlangsung 6 Desember 2026 di balai pertemuan, pukul 09.00–13.00, dengan narasumber praktisi UMKM Temanggung.",
      "Kursi tersedia 30 dan pendaftaran ditutup 3 Desember 2026. Anggota dapat mendaftar melalui portal anggota; warga umum melalui formulir minat bergabung.",
    ],
    author: "Bidang Pemberdayaan & Pelatihan",
    date: "2026-11-17",
    status: "published",
    tags: ["Pelatihan", "Agenda"],
    image: "/images/galeri-pelatihan.jpg",
  },
  {
    slug: "laporan-triwulan-iii",
    title: "Laporan triwulan III 2026 tersedia untuk publik",
    kind: "pengumuman",
    excerpt: "Ringkasan capaian program dan penggunaan anggaran triwulan III dipublikasikan di halaman dokumen.",
    body: [
      "Laporan realisasi program triwulan III 2026 telah disetujui pengurus dan dipublikasikan pada halaman Dokumen Publik.",
      "Laporan memuat capaian indikator per bidang, ringkasan realisasi anggaran, dan catatan evaluasi. Rincian transaksi internal tidak dipublikasikan untuk melindungi data pribadi anggota.",
    ],
    author: "Pengurus Harian",
    date: "2026-11-04",
    status: "published",
    tags: ["Laporan", "Transparansi"],
    image: "/images/galeri-rapat.jpg",
  },
  {
    slug: "madu-trigona-panen-terbatas",
    title: "Panen madu trigona terbatas bulan ini",
    kind: "artikel",
    excerpt: "Hanya 18 kg madu yang bisa dipanen dari 12 stup aktif. Stok katalog diperbarui otomatis.",
    body: [
      "Lebah trigona di petak Kedu hanya menghasilkan 18 kg madu pada panen bulan ini. Panen dilakukan tanpa pemanasan agar mutu terjaga.",
      "Stok katalog publik diperbarui otomatis dari pencatatan bidang pertanian, sehingga pembeli melihat ketersediaan yang sebenarnya tanpa membuka data stok internal.",
    ],
    author: "Bidang Usaha & Kemitraan",
    date: "2026-11-16",
    status: "published",
    tags: ["Madu", "Produk"],
    image: "/images/prod-madu.jpg",
  },
  {
    slug: "draft-konservasi-lahan",
    title: "Rencana konservasi lahan: terasering dan sumber air",
    kind: "berita",
    excerpt: "Bidang Pertanian menyiapkan program konservasi untuk menjaga lahan dan sumber air anggota.",
    body: ["Draf program sedang disusun sebelum dibahas dalam rapat pengurus."],
    author: "Bidang Pertanian & Produksi",
    date: "2026-11-21",
    status: "draft",
    tags: ["Konservasi"],
    image: "/images/galeri-pendampingan.jpg",
  },
];

export const GALLERY = [
  { id: "G-01", title: "Petik merah kopi arabika", date: "2026-11-19", field: "Pertanian & Produksi" },
  { id: "G-02", title: "Fermentasi batch pertama musim ini", date: "2026-11-19", field: "Pertanian & Produksi" },
  { id: "G-03", title: "Praktik pascapanen di balai", date: "2026-11-10", field: "Pemberdayaan & Pelatihan" },
  { id: "G-04", title: "Pendampingan petak anggota baru", date: "2026-11-10", field: "Pertanian & Produksi" },
  { id: "G-05", title: "Bazar produk anggota", date: "2026-10-22", field: "Usaha & Kemitraan" },
  { id: "G-06", title: "Rapat anggota triwulan IV", date: "2026-10-14", field: "Organisasi & Keanggotaan" },
];

export const FAQS = [
  {
    q: "Siapa yang dapat menjadi anggota Srikandi Buana?",
    a: "Perempuan tani dan pelaku usaha tani di Desa Ngadimulyo dan sekitarnya yang bersedia mengikuti kegiatan kelompok. Pendaftaran melalui formulir minat bergabung, lalu diverifikasi Bidang Organisasi & Keanggotaan.",
  },
  {
    q: "Apakah keanggotaan otomatis mendapatkan akun aplikasi?",
    a: "Tidak. Pencatatan keanggotaan dan pembuatan akun login adalah dua proses berbeda. Akun portal diberikan setelah keanggotaan disetujui dan data diverifikasi.",
  },
  {
    q: "Bagaimana cara membeli produk anggota?",
    a: "Katalog publik menampilkan produk yang telah dipublikasikan. Pemesanan melalui kanal yang tercantum di halaman Informasi Pemesanan, dan pembayaran dilakukan sesuai instruksi resmi organisasi.",
  },
  {
    q: "Apakah laporan keuangan dapat diakses publik?",
    a: "Ringkasan laporan program disetujui untuk publik. Rincian transaksi, lampiran, dan data pribadi anggota bersifat terbatas dan hanya untuk pengurus berwenang.",
  },
  {
    q: "Bagaimana menjadi mitra organisasi?",
    a: "Ajukan kemitraan melalui halaman Kemitraan. Setiap kerja sama dicatat pada database mitra dengan milestone dan dokumen perjanjian.",
  },
  {
    q: "Apakah data anggota dijual atau dibagikan?",
    a: "Tidak. Data pribadi hanya dibagikan kepada pemerintah, NGO, atau mitra sesuai persetujuan tertulis dan kewenangan organisasi.",
  },
];

export const STUDIO_PAGES: StudioPage[] = [
  { path: "/", title: "Beranda", status: "published", updatedAt: "2026-11-20 14:20", updatedBy: "Sekretariat", blocks: 8, revisions: 12 },
  { path: "/profil", title: "Profil Srikandi Buana", status: "published", updatedAt: "2026-11-11 09:02", updatedBy: "Sekretariat", blocks: 3, revisions: 5 },
  { path: "/program", title: "Program Berjalan", status: "published", updatedAt: "2026-11-18 16:44", updatedBy: "Pengurus Harian", blocks: 2, revisions: 7 },
  { path: "/produk", title: "Katalog Produk", status: "published", updatedAt: "2026-11-19 10:11", updatedBy: "Bidang Usaha", blocks: 2, revisions: 4 },
  { path: "/kabar", title: "Berita & Artikel", status: "published", updatedAt: "2026-11-19 08:30", updatedBy: "Sekretariat", blocks: 1, revisions: 9 },
  { path: "/kemitraan", title: "Kemitraan", status: "review", updatedAt: "2026-11-21 13:05", updatedBy: "Sekretariat", blocks: 4, revisions: 2 },
];

export const MENU_DRAFT = {
  name: "Mega menu utama",
  status: "published" as const,
  updatedAt: "2026-11-09 11:00",
  items: 5,
  subItems: 24,
};

export const DESIGN_PRESETS = [
  { name: "Hijau Bumi (aktif)", primary: "#38571a", accent: "#d58400", surface: "#ebebeb", density: "Nyaman" },
  { name: "Kopi Senja", primary: "#4a3b2a", accent: "#c07a1e", surface: "#efe9e0", density: "Nyaman" },
  { name: "Daun Muda", primary: "#2f6b34", accent: "#e0a100", surface: "#eef1e6", density: "Padat" },
];
