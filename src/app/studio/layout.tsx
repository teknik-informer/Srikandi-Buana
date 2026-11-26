import { redirect } from "next/navigation";
import { getIdentity } from "@/lib/session";
import { CoreShell } from "@/components/core-shell";

/**
 * Navigasi Studio.
 *
 * MENGAPA MENUNYA PENDEK
 * ----------------------
 * Versi sebelumnya menampilkan sepuluh tujuan: Application Studio, Data & Form
 * Builder, Dashboard Builder, Workflow Builder, Organization Studio, Design &
 * Theme, Modul & Ekstensi, Rilis & Riwayat — di samping Website Studio.
 *
 * Delapan di antaranya halaman statis: tabel contoh dengan angka karangan
 * (`FORM_FIELDS`, `WIDGETS`, `RELEASES`, `const [A-Z_]+ = [`). Tidak ada satu
 * pun tombol yang menyimpan apa pun. Menunya menjanjikan mesin pembangun
 * aplikasi yang belum ada.
 *
 * Yang benar-benar berfungsi hanya Website Studio — dan sejak revisi ini ia
 * menulis ke dokumen bersama, bukan `localStorage`. Jadi hanya itu yang
 * ditampilkan. Sisanya disembunyikan, bukan dihapus: berkasnya masih ada, dan
 * bila nanti benar-benar dibangun, cukup tambahkan kembali barisnya di sini.
 *
 * Halaman yang disembunyikan dan alasannya:
 *   /studio/aplikasi   — daftar aplikasi contoh, tanpa aksi
 *   /studio/data       — Form Builder: hanya tabel field contoh
 *   /studio/dashboard  — Dashboard Builder: hanya daftar widget contoh
 *   /studio/organisasi — struktur organisasi contoh
 *   /studio/modul      — katalog modul contoh
 *   /studio/rilis      — catatan rilis contoh
 *   /studio/workflow   — rute belum ada (menu menunjuk ke 404)
 *   /studio/tema       — rute belum ada (menu menunjuk ke 404)
 */
const STUDIO_NAV = [
  {
    label: "Studio Pengelola",
    items: [
      { label: "Beranda Studio", href: "/studio" },
      { label: "Website Studio", href: "/studio/website" },
    ],
  },
  {
    label: "Pintasan",
    items: [
      { label: "Kembali ke aplikasi", href: "/app" },
      { label: "Lihat website", href: "/" },
    ],
  },
];

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const identity = await getIdentity();
  if (!identity) redirect("/masuk");
  return (
    <CoreShell identity={identity} activeApp="studio" nav={STUDIO_NAV}>
      {children}
    </CoreShell>
  );
}
