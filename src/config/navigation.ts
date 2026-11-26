/**
 * PUBLIC SITE NAVIGATION — model & copy carried over from the previous
 * production site (srikandibuana.vercel.app), Blueprint §10.1 mega menu.
 *
 * Shape of the old menu: every trigger opens one white panel that starts with
 * a 270px "feature" aside (brand, eyebrow, headline, link) followed by two to
 * three columns of icon + title + one-line description, and a bottom strip with
 * the tagline and a "Tutup" button. Kept as a registry so the Studio menu
 * builder and the public header read the same source — no hardcoded menus.
 *
 * Every href below resolves to a page that exists in this build; the old site's
 * policy/legal URLs live on as anchors inside the pages that own that topic.
 */

export type MenuItem = {
  label: string;
  href: string;
  desc?: string;
  /** Icon key understood by `AppIcon` in components/brand.tsx. */
  icon?: string;
  /** Small trailing arrow that signals "opens a form / another system". */
  external?: boolean;
};
export type MenuColumn = { heading: string; items: MenuItem[] };
export type MenuSection = {
  /** Trigger label and panel id suffix. */
  heading: string;
  /** Feature aside copy. */
  feature: { eyebrow: string; title: string; body: string; href: string; linkLabel: string };
  columns: MenuColumn[];
  /** Flat view used by the mobile drawer and by active-route detection. */
  items: MenuItem[];
};

const flat = (columns: MenuColumn[]) => columns.flatMap((c) => c.items);

