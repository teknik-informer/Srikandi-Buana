/**
 * PUBLIC SITE NAVIGATION — Blueprint §10.1 mega menu (editable in Website Studio).
 * Kept as a registry so the Studio menu builder and the public header read the
 * same source — no hardcoded menus in components.
 */

export type MenuItem = { label: string; href: string; desc?: string };
export type MenuSection = { heading: string; items: MenuItem[] };

export const MEGA_MENU: MenuSection[] = [
  {
    heading: "Produk",
    items: [
      { label: "Katalog Produk", href: "/produk", desc: "Kopi, madu, gula aren, dan olahan kebun" },
      { label: "Produk Anggota", href: "/produk?oleh=anggota", desc: "Langsung dari petani pengelola" },
      { label: "Kategori Produk", href: "/produk?lihat=kategori", desc: "Telusuri menurut jenis" },
      { label: "Informasi Pemesanan", href: "/produk/pemesanan", desc: "Cara pesan, kirim, dan bayar" },
    ],
  },
  {
    heading: "Organisasi",
    items: [
      { label: "Profil Srikandi Buana", href: "/profil", desc: "Siapa kami dan apa yang kami rawat" },
      { label: "Sejarah & Perjalanan", href: "/profil#sejarah", desc: "Sepuluh tahun tumbuh bersama" },
      { label: "Struktur Organisasi", href: "/profil#struktur", desc: "Pengurus dan bidang kerja" },
      { label: "Keanggotaan", href: "/profil#keanggotaan", desc: "Syarat dan manfaat bergabung" },
      { label: "Dokumen Publik", href: "/dokumen", desc: "AD/ART ringkas, laporan, dan SK" },
    ],
  },
  {
    heading: "Program",
    items: [
      { label: "Program Berjalan", href: "/program", desc: "Agenda organisasi tahun ini" },
      { label: "Pertanian & Produksi", href: "/program?bidang=pertanian", desc: "Kebun kopi, pangan, dan madu" },
      { label: "Pemberdayaan Perempuan", href: "/program?bidang=pelatihan", desc: "Kelas dan sekolah tani" },
      { label: "Pelatihan", href: "/pelatihan", desc: "Jadwal kelas terbuka" },
      { label: "Kemitraan", href: "/kemitraan", desc: "Berkolaborasi dengan kami" },
    ],
  },
  {
    heading: "Informasi",
    items: [
      { label: "Berita", href: "/kabar", desc: "Kabar terbaru dari desa" },
      { label: "Artikel", href: "/kabar?jenis=artikel", desc: "Catatan dan gagasan" },
      { label: "Agenda", href: "/kegiatan", desc: "Kalender kegiatan terbuka" },
      { label: "Galeri", href: "/galeri", desc: "Potret dari lapangan" },
      { label: "Laporan Publik", href: "/dokumen?kategori=laporan", desc: "Ringkasan program yang dibagikan" },
    ],
  },
  {
    heading: "Layanan",
    items: [
      { label: "Minat Bergabung", href: "/gabung", desc: "Isi formulir, kami hubungi" },
      { label: "Kontak", href: "/kontak", desc: "Alamat dan jam layanan" },
      { label: "Kemitraan", href: "/kemitraan", desc: "Ajukan kerja sama" },
      { label: "Permintaan Informasi", href: "/kontak?tujuan=informasi", desc: "Untuk institusi & peneliti" },
      { label: "FAQ", href: "/faq", desc: "Pertanyaan yang sering diajukan" },
    ],
  },
];

/** Footer link groups */
export const FOOTER_MENU = [
  {
    heading: "Organisasi",
    items: [
      { label: "Profil", href: "/profil" },
      { label: "Struktur", href: "/profil#struktur" },
      { label: "Dokumen Publik", href: "/dokumen" },
      { label: "FAQ", href: "/faq" },
    ],
  },
  {
    heading: "Program",
    items: [
      { label: "Program Berjalan", href: "/program" },
      { label: "Pelatihan", href: "/pelatihan" },
      { label: "Kegiatan", href: "/kegiatan" },
      { label: "Kabar", href: "/kabar" },
    ],
  },
  {
    heading: "Produk",
    items: [
      { label: "Katalog", href: "/produk" },
      { label: "Pemesanan", href: "/produk/pemesanan" },
      { label: "Kemitraan", href: "/kemitraan" },
      { label: "Kontak", href: "/kontak" },
    ],
  },
  {
    heading: "Untuk Pengurus",
    items: [
      { label: "Masuk aplikasi", href: "/masuk" },
      { label: "Studio Pengelola", href: "/studio" },
      { label: "Portal Eksternal", href: "/portal" },
      { label: "Pusat Bantuan", href: "/bantuan" },
    ],
  },
];
