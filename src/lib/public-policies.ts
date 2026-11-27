import "server-only";

import { getV9Sql, rowsFromResult } from "@/lib/db";

export type PolicyStatus = "draft" | "published" | "inactive";
export interface PolicySection { id: string; heading: string; body: string; }
export interface PolicyDocument {
  id: string;
  slug: string;
  title: string;
  category: string;
  summary: string;
  version: string;
  effectiveDate: string;
  status: PolicyStatus;
  sections: PolicySection[];
}
export interface PublicPolicySettings { enabled: boolean; documents: PolicyDocument[]; }

const section = (id: string, heading: string, body: string): PolicySection => ({ id, heading, body });
const document = (
  id: string, slug: string, title: string, category: string, summary: string,
  status: PolicyStatus, sections: PolicySection[],
): PolicyDocument => ({
  id, slug, title, category, summary, version: "1.0",
  effectiveDate: "2026-11-27", status, sections,
});

export const DEFAULT_PUBLIC_POLICY_SETTINGS: PublicPolicySettings = {
  enabled: true,
  documents: [
    document("legalitas-identitas", "legalitas-identitas", "Legalitas & Identitas Situs", "Legalitas",
      "Informasi pengelola, identitas kelembagaan, dan status pendaftaran situs.", "draft", [
        section("pengelola", "Pengelola situs", "Situs ini digunakan untuk menyampaikan informasi dan mendukung kegiatan digital KWT Srikandi Buana. Pengelolaan konten dan akses sistem dilakukan oleh pengurus atau administrator yang diberi kewenangan oleh organisasi."),
        section("status", "Status kelembagaan", "Status badan hukum, nomor pengesahan, NIB, NPWP, dan nomor registrasi kelembagaan belum diverifikasi untuk ditampilkan pada dokumen ini. Tidak ada nomor atau status pendaftaran yang boleh dianggap telah terbit sebelum dokumen resminya diperiksa dan disahkan."),
        section("pse", "Pendaftaran sistem elektronik", "Status pendaftaran Penyelenggara Sistem Elektronik (PSE) situs ini belum diverifikasi. Informasi nomor dan status pendaftaran hanya akan ditampilkan setelah pemeriksaan bukti registrasi yang sah."),
        section("penanggung-jawab", "Alamat dan penanggung jawab", "Alamat sekretariat, penanggung jawab resmi, dan kanal pengaduan harus diisi melalui Website Studio setelah ditetapkan oleh organisasi. Kolom yang belum diverifikasi tidak boleh diisi dengan identitas atau alamat perkiraan."),
      ]),
    document("syarat-ketentuan", "syarat-ketentuan", "Syarat & Ketentuan Penggunaan", "Ketentuan layanan",
      "Ketentuan penggunaan situs publik dan ruang kerja digital Srikandi Buana.", "published", [
        section("ruang-lingkup", "Ruang lingkup layanan", "Situs menyediakan informasi organisasi, program, kegiatan, publikasi, dokumen yang telah dinyatakan terbuka untuk publik, serta akses ruang kerja sesuai kewenangan pengguna. Tidak semua fitur atau informasi tersedia bagi setiap pengunjung."),
        section("akun", "Akun dan kewenangan", "Pengguna yang memperoleh akun wajib menjaga kerahasiaan kredensial dan menggunakan akun sesuai peran. Pendaftaran minat bergabung bukan aktivasi keanggotaan maupun pembuatan akun. Penetapan keanggotaan tetap mengikuti verifikasi dan keputusan organisasi."),
        section("kebenaran", "Kebenaran informasi", "Pengguna wajib memberikan informasi yang benar dan relevan. Dilarang mengunggah data pribadi pihak lain tanpa kewenangan atau dasar yang sesuai."),
        section("larangan", "Penggunaan yang dilarang", "Dilarang memperoleh akses tanpa hak, mengganggu layanan, memalsukan identitas, menyalahgunakan dokumen, mengunggah muatan berbahaya, atau menggunakan situs untuk tindakan yang melanggar hukum."),
        section("perubahan", "Perubahan layanan", "Fitur dan ketentuan dapat diperbarui untuk kebutuhan organisasi, keamanan, dan kepatuhan. Perubahan penting dicantumkan pada halaman kebijakan beserta versi atau tanggal berlakunya."),
      ]),
    document("privasi", "privasi", "Kebijakan Privasi & Pelindungan Data Pribadi", "Privasi",
      "Penjelasan data yang diproses, tujuan penggunaan, akses, penyimpanan, dan hak pemilik data.", "published", [
        section("data", "Data yang dapat diproses", "Sesuai fitur yang digunakan, sistem dapat memproses identitas akun, alamat surel, profil dan keanggotaan, data kegiatan atau program, catatan administrasi dan transaksi, berkas yang diunggah, serta data teknis seperti sesi dan catatan keamanan. Formulir hanya boleh meminta data yang relevan."),
        section("tujuan", "Tujuan pemrosesan", "Data digunakan untuk menjalankan layanan organisasi, mengelola keanggotaan dan penugasan, mencatat kegiatan serta administrasi, memproses permintaan, menjaga keamanan, melakukan audit, dan memenuhi kewajiban yang berlaku."),
        section("akses", "Akses dan pengungkapan", "Akses internal dibatasi berdasarkan identitas, peran, dan lingkup kewenangan. Data dapat diproses penyedia infrastruktur yang diperlukan atau diungkapkan apabila diwajibkan oleh ketentuan hukum. Data internal tidak otomatis menjadi data publik."),
        section("penyedia", "Penyedia layanan teknologi", "Aplikasi di-host melalui Vercel dan menggunakan Neon sebagai penyedia basis data terkelola. Pemrosesan dapat berlangsung di pusat data penyedia sesuai konfigurasi deployment dan basis data; karena itu, organisasi tidak menjanjikan seluruh pemrosesan berlangsung di Indonesia. Layanan penyimpanan berkas Cloudinary pada V9.2 telah disiapkan pada kode dan migrasi QA, tetapi belum dapat dinyatakan aktif untuk unggahan nyata sampai kredensial Cloudinary dikonfigurasi pada environment Preview yang sesuai. Jika diaktifkan, Cloudinary akan memproses berkas sesuai kebijakan penyedia."),
        section("retensi", "Penyimpanan dan retensi", "Data disimpan selama diperlukan untuk menjalankan layanan, menjaga bukti administrasi organisasi, memenuhi kewajiban hukum, dan menyelesaikan sengketa. Jadwal retensi rinci per kategori data belum ditetapkan dalam dokumen ini dan perlu disahkan organisasi."),
        section("hak", "Hak pemilik data", "Pemilik data dapat mengajukan permintaan akses, salinan, koreksi, pembatasan, penghentian pemrosesan, penghapusan, atau penarikan persetujuan sepanjang sesuai ketentuan yang berlaku. Permintaan dapat memerlukan verifikasi identitas."),
        section("permintaan", "Permintaan privasi", "Permintaan mengenai data pribadi disampaikan melalui halaman Kontak dengan tujuan privasi atau pelindungan data. Kanal kontak hanya dapat digunakan setelah alamat atau nomor resminya diverifikasi dan ditampilkan."),
      ]),
    document("cookie", "cookie", "Kebijakan Cookie & Penyimpanan Peramban", "Privasi",
      "Penjelasan penggunaan cookie dan penyimpanan lokal yang diperlukan untuk fungsi situs.", "published", [
        section("fungsi", "Fungsi penyimpanan", "Situs menggunakan cookie sesi sb_v9_session untuk mengenali sesi masuk. Cookie ini berisi token acak, diberi atribut HttpOnly dan SameSite=Lax, menggunakan Secure pada lingkungan produksi, serta Path=/. Token asli tidak disimpan sebagai teks terbuka pada basis data; aplikasi menyimpan hash token pada tabel sesi. Cookie ini tidak dimaksudkan untuk menyimpan data profil atau isi dokumen."),
        section("jenis", "Jenis cookie", "Cookie aplikasi yang teridentifikasi pada V9.2 adalah sb_v9_session. Sesi disimpan di Neon dengan masa berlaku 8 jam sejak dibuat; cookie browser juga diberi masa 8 jam. Logout, pencabutan sesi, penonaktifan akun, atau berakhirnya penugasan akses dapat mengakhiri sesi lebih awal. Token pada browser bersifat acak dan hanya hash token yang disimpan pada tabel sesi. Tidak ada preferensi tampilan berbasis localStorage yang dinyatakan oleh lapisan aplikasi V9.2 saat ini. Perilaku cookie tambahan dari infrastruktur hosting dapat mengikuti kebijakan penyedia terkait."),
        section("pengaturan", "Pengaturan peramban", "Pengguna dapat mengelola atau menghapus cookie melalui pengaturan peramban. Pemblokiran cookie yang diperlukan dapat menyebabkan fungsi masuk atau preferensi tertentu tidak bekerja."),
        section("pihak-ketiga", "Teknologi pihak ketiga", "Apabila analitik, pemasaran, video, peta, atau sematan pihak ketiga ditambahkan, penggunaan dan kebutuhan persetujuannya harus ditinjau dan dijelaskan sebelum fitur diaktifkan."),
      ]),
    document("keamanan-informasi", "keamanan-informasi", "Kebijakan Keamanan Informasi", "Keamanan",
      "Prinsip perlindungan akun, informasi, dokumen, dan layanan digital.", "published", [
        section("prinsip", "Prinsip keamanan", "Keamanan diterapkan melalui pembatasan akses sesuai peran, pemisahan data organisasi, perlindungan sesi, validasi masukan, dan pencatatan aktivitas penting. Penerapan teknis mengikuti kemampuan dan konfigurasi sistem yang aktif."),
        section("pengguna", "Tanggung jawab pengguna", "Gunakan kata sandi kuat dan unik, jangan berbagi kode atau tautan pemulihan, kunci perangkat setelah digunakan, dan keluar dari akun pada perangkat bersama. Laporkan dugaan pengambilalihan akun."),
        section("dokumen", "Perlindungan dokumen", "Berkas internal harus diakses melalui pemeriksaan identitas dan izin. Dokumen yang dibagikan melalui tautan sementara tetap tunduk pada lingkup, masa berlaku, dan batas unduhan."),
        section("laporan", "Pelaporan insiden", "Laporkan dugaan kebocoran, akses tidak sah, atau kesalahan pengungkapan melalui kanal kontak resmi. Sertakan waktu kejadian dan uraian secukupnya, tanpa mengirim kata sandi atau token rahasia."),
      ]),
    document("hak-data-pribadi", "hak-data-pribadi", "Prosedur Permintaan Hak Data Pribadi", "Privasi",
      "Cara mengajukan permintaan akses, koreksi, pembatasan, atau penghapusan data pribadi.", "published", [
        section("pengajuan", "Cara mengajukan", "Ajukan permintaan melalui halaman Kontak dengan memilih tujuan privasi atau pelindungan data. Jelaskan data atau proses yang dimaksud, tindakan yang diminta, serta cara aman untuk dihubungi."),
        section("verifikasi", "Verifikasi dan penanganan", "Pengelola dapat meminta informasi tambahan yang wajar untuk memastikan pemohon berwenang atas data tersebut. Permintaan ditinjau sesuai ketentuan hukum, kepentingan pihak lain, dan kewajiban administrasi."),
        section("hasil", "Hasil permintaan", "Pengelola menyampaikan hasil, kebutuhan klarifikasi, atau alasan pembatasan apabila permintaan tidak dapat dipenuhi seluruhnya. Penghapusan tidak dilakukan apabila terdapat kewajiban penyimpanan yang sah."),
      ]),
    document("publikasi", "publikasi", "Kebijakan Publikasi & Klasifikasi Informasi", "Transparansi",
      "Prinsip penetapan informasi yang dapat dipublikasikan dan informasi yang harus dibatasi.", "published", [
        section("klasifikasi", "Klasifikasi informasi", "Informasi organisasi dapat dikelompokkan sebagai publik, internal, terbatas, atau rahasia sesuai isi, tujuan, dan risiko pengungkapan. Label publik harus diberikan oleh pihak yang berwenang."),
        section("dokumen", "Dokumen publik", "Hanya dokumen yang telah final, disetujui, dan diklasifikasikan untuk publik yang dapat ditampilkan pada halaman Dokumen Publik atau tautan terbuka. Draf, data anggota, dokumen personal, dan bahan pemeriksaan internal tidak dipublikasikan secara otomatis."),
        section("koreksi", "Koreksi dan penarikan", "Pengelola dapat memperbaiki, mengganti, atau menarik publikasi yang keliru, kedaluwarsa, melanggar hak pihak lain, atau tidak lagi layak dibuka."),
      ]),
    document("pengaduan", "pengaduan", "Kebijakan Pengaduan & Penanganan Permintaan", "Layanan",
      "Saluran dan prinsip penanganan keluhan, koreksi informasi, serta dugaan penyalahgunaan.", "published", [
        section("cakupan", "Hal yang dapat dilaporkan", "Pengunjung dapat menyampaikan pertanyaan, koreksi informasi, kendala akses, dugaan penyalahgunaan akun, kesalahan publikasi dokumen, atau pengaduan mengenai layanan digital."),
        section("pengajuan", "Cara menyampaikan", "Gunakan halaman Kontak dan sampaikan tujuan serta uraian yang jelas. Jangan menyertakan kata sandi, kode OTP, token berbagi, atau data pribadi yang tidak diperlukan."),
        section("tindak-lanjut", "Tindak lanjut", "Pengelola memeriksa laporan dan meneruskannya kepada pihak yang berwenang. Waktu penyelesaian mengikuti tingkat urgensi dan ketersediaan informasi; target waktu resmi akan ditetapkan organisasi."),
      ]),
    document("penyangkalan", "penyangkalan", "Pernyataan Penyangkalan", "Ketentuan layanan",
      "Batas penggunaan informasi, ketersediaan layanan, dan tanggung jawab pengguna.", "published", [
        section("informasi", "Informasi umum", "Informasi pada situs disediakan untuk mendukung komunikasi dan administrasi organisasi. Informasi dapat berubah dan tidak otomatis menjadi keputusan resmi kecuali ditetapkan melalui mekanisme organisasi yang berwenang."),
        section("nasihat", "Bukan nasihat profesional", "Materi umum pada situs bukan pengganti nasihat hukum, perpajakan, keuangan, atau teknis pertanian yang disesuaikan dengan keadaan masing-masing."),
        section("ketersediaan", "Ketersediaan layanan", "Akses dapat terganggu karena pemeliharaan, jaringan, gangguan penyedia, atau keadaan di luar kendali pengelola. Pengelola berupaya menjaga layanan, tetapi tidak menjamin akses tanpa gangguan."),
      ]),
    document("aksesibilitas", "aksesibilitas", "Pernyataan Aksesibilitas", "Layanan",
      "Komitmen perbaikan aksesibilitas dan cara melaporkan kendala penggunaan.", "published", [
        section("komitmen", "Komitmen", "Situs dikembangkan agar dapat digunakan pada berbagai ukuran layar dan terus diperbaiki dari sisi keterbacaan, navigasi papan ketik, label kontrol, kontras, dan struktur konten. Pernyataan ini bukan klaim bahwa seluruh halaman telah lulus audit aksesibilitas."),
        section("kendala", "Melaporkan kendala", "Laporkan halaman, perangkat, peramban, dan bagian yang sulit digunakan melalui halaman Kontak. Hindari mengirim informasi login atau data pribadi yang tidak diperlukan."),
      ]),
    document("bantuan", "bantuan", "Pusat Bantuan & Dukungan Pengguna", "Layanan",
      "Panduan umum memperoleh bantuan atas akses dan penggunaan situs.", "published", [
        section("akun", "Akun dan akses", "Gunakan akun yang diberikan atau disetujui pengelola. Apabila tidak dapat masuk, periksa alamat akun dan hubungi petugas resmi. Jangan meminta atau membagikan kata sandi pengguna lain."),
        section("data", "Data dan dokumen", "Gunakan fitur sesuai hak akses. Apabila dokumen tidak dapat dibuka atau tautan berbagi kedaluwarsa, hubungi pengelola dokumen atau ajukan permintaan melalui halaman Kontak."),
        section("kontak", "Menghubungi pengelola", "Gunakan informasi kontak yang ditampilkan pada halaman Kontak. Kanal yang belum diverifikasi tidak boleh dianggap sebagai alamat layanan resmi."),
      ]),
  ],
};

