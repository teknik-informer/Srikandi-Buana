import Link from "next/link";
import type { Metadata } from "next";
import { ORG } from "@/config/org";
import { FIELDS } from "@/config/fields";
import { MEMBERS } from "@/data/organization";
import { FieldMark } from "@/components/brand";
import { Card, CardHeader, Badge, Notice } from "@/components/ui";

export const metadata: Metadata = {
  title: "Profil & Struktur",
  description:
    "Profil Kelompok Wanita Tani Srikandi Buana, sejarah, struktur organisasi, keanggotaan, dan dasar kerja empat bidang resmi.",
};

const MILESTONES = [
  { year: "2016", text: "Kelompok dibentuk oleh 24 perempuan tani; akta pendirian disahkan." },
  { year: "2018", text: "Pendampingan teknis pertama dari BPP Kedu; pencatatan lahan dimulai." },
  { year: "2020", text: "Kebun bersama dan rumah jemur dibangun; produksi kopi mulai disortasi terpisah." },
  { year: "2022", text: "Kelas keterampilan rutin berjalan dua kali setahun; anggota melewati 80 orang." },
  { year: "2024", text: "Struktur pengurus periode 2024–2027 ditetapkan." },
  { year: "2026", text: "Sistem digital organisasi disiapkan agar pencatatan, keuangan, dan pelaporan lebih terbuka." },
];

