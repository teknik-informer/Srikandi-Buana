"use client";

import { useMemo, useState } from "react";
import { Plus, ArrowRight, Inbox, Send, CheckCheck } from "lucide-react";
import {
  Badge,
  Card,
  CardHeader,
  StatCard,
  StatusBadge,
} from "@/components/ui";
import {
  Btn,
  Field,
  Modal,
  NoRows,
  SearchBox,
  SearchProvider,
  Select,
  Segmented,
  TextInput,
  useSearch,
  match,
} from "@/components/act";
import { formatDateID } from "@/lib/format";
import {
  advanceSecretariatLetter,
  registerSecretariatLetter,
} from "@/app/actions/secretariat-letters";

type Direction = "masuk" | "keluar";
type LetterStatus = "baru" | "diproses" | "selesai";

export interface SecretariatLetter {
  id: string;
  reference_no: string;
  direction: Direction;
  number: string | null;
  subject: string;
  counterpart: string;
  date: string;
  status: LetterStatus;
  assignee: string;
}

export function SuratClient({
  initialRows,
  actorName,
  result,
  canWrite,
}: {
  initialRows: SecretariatLetter[];
  actorName: string;
  result?: string;
  canWrite: boolean;
}) {
  return (
    <SearchProvider>
      <Inner
        initialRows={initialRows}
        actorName={actorName}
        result={result}
        canWrite={canWrite}
      />
    </SearchProvider>
  );
}

