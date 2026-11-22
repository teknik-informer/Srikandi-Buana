/**
 * APP IDENTITY — the photograph and the opening line of each application.
 *
 * Rules kept from the blueprint:
 *  - no invented organisational attributes: quotes are the organisation's own
 *    line from `ORG`, or a factual statement about what the screen shows;
 *  - the picture is documented demo imagery already published in this build,
 *    not a stock photo added for decoration;
 *  - counts and facts shown in a banner are passed in by the page from real
 *    store data — this file only carries the words that do not change.
 */

export interface AppIdentity {
  /** Short name used in the topbar pill. */
  pill: string;
  /** Banner eyebrow — the app's own name, as registered in `APPS`. */
  eyebrow: string;
  title: string;
  lead: string;
  quote?: { text: string; source?: string };
  image: string;
  imageAlt: string;
}

export const APP_IDENTITY: Record<string, AppIdentity> = {
  launcher: {
    pill: "Beranda",
    eyebrow: "Beranda Aplikasi",
    title: "Ruang kerja Anda hari ini",
    lead:
      "Satu titik masuk untuk seluruh aplikasi internal. Tugas, agenda, dan keputusan yang menunggu tindakan Anda dikumpulkan di sini.",
    quote: { text: "Bersama, Berdaya, Berjaya.", source: "Semboyan Srikandi Buana" },
    image: "/images/hero-dasbor.jpg",
    imageAlt: "Enam perempuan tani Srikandi Buana di kebun kopi Ngadimulyo dengan gunung di latar belakang",
  },

  pengurus: {
    pill: "Pengurus",
    eyebrow: "Pengurus Harian & Pengawas",
    title: "Selamat datang di Srikandi Buana",
    lead:
      "Lintas bidang, persetujuan, dan keputusan organisasi dalam satu tampilan. Setiap angka di bawah dihitung dari catatan yang benar-benar ada.",
    quote: { text: "Bersama, Berdaya, Berjaya.", source: "Semboyan Srikandi Buana" },
    image: "/images/hero-dasbor.jpg",
    imageAlt: "Enam perempuan tani Srikandi Buana di kebun kopi Ngadimulyo dengan gunung di latar belakang",
  },

  sekretariat: {
    pill: "Sekretariat",
    eyebrow: "Aplikasi Sekretariat",
    title: "Administrasi organisasi",
    lead:
      "Surat masuk dan keluar, notulen, agenda, dokumen, dan publikasi website. Publikasi tetap melalui alur draf → review → terbit.",
    quote: { text: "Perempuan tani. Penggerak kemandirian.", source: "Tagline organisasi" },
    image: "/images/komunitas.jpg",
    imageAlt: "Lima perempuan Srikandi Buana duduk bersama membahas catatan dan laptop di beranda bambu",
  },

  keuangan: {
    pill: "Keuangan",
    eyebrow: "Keuangan Native",
    title: "Ringkasan keuangan organisasi",
    lead:
      "Mesin akuntansi milik Srikandi Buana sendiri — tanpa aplikasi akuntansi eksternal. Seluruh saldo dihitung dari jurnal berstatus diposting.",
    quote: { text: "Perempuan tani. Penggerak kemandirian.", source: "Tagline organisasi" },
    image: "/images/galeri-bazar.jpg",
    imageAlt: "Mangkuk keripik pisang hasil olahan usaha anggota Srikandi Buana di atas meja batu",
  },

  pos: {
    pill: "POS",
    eyebrow: "POS · Penjualan Lapangan",
    title: "Kasir",
    lead:
      "Touch-first, minim langkah. Setiap penjualan langsung memotong stok dan membentuk jurnal lewat posting service — tidak ada tulis langsung ke akuntansi.",
    image: "/images/galeri-bazar.jpg",
    imageAlt: "Mangkuk keripik pisang hasil olahan usaha anggota Srikandi Buana di atas meja batu",
  },

  anggota: {
    pill: "Portal Anggota",
    eyebrow: "Portal Anggota",
    title: "Ruang anggota",
    lead:
      "Profil, agenda, penugasan, komunitas, dan kontribusi Anda. Data yang Anda ubah di sini tercatat pada jejak audit organisasi.",
    quote: { text: "Bersama, Berdaya, Berjaya.", source: "Semboyan Srikandi Buana" },
    image: "/images/galeri-petik.jpg",
    imageAlt: "Anggota Srikandi Buana memetik kopi di kebun",
  },

  bidang: {
    pill: "Bidang",
    eyebrow: "Peta Bidang",
    title: "Peta aplikasi bidang",
    lead:
      "Empat bidang resmi dengan aplikasi operasional masing-masing. Status pengesahan organisasi dan status konfigurasi aplikasi dicatat terpisah.",
    image: "/images/hero-dasbor.jpg",
    imageAlt: "Anggota Srikandi Buana di kebun kopi Ngadimulyo",
  },

  /* ── the four bidang apps ─────────────────────────────────────────── */

  organisasi: {
    pill: "Organisasi",
    eyebrow: "FLD-ORG · Bidang Organisasi & Keanggotaan",
    title: "Bidang Organisasi & Keanggotaan",
    lead:
      "Mengelola partisipasi, komunikasi, penguatan organisasi, kaderisasi, kebutuhan anggota, dan koordinasi internal.",
    quote: { text: "Bersama, Berdaya, Berjaya.", source: "Semboyan Srikandi Buana" },
    image: "/images/komunitas.jpg",
    imageAlt: "Anggota Srikandi Buana berdiskusi bersama di beranda bambu",
  },

  pertanian: {
    pill: "Pertanian",
    eyebrow: "FLD-TANI · Bidang Pertanian & Produksi",
    title: "Bidang Pertanian & Produksi",
    lead:
      "Petak, komoditas, panen, dan mutu produksi. Angka luas dan hasil dihitung dari catatan petak yang terdaftar, bukan perkiraan.",
    quote: { text: "Perempuan tani. Penggerak kemandirian.", source: "Tagline organisasi" },
    image: "/images/hero-kebun.jpg",
    imageAlt: "Dua perempuan tani memetik kopi di terasering Ngadimulyo dengan gunung di kejauhan",
  },

  pelatihan: {
    pill: "Pelatihan",
    eyebrow: "FLD-DAYA · Bidang Pemberdayaan & Pelatihan",
    title: "Bidang Pemberdayaan & Pelatihan",
    lead:
      "Rencana pelatihan, peserta, kehadiran, asesmen, dan evaluasi. Kursi peserta tidak pernah dijual melebihi kapasitas yang tercatat.",
    quote: { text: "Perempuan tani. Penggerak kemandirian.", source: "Tagline organisasi" },
    image: "/images/galeri-pelatihan.jpg",
    imageAlt: "Dua anggota Srikandi Buana menjemur kopi di rumah jemur bambu",
  },

  usaha: {
    pill: "Usaha",
    eyebrow: "FLD-USA · Bidang Usaha & Kemitraan",
    title: "Bidang Usaha & Kemitraan",
    lead:
      "Katalog, HPP, stok, pesanan, mitra, dan kanal penjualan. Harga jual dan biaya dihitung dari data produk yang terdaftar.",
    quote: { text: "Perempuan tani. Penggerak kemandirian.", source: "Tagline organisasi" },
    image: "/images/rumah-jemur.jpg",
    imageAlt: "Dua anggota Srikandi Buana menjemur biji kopi di rumah jemur",
  },

  studio: {
    pill: "Studio",
    eyebrow: "Studio Pengelola",
    title: "Studio pengelola",
    lead:
      "Website Studio, Application Studio, Data & Form Builder, Dashboard Builder, Workflow Builder, Organization Studio, dan Rilis & Riwayat.",
    image: "/images/hero-dasbor.jpg",
    imageAlt: "Anggota Srikandi Buana di kebun kopi Ngadimulyo",
  },
};

/** Fallback so a new app can never render an empty banner. */
export const DEFAULT_IDENTITY: AppIdentity = {
  pill: "Aplikasi",
  eyebrow: "Aplikasi Internal",
  title: "Srikandi Buana",
  lead: "Ruang kerja internal organisasi.",
  image: "/images/hero-dasbor.jpg",
  imageAlt: "Anggota Srikandi Buana di kebun kopi Ngadimulyo",
};
