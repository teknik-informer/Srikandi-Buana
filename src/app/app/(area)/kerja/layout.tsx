import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getIdentity } from "@/lib/session";
import { CoreShell } from "@/components/core-shell";
import { CORE_NAV } from "@/config/apps";

export const metadata: Metadata = { title: "Meja Kerja" };

/**
 * MEJA KERJA — satu layar, semua urusan.
 *
 * Ini janji slogan di beranda, dan satu-satunya halaman yang mencoba
 * menepatinya secara harfiah: anggota, lahan, kas, program, dan agenda
 * berdiri berdampingan, masing-masing dapat ditambah dari sini, dan semuanya
 * menulis ke dokumen data bersama yang sama sehingga apa yang diketik
 * pengurus ini terlihat oleh pengurus lain di perangkat lain.
 *
 * Halaman ini sengaja bukan dasbor. Dasbor menjawab "apa kabar?"; meja kerja
 * menjawab "apa yang saya kerjakan sekarang?" — isinya harus bisa diubah,
 * bukan hanya dibaca.
 *
 * Layout (bukan page) yang memuat identitas, karena CoreShell menuntut
 * DemoIdentity dan seluruh rute di bawahnya harus berbagi satu StoreProvider;
 * dengan begitu lima panel di halaman ini membaca state yang sama persis.
 */
export default async function KerjaLayout({ children }: { children: React.ReactNode }) {
  const identity = await getIdentity();
  if (!identity) redirect("/masuk");

  return (
    <CoreShell
      identity={identity}
      activeApp="pengurus"
      nav={[
        { label: "Meja Kerja", items: [{ label: "Satu layar", href: "/app/kerja" }] },
        { label: "Pengurus Harian", items: CORE_NAV.pengurus.map((i) => ({ ...i })) },
        {
          label: "Pintasan",
          items: [
            { label: "Semua aplikasi", href: "/app" },
            { label: "Buku induk", href: "/app/sekretariat/anggota" },
            { label: "Kas & bank", href: "/app/keuangan/kas-bank" },
            { label: "Laporan", href: "/app/pengurus/laporan" },
          ],
        },
      ]}
    >
      {children}
    </CoreShell>
  );
}