export default function ProfilPage() {
  const pengurus = MEMBERS.filter((m) => ["Ketua", "Sekretaris", "Bendahara"].includes(m.role));

  return (
    <div className="sb-shell py-12">
      <div className="max-w-3xl">
        <div className="sb-label mb-2">Profil organisasi</div>
        <h1 className="font-display text-[34px] leading-tight font-semibold text-ink sm:text-[42px]">
          Sepuluh tahun merawat lahan dan kepercayaan.
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-ink2">
          {ORG.legalName} adalah kelompok perempuan tani di {ORG.village}, {ORG.district},{" "}
          {ORG.regency}. Kami mengelola kebun, mengadakan pelatihan, dan memasarkan produk anggota
          dengan pencatatan yang dapat diperiksa.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          { k: "Berdiri", v: ORG.founded },
          { k: "Anggota", v: String(ORG.memberCount) },
          { k: "Bidang resmi", v: String(ORG.activeFields) },
        ].map((s) => (
          <div key={s.k} className="sb-card px-5 py-4">
            <div className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-muted">{s.k}</div>
            <div className="font-display text-[28px] font-semibold text-primary-800">{s.v}</div>
          </div>
        ))}
      </div>

      {/* Sejarah */}
      <section id="sejarah" className="mt-14 scroll-mt-24">
        <h2 className="font-display text-[26px] font-semibold text-ink">Sejarah & perjalanan</h2>
        <div className="mt-6 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="overflow-hidden rounded-[18px] border border-line">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={"/images/rumah-jemur.jpg"} alt="Rumah jemur kopi bersama di Ngadimulyo" className="h-full min-h-[280px] w-full object-cover" width={900} height={700} />
          </div>
          <ol className="relative border-l border-line pl-6">
            {MILESTONES.map((m) => (
              <li key={m.year} className="mb-6 last:mb-0">
                <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full bg-primary-500 ring-4 ring-paper" />
                <div className="font-display text-[17px] font-semibold text-primary-800">{m.year}</div>
                <p className="mt-1 text-[13px] leading-relaxed text-ink2">{m.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Struktur */}
      <section id="struktur" className="mt-14 scroll-mt-24">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-[26px] font-semibold text-ink">Struktur organisasi</h2>
          <Badge tone="neutral">Status resmi &amp; konfigurasi aplikasi dicatat terpisah</Badge>
        </div>
        <p className="mt-2 max-w-2xl text-[13px] text-muted">
          Pengurus harian menjalankan keputusan organisasi. Empat bidang resmi bekerja sesuai mandat
          masing-masing, dengan koordinator definitif menunggu keputusan resmi organisasi.
        </p>

        <div className="mt-6 grid gap-3.5 lg:grid-cols-3">
          {pengurus.map((m) => (
            <Card key={m.id} className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-100 font-display text-[15px] font-semibold text-primary-800">
                  {m.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                </div>
                <div>
                  <div className="text-[14px] font-semibold text-ink">{m.name}</div>
                  <div className="text-[11.5px] font-medium text-primary-700">{m.role}</div>
                </div>
              </div>
              <dl className="mt-4 space-y-1.5 border-t border-line pt-3 text-[11.5px]">
                <div className="flex justify-between"><dt className="text-muted">Cakupan</dt><dd className="font-medium text-ink2">{m.scope}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Bergabung</dt><dd className="font-medium text-ink2">{m.joined}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Masa jabatan</dt><dd className="font-medium text-ink2">{m.role === "Ketua" ? "2024–2027" : "2024–2027"}</dd></div>
              </dl>
            </Card>
          ))}
        </div>

        <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
          {FIELDS.map((f) => (
            <Card key={f.fieldId} className="p-5">
              <div className="flex items-start gap-3">
                <FieldMark icon={f.icon} accent={f.accent} />
                <div className="min-w-0">
                  <div className="text-[14px] font-semibold text-ink">{f.name}</div>
                  <div className="mt-1 text-[11.5px] text-muted">
                    {f.teamSize} anggota tim · {f.modules.length} modul operasional
                  </div>
                </div>
              </div>
              <p className="mt-3 text-[12.5px] leading-relaxed text-ink2">{f.mandate}</p>
              <div className="mt-3 rounded-sb-sm border border-dashed border-line-strong bg-paper px-3 py-2 text-[11.5px] text-muted">
                <div><span className="font-semibold text-ink2">Dasar keputusan:</span> {f.decision.kind}</div>
                <div>Nomor: {f.decision.number} · Tanggal: {f.decision.date}</div>
                <div>Koordinator: {f.coordinator}</div>
              </div>
            </Card>
          ))}
        </div>
        <div className="mt-4">
          <Notice tone="warning" title="Catatan atribut yang belum tercatat">
            Nomor dan tanggal pengesahan bidang, nama koordinator definitif, dan masa berlaku kerja
            bertanda <strong>“Belum tercatat”</strong> sesuai blueprint §28 — sistem tidak mengarang
            data organisasi. Atribut akan diperbarui melalui Organization Studio ketika dokumen
            pengesahan tersedia.
          </Notice>
        </div>
      </section>

      {/* Keanggotaan */}
      <section id="keanggotaan" className="mt-14 scroll-mt-24">
        <h2 className="font-display text-[26px] font-semibold text-ink">Keanggotaan</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader title="Siapa yang dapat bergabung" subtitle="Sesuai praktik organisasi yang berlaku" />
            <ul className="space-y-2.5 px-5 py-4 text-[13px] text-ink2">
              <li>Perempuan tani atau pelaku usaha tani di Ngadimulyo dan wilayah sekitar Kedu.</li>
              <li>Bersedia mengikuti kegiatan kelompok dan aturan organisasi.</li>
              <li>Mengisi formulir minat bergabung dan mengikuti verifikasi Bidang Organisasi.</li>
            </ul>
          </Card>
          <Card>
            <CardHeader title="Yang perlu diketahui" subtitle="Dua proses yang sering tertukar" />
            <ul className="space-y-2.5 px-5 py-4 text-[13px] text-ink2">
              <li>Pendaftaran minat <strong>bukan</strong> keanggotaan resmi.</li>
              <li>Akun portal diberikan setelah keanggotaan disetujui — terpisah dari pencatatan anggota.</li>
              <li>Besaran iuran/kontribusi: <strong>{ORG.duesStatus}</strong> (blueprint §28).</li>
              <li>Status legalitas yayasan/koperasi: <strong>{ORG.legalStatus}</strong> (belum tercatat).</li>
            </ul>
          </Card>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/gabung" className="sb-btn sb-btn-primary">Isi formulir minat bergabung</Link>
          <Link href="/dokumen" className="sb-btn sb-btn-outline">Lihat dokumen publik</Link>
        </div>
      </section>
    </div>
  );
}
