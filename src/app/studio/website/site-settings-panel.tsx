"use client";

/**
 * Site settings editor — empat sub-tab: branding, kontak, sosial, baris dasar.
 *
 * Perbaikan dari versi sebelumnya:
 *
 * 1. `save()` dulu menjalankan `site.social` untuk kunci "instagram" pada
 *    SETIAP penyimpanan, apa pun tab yang sedang dibuka. Akibatnya jejak audit
 *    mencatat "Mengubah tautan sosial: instagram" setiap kali seseorang hanya
 *    mengganti email. Sekarang satu `site.update` per penyimpanan.
 *
 * 2. Pratinjau dulu hanya terlihat di tab Branding. Sekarang pratinjau berada
 *    di kolom kanan untuk SEMUA tab, jadi perubahan kontak dan sosial langsung
 *    terlihat tanpa berpindah tab.
 *
 * 3. `alert()` untuk berkas kebesaran diganti pesan inline — alert memblokir
 *    peramban, tidak bisa digayakan, dan hilang begitu diklik.
 *
 * Semua tulis tetap melewati reducer store (`site.update`) sehingga tercatat di
 * jejak audit, lalu dicerminkan ke footer publik lewat lib/site-settings.ts.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ExternalLink, ImagePlus, RotateCcw, Save, Trash2, TriangleAlert } from "lucide-react";
import { Badge, Card, CardHeader } from "@/components/ui";
import { useStore, SOCIAL_LABEL, type SiteSettings, type SocialKey } from "@/lib/store";
import { loadSiteSettings, saveSiteSettings } from "@/lib/site-settings";
import { SOCIAL_ICON } from "@/components/public-shell";
import { FIELDS } from "@/config/fields";
import { FieldMark } from "@/components/brand";

const input =
  "mt-1 w-full rounded-[8px] border border-line bg-white px-3 py-2 text-[13px] text-ink outline-none transition placeholder:text-muted2 focus:border-primary focus:ring-2 focus:ring-primary/15";

const BRAND_CHOICES = [
  { src: "/brand/wordmark-on-dark.png", label: "Wordmark terang", note: "Untuk latar hijau — sama dengan header" },
  { src: "/brand/wordmark.png", label: "Wordmark penuh", note: "Logo + teks pada latar terang" },
  { src: "/brand/emblem-gold.png", label: "Emblem saja", note: "Tanpa teks" },
];

type TabKey = "branding" | "kontak" | "sosial" | "dasar";

const TABS: { key: TabKey; label: string; hint: string }[] = [
  { key: "branding", label: "Branding", hint: "Logo & tagline" },
  { key: "kontak", label: "Kontak", hint: "Email & jam layanan" },
  { key: "sosial", label: "Media sosial", hint: "Tautan & status" },
  { key: "dasar", label: "Baris dasar", hint: "Stamp & pengingat" },
];

/** Ukuran unggahan maksimum — wordmark tidak pernah butuh lebih dari ini. */
const MAX_UPLOAD = 400_000;

function Toggle({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onChange}
      className={`inline-flex h-7 w-12 shrink-0 items-center rounded-full border px-0.5 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
        on ? "border-primary bg-primary" : "border-line bg-surface2"
      }`}
    >
      <span className={`h-5 w-5 rounded-full bg-white shadow transition ${on ? "translate-x-[21px]" : ""}`} />
    </button>
  );
}

/** Baris pengaturan dengan label + keterangan di kiri, kontrol di kanan. */
function Row({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <li className="flex items-center justify-between gap-4 py-3 first:pt-0">
      <span className="min-w-0">
        <span className="block text-[12.5px] font-semibold text-ink">{title}</span>
        {note ? <span className="mt-0.5 block text-[11px] leading-relaxed text-muted">{note}</span> : null}
      </span>
      {children}
    </li>
  );
}

