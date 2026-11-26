import Link from "next/link";
import type { Metadata } from "next";
import { Card, CardHeader, Notice } from "@/components/ui";
import { getPublicSiteSettings } from "@/lib/public-site-settings";
import { isSitePathEnabled } from "@/lib/site-settings-schema";

export const metadata: Metadata = {
  title: "Pusat Bantuan",
  description: "Panduan akses dan penggunaan situs serta ruang kerja Srikandi Buana.",
};

export default async function BantuanPage() {
  const siteSettings = await getPublicSiteSettings();
  const sitemapLinks = [
    ["Beranda", "/"], ["Profil", "/profil"], ["Program", "/program"],
    ["Pelatihan", "/pelatihan"], ["Kegiatan", "/kegiatan"], ["Kabar", "/kabar"],
    ["Galeri", "/galeri"], ["Produk", "/produk"], ["Pemesanan", "/produk/pemesanan"],
    ["Kemitraan", "/kemitraan"], ["Dokumen", "/dokumen"], ["FAQ", "/faq"],
    ["Kontak", "/kontak"], ["Minat bergabung", "/gabung"], ["Portal mitra", "/portal"],
    ["Masuk", "/masuk"],
  ].filter((entry) => isSitePathEnabled(entry[1], siteSettings));

  return (
    <div className="sb-shell py-12">
      <div className="sb-label mb-2">Pusat bantuan</div>
      <h1 className="font-display text-[34px] leading-tight font-semibold text-ink sm:text-[40px]">Panduan per peran.</h1>
      <p className="mt-2 max-w-2xl text-[13.5px] text-muted">
        Gunakan akun yang diberikan setelah verifikasi dan penetapan penugasan. Menu serta cakupan
        akses mengikuti peran dan lingkup akun pada organisasi.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader title="Akses akun" subtitle="Diberikan setelah verifikasi dan penetapan penugasan." />
          <div className="space-y-3 px-5 py-4 text-[12.5px] leading-relaxed text-ink2">
            <p>Gunakan surel dan kata sandi yang diberikan oleh pengurus. Akun hanya dapat masuk setelah status aktif dan verifikasi surel terpenuhi.</p>
            <p>Hak akses mengikuti peran serta lingkup penugasan. Tidak semua pengguna dapat membuka seluruh aplikasi atau data organisasi.</p>
          </div>
          <div className="px-5 py-3"><Link href="/masuk" className="sb-btn sb-btn-primary !py-2 text-[12.5px]">Masuk ke ruang kerja</Link></div>
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
              <li><Link href="/app/bidang/usaha" className="font-semibold text-primary-700 hover:underline">Bidang Usaha</Link> — produk, persediaan, pesanan, mitra.</li>
              <li><Link href="/app/bidang/organisasi" className="font-semibold text-primary-700 hover:underline">Bidang Organisasi</Link> — anggota, usulan, partisipasi.</li>
              <li><Link href="/app/anggota" className="font-semibold text-primary-700 hover:underline">Portal Anggota</Link> — profil, agenda, tugas.</li>
              <li><Link href="/app/pos" className="font-semibold text-primary-700 hover:underline">POS</Link> — kasir dan transaksi lapangan.</li>
              <li><Link href="/studio" className="font-semibold text-primary-700 hover:underline">Studio Pengelola</Link> — website, aplikasi, tema.</li>
            </ul>
          </Card>
          <Notice tone="info" title="Pengelolaan informasi">
            Informasi pada website ditampilkan sesuai klasifikasi publikasi. Data operasional internal
            dikelola melalui aplikasi organisasi dan hanya tersedia bagi akun dengan kewenangan yang sesuai.
          </Notice>
        </div>
      </div>

      {/* Kebijakan penggunaan situs dan penanganan informasi. */}
      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <Card className="relative">
          <div id="syarat" className="pointer-events-none absolute -top-px h-px w-px scroll-mt-24" aria-hidden />
          <div className="px-5 pt-4">
            <h2 className="font-display text-[16px] font-semibold text-ink">Syarat &amp; ketentuan</h2>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink2">
              Gunakan situs untuk mengakses informasi yang telah disediakan dan mengikuti
              ketentuan publikasi organisasi. Pengajuan melalui formulir dan tindakan pada
              ruang kerja diproses menurut alur serta kewenangan yang berlaku.
            </p>
          </div>
          <div id="privasi" className="pointer-events-none absolute -top-px h-px w-px scroll-mt-24" aria-hidden />
          <div className="mt-4 border-t border-line px-5 pt-4">
            <h2 className="font-display text-[16px] font-semibold text-ink">Kebijakan privasi</h2>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink2">
              Formulir minat bergabung mengumpulkan nama, nomor WhatsApp, alamat, minat kegiatan,
              pengalaman tani, dan catatan opsional setelah persetujuan diberikan. Data disimpan
              pada database V9 untuk verifikasi keanggotaan dan hanya boleh diakses petugas yang
              berwenang. Pengajuan minat belum berarti seseorang telah menjadi anggota.
            </p>
          </div>
          <div id="penyimpanan" className="pointer-events-none absolute -top-px h-px w-px scroll-mt-24" aria-hidden />
          <div className="mt-4 border-t border-line px-5 py-4">
            <h2 className="font-display text-[16px] font-semibold text-ink">Cookie &amp; penyimpanan</h2>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink2">
              Sesi masuk memakai cookie HttpOnly dengan masa berlaku terbatas dan dicabut ketika
              pengguna keluar. Pengaturan situs disimpan pada basis data organisasi agar perubahan
              yang disahkan berlaku konsisten bagi pengunjung.
            </p>
          </div>
          <div id="publikasi" className="pointer-events-none absolute -top-px h-px w-px scroll-mt-24" aria-hidden />
          <div className="mt-4 border-t border-line px-5 py-4">
            <h2 className="font-display text-[16px] font-semibold text-ink">Publikasi &amp; hak cipta</h2>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink2">
              Foto dan ilustrasi hanya dipublikasikan setelah izin penggunaan, kredit, dan
              keterangan materi sesuai dicatat. Permintaan koreksi konten dapat diajukan melalui <Link href="/kontak?tujuan=informasi" className="font-semibold text-primary-700 hover:underline">permintaan informasi</Link>.
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
                {sitemapLinks.map(([label, href]) => (
                  <li key={href}><Link href={href} className="text-primary-700 hover:underline">{label}</Link></li>
                ))}
              </ul>
            </div>
          </Card>
          <Notice tone="info" title="Butuh bantuan langsung?">
            Kanal resmi kelompok ada di <Link href="/kontak" className="font-semibold text-primary-700 hover:underline">halaman kontak</Link>.
            Untuk menggunakan ruang kerja, masuk dengan akun resmi yang telah diberikan pengurus.
          </Notice>
        </div>
      </div>
    </div>
  );
}
