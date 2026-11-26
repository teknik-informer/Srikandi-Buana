import type { Metadata } from "next";
import { StudioBelumTersedia } from "@/components/studio/belum-tersedia";

export const metadata: Metadata = { title: "Application Studio" };

/**
 * Halaman ini belum punya mesin di belakangnya.
 *
 * Berkas aslinya menampilkan tabel contoh dengan angka tetap dan tanpa aksi
 * simpan. Menayangkannya sebagai fitur utuh menyesatkan pengelola — lihat
 * catatan di komponen `StudioBelumTersedia`.
 */
export default function Page() {
  return <StudioBelumTersedia fitur="Application Studio" />;
}