export function SiteSettingsPanel() {
  const { state, actor, exec } = useStore();
  const saved = state.site;
  const [draft, setDraft] = useState<SiteSettings>(saved);
  const [dirty, setDirty] = useState(false);
  const [tab, setTab] = useState<TabKey>("branding");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(loadSiteSettings());
    setDirty(false);
  }, []);

  const patch = (p: Partial<Omit<SiteSettings, "social">>) => {
    setDraft((d) => ({ ...d, ...p }));
    setDirty(true);
    setSavedAt(null);
  };

  const patchSocial = (key: SocialKey, p: { href?: string; on?: boolean }) => {
    setDraft((d) => ({
      ...d,
      social: d.social.map((s) => (s.key === key ? { ...s, ...p } : s)),
    }));
    setDirty(true);
    setSavedAt(null);
  };

  const save = () => {
    // Satu tindakan, satu catatan audit. `draft.social` ikut dalam patch
    // sehingga perubahan tautan sosial tetap tercatat — tanpa memalsukan
    // perubahan "instagram" pada setiap penyimpanan.
    const r = exec({ type: "site.update", patch: draft, actor });
    if (!r.ok) return;
    saveSiteSettings(draft);
    setDirty(false);
    setSavedAt(new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }));
  };

  const reset = () => {
    setDraft(loadSiteSettings());
    setDirty(false);
    setUploadError(null);
    setSavedAt(null);
  };

  const upload = (file: File) => {
    setUploadError(null);
    if (!file.type.startsWith("image/")) {
      setUploadError("Berkas harus berupa gambar (PNG, WebP, atau SVG).");
      return;
    }
    if (file.size > MAX_UPLOAD) {
      const kb = Math.round(file.size / 1024);
      setUploadError(
        `Gambar ${kb} KB melebihi batas 400 KB. Perkecil dulu, lalu unggah lagi.`,
      );
      return;
    }
    const fr = new FileReader();
    fr.onload = () => patch({ brandImage: String(fr.result) });
    fr.readAsDataURL(file);
  };

  const liveSocial = draft.social.filter((s) => s.on).length;
  const isUploaded = draft.brandImage.startsWith("data:");

  /** Perubahan per tab — dipakai penanda "belum disimpan" pada label tab. */
  const changed = useMemo(() => {
    const keys: Record<TabKey, boolean> = {
      branding: draft.brandImage !== saved.brandImage || draft.creditName !== saved.creditName || draft.creditLine !== saved.creditLine,
      kontak: draft.email !== saved.email || draft.hours !== saved.hours,
      sosial: JSON.stringify(draft.social) !== JSON.stringify(saved.social),
      dasar: draft.showBlueprint !== saved.showBlueprint || draft.showDemoNotice !== saved.showDemoNotice,
    };
    return keys;
  }, [draft, saved]);

  return (
    <div id="pengaturan" className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      {/* ══ kolom formulir ═══════════════════════════════════════════════ */}
      <Card className="min-w-0">
        <CardHeader
          title="Pengaturan situs"
          subtitle="Identitas footer, kontak, dan media sosial — tersimpan di jejak audit dan langsung tampil di situs publik."
          action={
            <Badge tone={dirty ? "warning" : "success"}>
              {dirty ? "Belum disimpan" : savedAt ? `Tersimpan ${savedAt}` : "Tersimpan"}
            </Badge>
          }
        />

        {/* sub-tab */}
        <div
          role="tablist"
          aria-label="Kategori pengaturan"
          className="flex flex-wrap gap-1 border-b border-line px-3 pt-2.5"
        >
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                role="tab"
                type="button"
                aria-selected={active}
                onClick={() => setTab(t.key)}
                className={`relative -mb-px rounded-t-[9px] border border-b-0 px-3 py-1.5 text-left transition ${
                  active
                    ? "border-line bg-white text-ink"
                    : "border-transparent text-muted hover:bg-surface2 hover:text-ink2"
                }`}
              >
                <span className="flex items-center gap-1.5 text-[12px] font-semibold">
                  {t.label}
                  {changed[t.key] ? (
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-[var(--sb-warning)]"
                      title="Ada perubahan belum disimpan"
                      aria-label="Ada perubahan belum disimpan"
                    />
                  ) : null}
                </span>
                <span className={`block text-[10px] ${active ? "text-muted" : "text-muted2"}`}>{t.hint}</span>
              </button>
            );
          })}
        </div>

        <div className="p-4 sm:p-5">
          {/* ── BRANDING ─────────────────────────────────────────────── */}
          {tab === "branding" && (
            <div className="space-y-4">
              <div>
                <div className="text-[12px] font-semibold text-ink">Logo footer</div>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
                  Pakai gambar yang sudah memuat teks agar seragam dengan header. Pilih aset bawaan atau
                  unggah sendiri (PNG transparan, maks. 400 KB).
                </p>

                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {BRAND_CHOICES.map((c) => {
                    const active = draft.brandImage === c.src;
                    return (
                      <button
                        key={c.src}
                        type="button"
                        onClick={() => patch({ brandImage: c.src })}
                        aria-pressed={active}
                        className={`rounded-[10px] border p-2 text-left transition ${
                          active
                            ? "border-primary ring-2 ring-primary/20"
                            : "border-line hover:border-[var(--sb-border-strong)]"
                        }`}
                      >
                        <span className="grid h-[52px] place-items-center rounded-[6px] bg-[#0b3320]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={c.src} alt="" aria-hidden className="max-h-[38px] max-w-[86%] object-contain" />
                        </span>
                        <span className="mt-1.5 flex items-center gap-1 text-[11.5px] font-semibold text-ink">
                          {c.label}
                          {active ? <Check size={12} className="text-primary" aria-hidden /> : null}
                        </span>
                        <span className="block text-[10px] leading-snug text-muted2">{c.note}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/png,image/webp,image/svg+xml"
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) upload(f);
                      e.currentTarget.value = "";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="sb-btn sb-btn-outline !py-1.5 text-[12px]"
                  >
                    <ImagePlus size={14} aria-hidden />
                    Unggah logo
                  </button>
                  {isUploaded && (
                    <span className="inline-flex items-center gap-1.5 text-[11px] text-muted">
                      <Badge tone="info">Logo unggahan</Badge>
                      <button
                        type="button"
                        onClick={() => patch({ brandImage: "/brand/wordmark-on-dark.png" })}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                      >
                        <Trash2 size={12} aria-hidden /> hapus
                      </button>
                    </span>
                  )}
                </div>
                {uploadError ? (
                  <p className="mt-2 flex items-start gap-1.5 rounded-[8px] bg-[var(--sb-danger-bg)] px-2.5 py-2 text-[11px] leading-relaxed text-[var(--sb-danger)]">
                    <TriangleAlert size={13} className="mt-px shrink-0" aria-hidden />
                    {uploadError}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-3 border-t border-line pt-3.5 sm:grid-cols-2">
                <label className="block">
                  <span className="text-[12px] font-semibold text-ink">Nama pada footer</span>
                  <span className="mt-0.5 block text-[11px] leading-relaxed text-muted">
                    Untuk pembaca layar dan judul tautan; tetap disimpan meski logo bergambar.
                  </span>
                  <input
                    className={input}
                    value={draft.creditName}
                    onChange={(e) => patch({ creditName: e.target.value })}
                    maxLength={48}
                  />
                </label>
                <label className="block">
                  <span className="text-[12px] font-semibold text-ink">Baris keterangan</span>
                  <span className="mt-0.5 block text-[11px] leading-relaxed text-muted">
                    Satu kalimat pendek di bawah logo; boleh dikosongkan.
                  </span>
                  <input
                    className={input}
                    value={draft.creditLine}
                    onChange={(e) => patch({ creditLine: e.target.value })}
                    maxLength={90}
                  />
                </label>
              </div>
            </div>
          )}

          {/* ── KONTAK ───────────────────────────────────────────────── */}
          {tab === "kontak" && (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-[12px] font-semibold text-ink">Email kontak</span>
                  <span className="mt-0.5 block text-[11px] text-muted">Ditampilkan sebagai tautan mailto.</span>
                  <input
                    className={input}
                    type="email"
                    value={draft.email}
                    onChange={(e) => patch({ email: e.target.value })}
                    placeholder="halo@srikandibuana.org"
                  />
                </label>
                <label className="block">
                  <span className="text-[12px] font-semibold text-ink">Jam layanan</span>
                  <span className="mt-0.5 block text-[11px] text-muted">Contoh: Senin–Jumat, 08.00–15.00 WIB</span>
                  <input
                    className={input}
                    value={draft.hours}
                    onChange={(e) => patch({ hours: e.target.value })}
                    maxLength={48}
                  />
                </label>
              </div>
              <div className="rounded-[10px] border border-line bg-paper p-3 text-[11.5px] leading-relaxed text-muted">
                Alamat kantor, desa, dan wilayah sengaja tidak ditampilkan di footer. Bila nanti
                dibutuhkan, tambahkan sebagai kolom pengaturan tersendiri.
              </div>
            </div>
          )}

          {/* ── MEDIA SOSIAL ─────────────────────────────────────────── */}
          {tab === "sosial" && (
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[11px] leading-relaxed text-muted">
                  Ikon tampil berurutan tepat di bawah branding pada footer.
                </p>
                <Badge tone="info">
                  {liveSocial}/{draft.social.length} aktif
                </Badge>
              </div>
              <ul className="divide-y divide-line">
                {draft.social.map((s) => {
                  const Icon = SOCIAL_ICON[s.key];
                  return (
                    <li key={s.key} className="grid grid-cols-[104px_1fr_auto] items-center gap-2.5 py-2 first:pt-0">
                      <span className="flex items-center gap-2 text-[12px] font-semibold text-ink">
                        <Icon size={14} className={s.on ? "text-primary" : "text-muted2"} aria-hidden />
                        {SOCIAL_LABEL[s.key]}
                      </span>
                      <input
                        className={`${input} mt-0 font-mono text-[11px] ${s.on ? "" : "opacity-60"}`}
                        value={s.href}
                        onChange={(e) => patchSocial(s.key, { href: e.target.value })}
                        placeholder="https://…"
                        aria-label={`Tautan ${SOCIAL_LABEL[s.key]}`}
                      />
                      <Toggle
                        on={s.on}
                        onChange={() => patchSocial(s.key, { on: !s.on })}
                        label={`Aktifkan ${SOCIAL_LABEL[s.key]}`}
                      />
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* ── BARIS DASAR ──────────────────────────────────────────── */}
          {tab === "dasar" && (
            <ul className="divide-y divide-line">
              <Row
                title="Stamp blueprint"
                note="Baris teknis versi & data contoh di dasar footer."
              >
                <Toggle
                  on={draft.showBlueprint}
                  onChange={() => patch({ showBlueprint: !draft.showBlueprint })}
                  label="Tampilkan stamp blueprint"
                />
              </Row>
              <Row
                title="Pengingat demo"
                note="Menyebut bahwa isi situs dapat diubah dari studio."
              >
                <Toggle
                  on={draft.showDemoNotice}
                  onChange={() => patch({ showDemoNotice: !draft.showDemoNotice })}
                  label="Tampilkan pengingat demo"
                />
              </Row>
              <li className="pt-3">
                <div className="text-[12.5px] font-semibold text-ink">Ikon bidang (landing)</div>
                <div className="mb-2 text-[11px] text-muted">
                  Tanda visual per bidang; dipakai di kartu bidang pada beranda.
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {FIELDS.map((f) => (
                    <div
                      key={f.slug}
                      className="flex items-center gap-2.5 rounded-[10px] border border-line bg-white p-2"
                    >
                      <FieldMark icon={f.icon} accent={f.accent} />
                      <span className="text-[11.5px] font-medium leading-snug text-ink">{f.name}</span>
                    </div>
                  ))}
                </div>
              </li>
            </ul>
          )}

          {/* ── aksi ─────────────────────────────────────────────────── */}
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
            <button
              type="button"
              onClick={save}
              disabled={!dirty}
              className="sb-btn sb-btn-primary !py-2 text-[12.5px] disabled:opacity-45"
            >
              {dirty ? <Save size={15} aria-hidden /> : <Check size={15} aria-hidden />}
              {dirty ? "Simpan pengaturan" : "Tersimpan"}
            </button>
            <button
              type="button"
              onClick={reset}
              disabled={!dirty}
              className="sb-btn sb-btn-outline !py-2 text-[12.5px] disabled:opacity-45"
            >
              <RotateCcw size={15} aria-hidden />
              Batalkan
            </button>
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="ml-auto inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-primary-700 hover:underline"
            >
              Lihat di situs publik
              <ExternalLink size={12} aria-hidden />
            </a>
          </div>
        </div>
      </Card>

      {/* ══ pratinjau — selalu terlihat, tidak pernah sticky ══════════════ */}
      <aside
        aria-label="Pratinjau footer"
        className="h-fit self-start rounded-[14px] bg-[#082617] p-4 [background-image:linear-gradient(168deg,#071f12,#0b3320_72%,#0e3d26)]"
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#e6c56a]/85">
            Pratinjau langsung
          </span>
          <span className="text-[10px] text-[#8fb29b]">footer</span>
        </div>

        {draft.brandImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={draft.brandImage}
            alt=""
            aria-hidden
            className="h-[38px] w-auto max-w-[210px] object-contain object-left"
          />
        ) : null}

        {draft.creditLine ? (
          <div className="mt-2 text-[11px] leading-relaxed text-[#a8c7b1]">{draft.creditLine}</div>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-1.5">
          {draft.social.filter((s) => s.on).map((s) => {
            const Icon = SOCIAL_ICON[s.key];
            return (
              <span
                key={s.key}
                className="grid h-7 w-7 place-items-center rounded-full border border-white/15 bg-white/[0.06] text-[#d9e9dd]"
              >
                <Icon size={12} aria-hidden />
              </span>
            );
          })}
          {liveSocial === 0 ? (
            <span className="text-[10.5px] italic text-[#7fa28c]">Belum ada tautan aktif</span>
          ) : null}
        </div>

        {(draft.email || draft.hours) && (
          <div className="mt-3 space-y-1 text-[10.5px] leading-relaxed text-[#8fb29b]">
            {draft.email ? <p>{draft.email}</p> : null}
            {draft.hours ? <p>{draft.hours}</p> : null}
          </div>
        )}

        <div className="mt-3 border-t border-white/10 pt-2 text-[10px] text-[#7fa28c]">
          © 2026 {draft.creditName}
          {draft.showBlueprint ? " · Blueprint" : ""}
          {draft.showDemoNotice ? " · demo" : ""}
        </div>

        <p className="mt-3 rounded-[8px] bg-white/[0.05] px-2.5 py-2 text-[10px] leading-relaxed text-[#8fb29b]">
          Pratinjau memakai data draf. Situs publik berubah setelah Anda menekan Simpan.
        </p>
      </aside>
    </div>
  );
}
