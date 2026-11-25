import { formatDateID } from "@/lib/format";

/**
 * Penanda "terakhir diperbarui" untuk halaman publik.
 *
 * Halaman publik yang membaca dokumen bersama menampilkan kapan dan oleh siapa
 * data terakhir berubah — diambil dari kolom `updated_at`/`updated_by` di
 * `v9.app_state`, bukan dari jam demo. Bila halaman belum tersambung ke basis
 * data (`shared === false`), penanda tidak ditampilkan sama sekali: lebih baik
 * diam daripada menyebut angka yang bukan berasal dari dokumen.
 */
export function DataStamp({
  shared,
  updatedBy,
  updatedAt,
  what = "data",
}: {
  shared: boolean;
  updatedBy?: string;
  updatedAt?: string;
  /** Kata benda yang diperbarui, mis. "jadwal pelatihan". */
  what?: string;
}) {
  if (!shared || !updatedAt) return null;

  // updatedAt adalah ISO lengkap (tanggal + jam UTC). Tampilkan tanggal dan
  // jam WIB, karena pembaca halaman ini ada di Temanggung.
  let waktu = updatedAt;
  try {
    const d = new Date(updatedAt);
    if (!Number.isNaN(d.getTime())) {
      const wib = new Date(d.getTime() + 7 * 3600_000);
      const p = (n: number) => String(n).padStart(2, "0");
      waktu = `${formatDateID(wib.toISOString().slice(0, 10), "long")}, ${p(wib.getUTCHours())}.${p(wib.getUTCMinutes())} WIB`;
    }
  } catch {
    /* biarkan nilai mentah */
  }

  return (
    <p className="mt-6 flex flex-wrap items-center gap-1.5 text-[11.5px] text-muted2">
      <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-[#22a34a]" />
      <span>
        {what.charAt(0).toUpperCase() + what.slice(1)} terakhir diperbarui {waktu}
        {updatedBy ? <> oleh <span className="font-medium text-muted">{updatedBy}</span></> : null}.
      </span>
    </p>
  );
}
