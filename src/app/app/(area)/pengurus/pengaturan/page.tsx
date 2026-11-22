import Link from "next/link";
import type { Metadata } from "next";
import { ORG, BLUEPRINT_VERSION } from "@/config/org";
import { FIELDS } from "@/config/fields";
import { Badge, Card, CardHeader, Notice, PageHeader, StatCard } from "@/components/ui";

export const metadata: Metadata = { title: "Pengaturan Organisasi" };

type SettingRow = { label: string; value: string; status: "ditetapkan" | "belum" | "demo" };

const IDENTITAS: SettingRow[] = [
  { label: "Nama legal", value: ORG.legalName, status: "ditetapkan" },
  { label: "Nama singkat", value: ORG.shortName, status: "ditetapkan" },
  { label: "Tahun berdiri", value: ORG.founded, status: "ditetapkan" },
  { label: "Alamat sekretariat", value: ORG.address, status: "ditetapkan" },
  { label: "Pos-el", value: ORG.email, status: "demo" },
  { label: "Telepon / WhatsApp", value: ORG.phone, status: "demo" },
  { label: "Jam layanan", value: ORG.hours, status: "ditetapkan" },
];

const KEBIJAKAN: SettingRow[] = [
  { label: "Status badan hukum", value: ORG.legalStatus, status: "belum" },
  { label: "Kebijakan iuran anggota", value: ORG.duesStatus, status: "belum" },
  { label: "Masa bakti kepengurusan", value: "Belum tercatat", status: "belum" },
  { label: "Ketentuan hak suara", value: "Belum tercatat", status: "belum" },
  { label: "Kebijakan akuntansi", value: "Belum disahkan", status: "belum" },
  { label: "Format laporan resmi", value: "Belum ditetapkan", status: "belum" },
];

function Row({ r }: { r: SettingRow }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2 px-4 py-2.5">
      <div className="min-w-0">
        <div className="text-[12px] text-muted">{r.label}</div>
        <div className={`mt-0.5 text-[12.5px] font-medium ${r.status === "belum" ? "text-muted2 italic" : "text-ink"}`}>{r.value}</div>
      </div>
      <Badge tone={r.status === "ditetapkan" ? "success" : r.status === "demo" ? "info" : "warning"}>
        {r.status === "ditetapkan" ? "ditetapkan" : r.status === "demo" ? "data demo" : "belum ditetapkan"}
      </Badge>
    </div>
  );
}

export default function PengaturanOrganisasiPage() {
  const belum = [...IDENTITAS, ...KEBIJAKAN].filter((r) => r.status === "belum").length;

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Pengurus Harian"
        title="Pengaturan organisasi"
        description="Identitas dan kebijakan yang berlaku bagi seluruh platform. Nilai yang belum diputuskan ditandai secara eksplisit dan tidak diisi dengan asumsi."
        actions={<Link href="/studio/organisasi" className="sb-btn sb-btn-outline">Organization Studio</Link>}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Identitas terisi" value={IDENTITAS.length} note="Nama, alamat, kontak" />
        <StatCard label="Kebijakan menunggu" value={belum} note="Perlu keputusan resmi" tone="warning" />
        <StatCard label="Bidang resmi" value={FIELDS.length} note="Registry bidang (§8.3)" tone="info" />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Identitas organisasi" subtitle="Dipakai di seluruh dokumen dan situs publik" />
          <div className="divide-y divide-line">
            {IDENTITAS.map((r) => <Row key={r.label} r={r} />)}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Kebijakan & ketentuan"
            subtitle="Tidak ada nilai yang dikarang — kosong berarti belum diputuskan"
            action={<Badge tone="warning">{belum} belum ditetapkan</Badge>}
          />
          <div className="divide-y divide-line">
            {KEBIJAKAN.map((r) => <Row key={r.label} r={r} />)}
          </div>
        </Card>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Registry bidang resmi" subtitle="Pengesahan & tata perubahan diatur §8.3" action={<Link href="/studio/organisasi" className="text-[11.5px] font-semibold text-primary-700">Kelola →</Link>} />
          <div className="sb-scroll">
            <table className="sb-table min-w-[420px]">
              <thead><tr><th>Kode</th><th>Nama bidang</th><th>Status</th></tr></thead>
              <tbody>
                {FIELDS.map((f) => (
                  <tr key={f.fieldId}>
                    <td className="font-mono text-[11px] text-muted">{f.fieldId}</td>
                    <td className="font-medium text-ink">{f.name}</td>
                    <td><Badge tone="success">disahkan</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHeader title="Platform & versi" subtitle="Konfigurasi lingkungan demo" />
          <div className="divide-y divide-line">
            {[
              ["Blueprint", `V${BLUEPRINT_VERSION.replace(/^V/, "")}`],
              ["Design preset", "Hijau Bumi"],
              ["Mode data", "Demo berlabel"],
              ["Akuntansi eksternal", "Tidak ada (native)"],
              ["Basis data", "Belum tersambung"],
              ["Autentikasi", "Demo (cookie sisi klien)"],
            ].map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-3 px-4 py-2.5">
                <span className="text-[12px] text-muted">{k}</span>
                <span className="text-[12px] font-medium text-ink">{v}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-line px-4 py-2.5 text-[11px] text-muted2">
            <Link href="/studio" className="font-semibold text-primary-700">Studio Pengelola</Link> memegang konfigurasi tampilan dan aplikasi;
            pengaturan di halaman ini hanya untuk identitas dan kebijakan organisasi.
          </div>
        </Card>
      </div>

      <div className="mt-5">
        <Notice tone="info" title="Batas kewenangan">
          Perubahan pada registry bidang, kebijakan keuangan, dan struktur organisasi memerlukan keputusan resmi — bukan
          sekadar pengaturan aplikasi (§8.3, §1.3). Halaman ini menampilkan status, bukan tombol yang mengubah kebijakan.
        </Notice>
      </div>
    </div>
  );
}