interface SettingsRow { setting_value: unknown; }

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function normalizePublicPolicySettings(input: unknown): PublicPolicySettings {
  if (!isRecord(input)) return DEFAULT_PUBLIC_POLICY_SETTINGS;
  const documents = Array.isArray(input.documents)
    ? input.documents.filter(isRecord).map((raw, index) => ({
        id: typeof raw.id === "string" ? raw.id : "policy-" + index,
        slug: typeof raw.slug === "string" ? raw.slug : "policy-" + index,
        title: typeof raw.title === "string" ? raw.title : "",
        category: typeof raw.category === "string" ? raw.category : "Kebijakan",
        summary: typeof raw.summary === "string" ? raw.summary : "",
        version: typeof raw.version === "string" ? raw.version : "1.0",
        effectiveDate: typeof raw.effectiveDate === "string" ? raw.effectiveDate : "",
        status: raw.status === "published" || raw.status === "inactive" ? raw.status : "draft",
        sections: Array.isArray(raw.sections) ? raw.sections.filter(isRecord).map((item, sectionIndex) => ({
          id: typeof item.id === "string" ? item.id : "section-" + index + "-" + sectionIndex,
          heading: typeof item.heading === "string" ? item.heading : "",
          body: typeof item.body === "string" ? item.body : "",
        })) : [],
      }))
    : DEFAULT_PUBLIC_POLICY_SETTINGS.documents;

  return {
    enabled: input.enabled !== false,
    documents,
  };
}

export async function getPublicPolicySettings(): Promise<PublicPolicySettings> {
  try {
    const sql = getV9Sql();
    const result = await sql`SELECT setting_value
      FROM v9.system_settings
      WHERE organization_id = (
        SELECT id FROM v9.organizations
        WHERE slug = 'srikandi-buana' AND status = 'active'
        LIMIT 1
      )
        AND setting_key = 'public_policies'
        AND visibility = 'public'
      LIMIT 1`;
    const row = rowsFromResult<SettingsRow>(result)[0];
    return row ? normalizePublicPolicySettings(row.setting_value) : DEFAULT_PUBLIC_POLICY_SETTINGS;
  } catch (reason) {
    const errorName = reason instanceof Error && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(reason.name) ? reason.name : "UnknownError";
    console.warn("[public-policies] Defaults used", errorName);
    return { ...DEFAULT_PUBLIC_POLICY_SETTINGS, enabled: false };
  }
}
