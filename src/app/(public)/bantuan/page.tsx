import Link from "next/link";
import type { Metadata } from "next";
import { Card, CardHeader, Notice, Badge } from "@/components/ui";
import { DEMO_ACCOUNTS } from "@/lib/session";
import { BLUEPRINT_VERSION } from "@/config/org";
import { halamanPublik, teksDari } from "@/lib/public-cms-server";

export const metadata: Metadata = {
  title: "Pusat Bantuan",
  description: "Panduan pengguna per peran untuk lingkungan demo Srikandi Buana V9.1.",
};

export default async function BantuanPage() {
  const _hp = await halamanPublik("/bantuan");
  const judul = teksDari(_hp.blocks, "rich-text", "headline", "Panduan per peran.");
  const pembuka = teksDari(_hp.blocks, "rich-text", "subheadline", "Lingkungan demo blueprint 9.2. Akun demo di bawah dapat dipakai untuk menelusuri aplikasi sesuai peran dan cakupan aksesnya.");

  return (
    <div className="sb-shell py-12">
      <div className="sb-label mb-2">Pusat bantuan</div>
      <h1 className="font-display text-[34px] leading-tight font-semibold text-ink sm:text-[40px]">{judul}</h1>
      <p className="mt-2 max-w-2xl text-[13.5px] text-muted">{pembuka}</p>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader title="Akun demo" subtitle="Kata sandi semua akun: demo1234" />
          <div className="divide-y divide-line">
            {DEMO_ACCOUNTS.map((a) => (
              <div key={a.key} className="flex items-center justify-between gap-3 px-5 py-2.5">
                <div className="min-w-0">
                  <div className="text-[12.5px] font-semibold text-ink">{a.label}</div>
                  <div className="truncate font-mono text-[11px] text-muted">{a.email}</div>
                </div>
                <Badge tone="neutral">{a.identity.scope}</Badge>
              </div>
            ))}
          </div>
          <div className="px-5 py-3"><Link href="/masuk" className="sb-btn sb-btn-primary !py-2 text-[12.5px]">Buka halaman masuk</Link></div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Peta cepat aplikasi" />
            <ul className="space-y-2 px-5 py-4 text-[13px]">
              <li><Link href="/app/pengurus" className="font-semibold text-primary-700 hover:underline">Pengurus Harian</Link> — persetujuan, lintas bidang, rapat.</li>
              <li><Link href="/app/sekretariat" className="font-semibold text-primary-700 hover:underline">Sekretariat</Link> — surat, notulen, dokumen.</li>
              <li><Link href="/app/keuangan" className="font-semibold text-primary-700 hover:underline">Keuangan</Link> — COA, jurnal, kas/bank, laporan.</li>
              <li><Link href="/app/bidang/pertanian" className="font-semibold text-primary-700 hover:underline">Bidang Pertanian</Link> — lahan, panen, kunjungan.</li>
              <li><Link href="/app/bidang/pelatihan" className="font-semibold text-primary-700 hover:underline">Bidang Pelatihan</Link> — kelas, peserta, asesmen.</li>
              <li><Link href="/app/bidang/usaha" className="font-semibold text-primary-700 hover:underline">Bidang Usaha</Link> — katalog, pesanan, mitra.</li>
              <li><Link href="/app/bidang/organisasi" className="font-semibold text-primary-700 hover:underline">Bidang Organisasi</Link> — anggota, usulan, partisipasi.</li>
              <li><Link href="/app/anggota" className="font-semibold text-primary-700 hover:underline">Portal Anggota</Link> — profil, agenda, tugas.</li>
              <li><Link href="/app/pos" className="font-semibold text-primary-700 hover:underline">POS</Link> — kasir dan transaksi lapangan.</li>
              <li><Link href="/studio" className="font-semibold text-primary-700 hover:underline">Studio Pengelola</Link> — website, aplikasi, tema.</li>
            </ul>
          </Card>
          <Notice tone="info" title="Batasan demo">
            Data bersifat contoh dan berlabel. Tidak ada data produksi, tidak ada pembayaran nyata,
            dan tidak ada dependensi akuntansi eksternal (Blueprint §33).
          </Notice>
        </div>
      </div>

      {/* ── Kebijakan situs — tujuan tautan mega menu Layanan ─────────────
          Halaman ini yang memiliki topik kebijakan; setiap anchor di bawah
          memuat pernyataan yang benar untuk lingkungan demo ini, bukan teks
          legal rekaan. */}
      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <Card className="relative">
          <div id="syarat" className="pointer-events-none absolute -top-px h-px w-px scroll-mt-24" aria-hidden />
          <div className="px-5 pt-4">
            <h2 className="font-display text-[16px] font-semibold text-ink">Syarat &amp; ketentuan</h2>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink2">
              Situs dan aplikasi ini adalah lingkungan demonstrasi. Seluruh angka, nama, dan
              dokumen adalah contoh berlabel; tidak ada transaksi, pembayaran, atau keputusan
              organisasi yang sah yang dihasilkan dari sini.
            </p>
          </div>
          <div id="privasi" className="pointer-events-none absolute -top-px h-px w-px scroll-mt-24" aria-hidden />
          <div className="mt-4 border-t border-line px-5 pt-4">
            <h2 className="font-display text-[16px] font-semibold text-ink">Kebijakan privasi</h2>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink2">
              Tidak ada data pribadi nyata yang dikumpulkan. Formulir demo tidak mengirim data ke
              server mana pun; isian hanya tersimpan di peramban Anda dan dapat dihapus dengan
              membersihkan penyimpanan situs.
            </p>
          </div>
          <div id="penyimpanan" className="pointer-events-none absolute -top-px h-px w-px scroll-mt-24" aria-hidden />
          <div className="mt-4 border-t border-line px-5 py-4">
            <h2 className="font-display text-[16px] font-semibold text-ink">Cookie &amp; penyimpanan</h2>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink2">
              Satu cookie sesi demo menandai peran yang sedang dipakai, dan ruang kerja menyimpan
              keadaan percobaan di <span className="font-mono text-[11.5px]">localStorage</span>
              peramban. Keduanya dapat dihapus kapan saja tanpa kehilangan data organisasi.
            </p>
          </div>
          <div id="publikasi" className="pointer-events-none absolute -top-px h-px w-px scroll-mt-24" aria-hidden />
          <div className="mt-4 border-t border-line px-5 py-4">
            <h2 className="font-display text-[16px] font-semibold text-ink">Publikasi &amp; hak cipta</h2>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink2">
              Foto dan ilustrasi dipakai untuk keperluan demonstrasi. Kredit, izin penggunaan, dan
              koreksi konten diatur melalui <Link href="/kontak?tujuan=informasi" className="font-semibold text-primary-700 hover:underline">permintaan informasi</Link>.
            </p>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="relative">
            <div id="aksesibilitas" className="pointer-events-none absolute -top-px h-px w-px scroll-mt-24" aria-hidden />
            <div className="px-5 pt-4">
              <h2 className="font-display text-[16px] font-semibold text-ink">Aksesibilitas</h2>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink2">
                Seluruh halaman diuji otomatis untuk kontras WCAG AA dan ukuran target sentuh
                minimal 24px. Navigasi dapat dipakai penuh dengan papan tunas; matikan animasi
                melalui pengaturan “kurangi gerakan” peramban.
              </p>
            </div>
            <div id="pasang" className="pointer-events-none absolute -top-px h-px w-px scroll-mt-24" aria-hidden />
            <div className="mt-4 border-t border-line px-5 pt-4">
              <h2 className="font-display text-[16px] font-semibold text-ink">Pasang aplikasi</h2>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink2">
                Situs menyertakan manifest dan ikon PWA. Di peramban yang mendukung, pilih
                “Tambahkan ke layar utama” untuk membuka Srikandi Buana seperti aplikasi.
              </p>
            </div>
            <div id="peta-situs" className="pointer-events-none absolute -top-px h-px w-px scroll-mt-24" aria-hidden />
            <div className="mt-4 border-t border-line px-5 py-4">
              <h2 className="font-display text-[16px] font-semibold text-ink">Peta situs</h2>
              <ul className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1 text-[12.5px] text-ink2">
                {[
                  ["Beranda", "/"], ["Profil", "/profil"], ["Program", "/program"],
                  ["Pelatihan", "/pelatihan"], ["Kegiatan", "/kegiatan"], ["Kabar", "/kabar"],
                  ["Galeri", "/galeri"], ["Katalog produk", "/produk"], ["Pemesanan", "/produk/pemesanan"],
                  ["Kemitraan", "/kemitraan"], ["Dokumen", "/dokumen"], ["FAQ", "/faq"],
                  ["Kontak", "/kontak"], ["Minat bergabung", "/gabung"], ["Portal mitra", "/portal"],
                  ["Masuk", "/masuk"],
                ].map(([label, href]) => (
                  <li key={href}><Link href={href} className="text-primary-700 hover:underline">{label}</Link></li>
                ))}
              </ul>
            </div>
          </Card>
          <Notice tone="info" title="Butuh bantuan langsung?">
            Kanal resmi kelompok ada di <Link href="/kontak" className="font-semibold text-primary-700 hover:underline">halaman kontak</Link>.
            Untuk penggunaan aplikasi, mulai dari akun demo di atas.
          </Notice>
        </div>
      </div>
    </div>
  );
}