function Inner({
  initialRows,
  actorName,
  result,
  canWrite,
}: {
  initialRows: SecretariatLetter[];
  actorName: string;
  result?: string;
  canWrite: boolean;
}) {
  const { q } = useSearch();
  const [dir, setDir] = useState<Direction>("masuk");
  const [open, setOpen] = useState(false);

  const counts = {
    masuk: initialRows.filter((letter) => letter.direction === "masuk").length,
    keluar: initialRows.filter((letter) => letter.direction === "keluar").length,
  };
  const baru = initialRows.filter((letter) => letter.status === "baru").length;
  const diproses = initialRows.filter((letter) => letter.status === "diproses").length;
  const selesai = initialRows.filter((letter) => letter.status === "selesai").length;

  const list = useMemo(
    () =>
      initialRows
        .filter((letter) => letter.direction === dir)
        .filter((letter) =>
          match(
            `${letter.reference_no} ${letter.number ?? ""} ${letter.subject} ${letter.counterpart} ${letter.assignee}`,
            q,
          ),
        )
        .sort((a, b) => b.date.localeCompare(a.date)),
    [initialRows, dir, q],
  );

  const messages: Record<string, { tone: "success" | "warning" | "danger"; text: string }> = {
    created: { tone: "success", text: "Registrasi surat berhasil disimpan dan tercatat pada audit." },
    updated: { tone: "success", text: "Status surat berhasil diperbarui." },
    duplicate: { tone: "danger", text: "Nomor surat ini sudah tercatat untuk arah surat yang sama." },
    transition: { tone: "warning", text: "Status telah berubah atau transisi yang diminta tidak diperbolehkan." },
    invalid: { tone: "danger", text: "Data registrasi tidak valid. Periksa kembali isian." },
    unavailable: { tone: "danger", text: "Organisasi belum tersedia untuk menyimpan registrasi." },
    error: { tone: "danger", text: "Registrasi belum tersimpan. Periksa koneksi dan coba kembali." },
  };

  return (
    <div className="pb-10">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
        <div>
          <div className="sb-label mb-1.5">Sekretariat</div>
          <h1 className="font-display text-[24px] leading-tight font-semibold text-ink sm:text-[27px]">
            Surat masuk &amp; keluar
          </h1>
          <p className="mt-1.5 max-w-2xl text-[13.5px] text-muted">
            Registrasi surat, penanggung jawab tindak lanjut, dan status penyelesaian. Nomor surat
            resmi mengikuti ketentuan penomoran organisasi.
          </p>
        </div>
        {canWrite ? (
          <Btn
            variant="primary"
            icon={<Plus size={15} />}
            onClick={() => setOpen(true)}
          >
            Registrasi surat
          </Btn>
        ) : null}
      </header>

      {result && messages[result] ? (
        <div
          role="status"
          className={`mb-4 rounded-[10px] border px-4 py-3 text-[12.5px] ${
            messages[result].tone === "success"
              ? "border-[#cbdcc1] bg-[#f2f7ee] text-[#38571a]"
              : messages[result].tone === "danger"
                ? "border-[#ecc9c3] bg-[var(--sb-danger-bg)] text-[var(--sb-danger)]"
                : "border-line bg-paper text-ink2"
          }`}
        >
          {messages[result].text}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Surat masuk"
          value={counts.masuk}
          note="Catatan arah masuk"
          tone="info"
          icon={<Inbox size={17} />}
        />
        <StatCard
          label="Surat keluar"
          value={counts.keluar}
          note="Catatan arah keluar"
          tone="accent"
          icon={<Send size={17} />}
        />
        <StatCard
          label="Perlu ditindak"
          value={baru}
          note="Status baru, belum diproses"
          tone={baru ? "warning" : "success"}
          icon={<ArrowRight size={17} />}
        />
        <StatCard
          label="Selesai"
          value={selesai}
          note={`${diproses} sedang diproses`}
          tone="success"
          icon={<CheckCheck size={17} />}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <Segmented<Direction>
          label="Arah surat"
          value={dir}
          onChange={setDir}
          options={[
            { key: "masuk", label: "Masuk", count: counts.masuk },
            { key: "keluar", label: "Keluar", count: counts.keluar },
          ]}
        />
        <SearchBox placeholder="Cari nomor, perihal, pengirim…" className="w-full sm:w-[320px]" />
      </div>

      <Card className="mt-4">
        <CardHeader
          title={dir === "masuk" ? "Surat masuk" : "Surat keluar"}
          subtitle="Urut tanggal terbaru · status diperbarui melalui tindakan tercatat"
          action={<Badge tone="neutral">{list.length} baris</Badge>}
        />
        <div className="sb-scroll">
          <table className="sb-table min-w-[930px]">
            <thead>
              <tr>
                <th>Nomor / referensi</th>
                <th>Perihal</th>
                <th>{dir === "masuk" ? "Pengirim" : "Tujuan"}</th>
                <th>Tanggal</th>
                <th>PIC</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {list.map((letter) => (
                <tr key={letter.id}>
                  <td className="whitespace-nowrap">
                    <div className="font-mono text-[11.5px] text-muted">
                      {letter.number ?? "Nomor resmi belum diisi"}
                    </div>
                    <div className="mt-1 font-mono text-[9.5px] text-muted2">{letter.reference_no}</div>
                  </td>
                  <td className="font-medium text-ink">{letter.subject}</td>
                  <td className="text-muted">{letter.counterpart}</td>
                  <td className="whitespace-nowrap text-muted">{formatDateID(letter.date, "short")}</td>
                  <td>{letter.assignee}</td>
                  <td>
                    {canWrite && letter.status !== "selesai" ? (
                      <form action={advanceSecretariatLetter}>
                        <input type="hidden" name="id" value={letter.id} />
                        <input
                          type="hidden"
                          name="next"
                          value={letter.status === "baru" ? "diproses" : "selesai"}
                        />
                        <button
                          type="submit"
                          title={
                            letter.status === "baru"
                              ? "Tandai sedang diproses"
                              : "Tandai selesai"
                          }
                          className="inline-flex min-h-[32px] items-center rounded-full transition hover:opacity-80"
                        >
                          <StatusBadge
                            status={
                              letter.status === "baru"
                                ? "Baru"
                                : letter.status === "diproses"
                                  ? "Diproses"
                                  : "Selesai"
                            }
                          />
                        </button>
                      </form>
                    ) : (
                      <StatusBadge
                        status={
                          letter.status === "baru"
                            ? "Baru"
                            : letter.status === "diproses"
                              ? "Diproses"
                              : "Selesai"
                        }
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {list.length === 0 ? <NoRows q={q} /> : null}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line px-4 py-2.5">
          <Badge tone="neutral">Nomor resmi tidak diada-adakan</Badge>
          <span className="text-[11px] text-muted">
            Referensi REG dibuat sistem; nomor surat resmi dapat diisi sesuai aturan organisasi.
          </span>
        </div>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Registrasi surat ${dir}`}
        description="Registrasi internal dibuat otomatis. Nomor resmi boleh diisi setelah diverifikasi."
        footer={
          <>
            <Btn variant="ghost" onClick={() => setOpen(false)}>Batal</Btn>
            <button type="submit" form="secretariat-letter-form" className="sb-btn sb-btn-primary">
              Simpan registrasi
            </button>
          </>
        }
      >
        <form id="secretariat-letter-form" action={registerSecretariatLetter} className="space-y-3">
          <input type="hidden" name="direction" value={dir} />
          <Field label="Perihal" required>
            {(id) => (
              <TextInput
                id={id}
                name="subject"
                required
                maxLength={300}
                placeholder="mis. Undangan rapat koordinasi desa"
              />
            )}
          </Field>
          <Field label={dir === "masuk" ? "Pengirim" : "Tujuan"} required>
            {(id) => (
              <TextInput
                id={id}
                name="counterpart"
                required
                maxLength={200}
                placeholder="mis. Dinas Pertanian Kab. Temanggung"
              />
            )}
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nomor surat resmi" hint="Isi setelah nomor diterima atau ditetapkan">
              {(id) => (
                <TextInput
                  id={id}
                  name="number"
                  maxLength={100}
                  placeholder="mis. 012/KWT-SB/XI/2026"
                />
              )}
            </Field>
            <Field label="Penanggung jawab" required>
              {(id) => (
                <Select id={id} name="assignee" defaultValue={actorName}>
                  {[actorName, "Sekretaris", "Ketua", "Bendahara", "Bidang Usaha", "Bidang Pertanian"]
                    .filter((value, index, values) => values.indexOf(value) === index)
                    .map((value) => <option key={value} value={value}>{value}</option>)}
                </Select>
              )}
            </Field>
          </div>
          <p className="text-[11px] text-muted2">
            Tanggal registrasi menggunakan tanggal lokal organisasi. Setiap pencatatan dan perubahan
            status masuk ke jejak audit.
          </p>
        </form>
      </Modal>
    </div>
  );
}