export const MEGA_MENU: MenuSection[] = [
  {
    heading: "Organisasi",
    feature: {
      eyebrow: "KWT SRIKANDI BUANA",
      title: "Profil dan tata kelola organisasi.",
      body: "Kenali profil, arah perjuangan, dan fondasi Srikandi Buana.",
      href: "/profil",
      linkLabel: "Lebih dekat dengan kelompok",
    },
    columns: [
      {
        heading: "Profil & arah",
        items: [
          {
            label: "Tentang Srikandi Buana",
            href: "/profil",
            desc: "Profil kelompok dan fondasi kebersamaan",
            icon: "users",
          },
          {
            label: "Sejarah & perjalanan",
            href: "/profil#sejarah",
            desc: "Sepuluh tahun tumbuh bersama",
            icon: "compass",
          },
          {
            label: "Struktur & pengurus",
            href: "/profil#struktur",
            desc: "Pengurus harian dan empat bidang kerja",
            icon: "structure",
          },
        ],
      },
      {
        heading: "Kelembagaan & kolaborasi",
        items: [
          {
            label: "Kemitraan",
            href: "/kemitraan",
            desc: "Ruang kerja sama yang sehat dan transparan",
            icon: "handshake",
            external: true,
          },
          {
            label: "Dokumen kelembagaan",
            href: "/dokumen",
            desc: "AD/ART ringkas, SK, dan laporan final",
            icon: "file",
          },
          {
            label: "Keanggotaan",
            href: "/profil#keanggotaan",
            desc: "Syarat, manfaat, dan alur bergabung",
            icon: "idcard",
          },
        ],
      },
    ],
    items: [],
  },
  {
    heading: "Program",
    feature: {
      eyebrow: "SEMBILAN PRIORITAS",
      title: "Sembilan program prioritas.",
      body: "Satu arah kerja: organisasi kuat, keterampilan tumbuh, usaha berdaya.",
      href: "/program",
      linkLabel: "Lihat seluruh program",
    },
    columns: [
      {
        heading: "Fondasi organisasi",
        items: [
          {
            label: "Penguatan Organisasi & Kaderisasi",
            href: "/program?bidang=organisasi",
            desc: "Minat anggota, kader, dan komunikasi internal",
            icon: "users",
          },
          {
            label: "Pendampingan Budidaya Kopi & Pangan",
            href: "/program?bidang=pertanian",
            desc: "Mutu dan hasil kebun anggota",
            icon: "sprout",
          },
          {
            label: "Dokumen & arsip kelembagaan",
            href: "/dokumen",
            desc: "Bukti keputusan dan laporan yang dapat ditelusuri",
            icon: "archive",
          },
        ],
      },
      {
        heading: "Keterampilan & peran",
        items: [
          {
            label: "Sekolah Tani Perempuan",
            href: "/program?bidang=pelatihan",
            desc: "Kelas budidaya, pascapanen, dan usaha",
            icon: "graduation",
          },
          {
            label: "Jadwal pelatihan terbuka",
            href: "/pelatihan",
            desc: "Kelas yang dapat diikuti anggota",
            icon: "calendar",
          },
          {
            label: "Pemetaan minat & keterampilan",
            href: "/program?bidang=organisasi",
            desc: "Dasar penempatan peran anggota",
            icon: "target",
          },
        ],
      },
      {
        heading: "Usaha & jejaring",
        items: [
          {
            label: "Penguatan Usaha Produk Anggota",
            href: "/program?bidang=usaha",
            desc: "Kemasan, harga, dan pemasaran bersama",
            icon: "store",
          },
          {
            label: "Produk anggota",
            href: "/produk",
            desc: "Kopi, madu, gula aren, dan olahan kebun",
            icon: "bag",
          },
          {
            label: "Kemitraan",
            href: "/kemitraan",
            desc: "Kerja sama pembeli, pemasok, dan pendamping",
            icon: "handshake",
            external: true,
          },
        ],
      },
    ],
    items: [],
  },
  {
    heading: "Informasi",
    feature: {
      eyebrow: "RUANG INFORMASI",
      title: "Informasi dan layanan kelompok.",
      body: "Kabar, agenda, dan dokumentasi — dibagikan apa adanya.",
      href: "/kabar",
      linkLabel: "Baca kabar terbaru",
    },
    columns: [
      {
        heading: "Kabar & dokumentasi",
        items: [
          {
            label: "Kegiatan",
            href: "/kegiatan",
            desc: "Kalender kegiatan terbuka",
            icon: "calendar",
          },
          {
            label: "Kabar kelompok",
            href: "/kabar",
            desc: "Berita dan catatan terbaru",
            icon: "news",
          },
          {
            label: "Galeri dokumentasi",
            href: "/galeri",
            desc: "Potret dari kebun dan kelas",
            icon: "gallery",
          },
        ],
      },
      {
        heading: "Bantuan & komunikasi",
        items: [
          {
            label: "Pertanyaan umum",
            href: "/faq",
            desc: "Jawaban atas pertanyaan yang sering diajukan",
            icon: "help",
          },
          {
            label: "Pusat bantuan",
            href: "/bantuan",
            desc: "Panduan penggunaan situs dan ruang kerja",
            icon: "info",
          },
          {
            label: "Hubungi pengelola",
            href: "/kontak",
            desc: "Alamat, jam layanan, dan kanal resmi",
            icon: "phone",
          },
        ],
      },
    ],
    items: [],
  },
  {
    heading: "Layanan",
    feature: {
      eyebrow: "LAYANAN PENGELOLA",
      title: "Hak pengunjung dan tata kelola.",
      body: "Temukan aturan penggunaan, perlindungan data, dan kanal bantuan yang jelas.",
      href: "/bantuan",
      linkLabel: "Buka pusat bantuan",
    },
    columns: [
      {
        heading: "Kebijakan situs",
        items: [
          {
            label: "Syarat & ketentuan",
            href: "/bantuan#syarat",
            desc: "Aturan penggunaan situs",
            icon: "file",
          },
          {
            label: "Kebijakan privasi",
            href: "/bantuan#privasi",
            desc: "Penggunaan dan perlindungan informasi",
            icon: "shield",
          },
          {
            label: "Cookie & penyimpanan",
            href: "/bantuan#penyimpanan",
            desc: "Sesi, preferensi, dan penyimpanan perangkat",
            icon: "cookie",
          },
          {
            label: "Publikasi & hak cipta",
            href: "/bantuan#publikasi",
            desc: "Izin foto, kredit, dan koreksi konten",
            icon: "image",
          },
        ],
      },
      {
        heading: "Hak & partisipasi",
        items: [
          {
            label: "Hak data pribadi",
            href: "/bantuan#privasi",
            desc: "Permintaan terkait informasi pribadi",
            icon: "shield",
          },
          {
            label: "Pedoman komunitas",
            href: "/profil#keanggotaan",
            desc: "Partisipasi yang saling menghormati",
            icon: "users",
          },
          {
            label: "Aksesibilitas",
            href: "/bantuan#aksesibilitas",
            desc: "Dukungan penggunaan situs",
            icon: "accessibility",
          },
          {
            label: "Pengaduan & koreksi",
            href: "/kontak?tujuan=informasi",
            desc: "Laporkan kendala atau ajukan koreksi",
            icon: "alert",
          },
        ],
      },
      {
        heading: "Bantuan penggunaan",
        items: [
          {
            label: "Pusat bantuan",
            href: "/bantuan",
            desc: "Akun, aktivasi, dan cara menggunakan situs",
            icon: "help",
          },
          {
            label: "Informasi pengelola",
            href: "/profil#struktur",
            desc: "Penanggung jawab dan pengelolaan",
            icon: "idcard",
          },
          {
            label: "Pasang aplikasi",
            href: "/bantuan#pasang",
            desc: "Akses dari layar utama perangkat",
            icon: "scan",
          },
          {
            label: "Masuk ruang kerja",
            href: "/masuk",
            desc: "Untuk pengurus, sekretariat, dan bendahara",
            icon: "login",
            external: true,
          },
          {
            label: "Peta situs",
            href: "/bantuan#peta-situs",
            desc: "Temukan seluruh halaman publik",
            icon: "globe",
          },
        ],
      },
    ],
    items: [],
  },
].map((g) => ({ ...g, items: flat(g.columns) })) as MenuSection[];

/** The tagline strip that closes every panel on the old site. */
export const MEGA_TAGLINE = "SRIKANDI BUANA · RUANG TUMBUH BERSAMA";

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
      { label: "Produk", href: "/produk" },
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
