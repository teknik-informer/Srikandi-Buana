"use client";

/**
 * Site settings editor — grouped into four tabs so the page stays short and
 * precise: branding, contact, social links, and the bottom bar. Every write
 * goes through the store reducer (`site.update` / `site.social`) so it lands in
 * the audit trail, and is mirrored to the public footer through
 * lib/site-settings.ts so the change is visible without a deploy.
 */
import { useEffect, useRef, useState } from "react";
import { Check, ExternalLink, ImagePlus, RotateCcw, Save, Trash2 } from "lucide-react";
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

function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onChange}
      className={`inline-flex h-8 w-14 shrink-0 items-center rounded-full border px-0.5 transition ${
        on ? "border-primary bg-primary" : "border-line bg-surface2"
      }`}
    >
      <span className={`h-6 w-6 rounded-full bg-white shadow transition ${on ? "translate-x-[25px]" : ""}`} />
    </button>
  );
}

export function SiteSettingsPanel() {
  const { state, actor, exec } = useStore();
  const saved = state.site;
  const [draft, setDraft] = useState<SiteSettings>(saved);
  const [dirty, setDirty] = useState(false);
  const [tab, setTab] = useState<TabKey>("branding");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(loadSiteSettings());
    setDirty(false);
  }, []);

  const patch = (p: Partial<Omit<SiteSettings, "social">>) => {
    setDraft((d) => ({ ...d, ...p }));
    setDirty(true);
  };

  const patchSocial = (key: SocialKey, p: { href?: string; on?: boolean }) => {
    setDraft((d) => ({
      ...d,
      social: d.social.map((s) => (s.key === key ? { ...s, ...p } : s)),
    }));
    setDirty(true);
  };

  const save = () => {
    const r1 = exec({ type: "site.update", patch: draft, actor });
    const r2 = exec({ type: "site.social", key: "instagram", actor });
    if (!r1.ok || !r2.ok) return;
    saveSiteSettings(draft);
    setDirty(false);
  };

  const reset = () => {
    setDraft(saved);
    saveSiteSettings(saved);
    setDirty(false);
  };

  const upload = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 400_000) {
      // keep the browser store healthy: a wordmark never needs more than this
      alert("Gambar terlalu besar (maks. 400 KB). Perkecil dulu, lalu unggah lagi.");
      return;
    }
    const fr = new FileReader();
    fr.onload = () => patch({ brandImage: String(fr.result) });
    fr.readAsDataURL(file);
  };

  const live = draft.social.filter((s) => s.on).length;

  return (
    <div id="pengaturan">
      <Card>
        <CardHeader
          title="Pengaturan situs"
          subtitle="Identitas footer, kontak, dan media sosial — tersimpan di jejak audit dan langsung tampil di situs publik."
          action={<Badge tone={dirty ? "warning" : "success"}>{dirty ? "Belum disimpan" : "Tersimpan"}</Badge>}
        />

        {/* tabs */}
        <div role="tablist" aria-label="Kategori pengaturan" className="flex flex-wrap gap-1 border-b border-line px-3 pt-3">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.key)}
                className={`-mb-px rounded-t-[9px] border border-b-0 px-3.5 py-2 text-left transition ${
                  active
                    ? "border-line bg-white text-ink"
                    : "border-transparent text-muted hover:bg-surface2 hover:text-ink2"
                }`}
              >
                <span className="block text-[12.5px] font-semibold">{t.label}</span>
                <span className={`block text-[10.5px] ${active ? "text-muted" : "text-muted2"}`}>{t.hint}</span>
              </button>
            );
          })}
        </div>

        <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[1fr_340px]">
          {/* ── panel ── */}
          <div>
            {tab === "branding" && (
              <div className="space-y-4">
                <div>
                  <div className="text-[12px] font-semibold text-ink">Logo footer</div>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
                    Pakai gambar yang sudah memuat teks agar seragam dengan header. Pilih aset bawaan
                    atau unggah sendiri (PNG transparan, maks. 400 KB).
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
                            active ? "border-primary ring-2 ring-primary/20" : "border-line hover:border-[var(--sb-border-strong)]"
                          }`}
                        >
                          <span className="grid h-[54px] place-items-center rounded-[6px] bg-[#0b3320]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={c.src} alt="" aria-hidden className="max-h-[40px] max-w-[86%] object-contain" />
                          </span>
                          <span className="mt-1.5 block text-[11.5px] font-semibold text-ink">{c.label}</span>
                          <span className="block text-[10px] leading-snug text-muted2">{c.note}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
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
                    <button type="button" onClick={() => fileRef.current?.click()} className="sb-btn sb-btn-outline !py-1.5 text-[12px]">
                      <ImagePlus size={14} />
                      Unggah logo
                    </button>
                    {draft.brandImage.startsWith("data:") && (
                      <span className="inline-flex items-center gap-1.5 text-[11px] text-muted">
                        <Badge tone="info">Logo unggahan</Badge>
                        <button
                          type="button"
                          onClick={() => patch({ brandImage: "/brand/wordmark-on-dark.png" })}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                        >
                          <Trash2 size={12} /> hapus
                        </button>
                      </span>
                    )}
                  </div>
                </div>

                <label className="block">
                  <span className="text-[12px] font-semibold text-ink">Nama pada footer</span>
                  <span className="mt-0.5 block text-[11px] leading-relaxed text-muted">
                    Dipakai untuk pembaca layar dan judul tautan; tetap disimpan meski logo bergambar.
                  </span>
                  <input className={input} value={draft.creditName} onChange={(e) => patch({ creditName: e.target.value })} maxLength={48} />
                </label>
                <label className="block">
                  <span className="text-[12px] font-semibold text-ink">Baris keterangan</span>
                  <span className="mt-0.5 block text-[11px] leading-relaxed text-muted">Satu kalimat pendek di bawah logo; boleh dikosongkan.</span>
                  <input className={input} value={draft.creditLine} onChange={(e) => patch({ creditLine: e.target.value })} maxLength={90} />
                </label>
              </div>
            )}

            {tab === "kontak" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-[12px] font-semibold text-ink">Email kontak</span>
                  <span className="mt-0.5 block text-[11px] text-muted">Ditampilkan sebagai tautan mailto.</span>
                  <input className={input} type="email" value={draft.email} onChange={(e) => patch({ email: e.target.value })} placeholder="halo@srikandibuana.org" />
                </label>
                <label className="block">
                  <span className="text-[12px] font-semibold text-ink">Jam layanan</span>
                  <span className="mt-0.5 block text-[11px] text-muted">Contoh: Senin–Jumat, 08.00–15.00 WIB</span>
                  <input className={input} value={draft.hours} onChange={(e) => patch({ hours: e.target.value })} maxLength={48} />
                </label>
                <div className="sm:col-span-2 rounded-[10px] border border-line bg-paper p-3 text-[11.5px] leading-relaxed text-muted">
                  Alamat kantor, desa, dan wilayah sengaja tidak lagi ditampilkan di footer. Bila nanti
                  dibutuhkan, tambahkan sebagai kolom pengaturan tersendiri.
                </div>
              </div>
            )}

            {tab === "sosial" && (
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-[11px] leading-relaxed text-muted">
                    Ikon tampil berurutan tepat di bawah branding.
                  </p>
                  <Badge tone="info">{live}/{draft.social.length} aktif</Badge>
                </div>
                <ul className="space-y-2">
                  {draft.social.map((s) => {
                    const Icon = SOCIAL_ICON[s.key];
                    return (
                      <li key={s.key} className="grid grid-cols-[110px_1fr_auto] items-center gap-2">
                        <span className="flex items-center gap-2 text-[12px] font-semibold text-ink">
                          <Icon size={14} className="text-muted" aria-hidden />
                          {SOCIAL_LABEL[s.key]}
                        </span>
                        <input
                          className={`${input} mt-0 font-mono text-[11px]`}
                          value={s.href}
                          onChange={(e) => patchSocial(s.key, { href: e.target.value })}
                          placeholder="https://…"
                          aria-label={`Tautan ${SOCIAL_LABEL[s.key]}`}
                        />
                        <Toggle on={s.on} onChange={() => patchSocial(s.key, { on: !s.on })} label={`Aktifkan ${SOCIAL_LABEL[s.key]}`} />
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {tab === "dasar" && (
              <ul className="divide-y divide-line">
                <li className="flex items-center justify-between gap-4 py-3 first:pt-0">
                  <span>
                    <span className="block text-[12.5px] font-semibold text-ink">Stamp blueprint</span>
                    <span className="block text-[11px] text-muted">Baris teknis versi & data contoh di dasar footer.</span>
                  </span>
                  <Toggle on={draft.showBlueprint} onChange={() => patch({ showBlueprint: !draft.showBlueprint })} label="Tampilkan stamp blueprint" />
                </li>
                <li className="flex items-center justify-between gap-4 py-3">
                  <span>
                    <span className="block text-[12.5px] font-semibold text-ink">Pengingat demo</span>
                    <span className="block text-[11px] text-muted">Menyebut bahwa isi situs dapat diubah dari studio.</span>
                  </span>
                  <Toggle on={draft.showDemoNotice} onChange={() => patch({ showDemoNotice: !draft.showDemoNotice })} label="Tampilkan pengingat demo" />
                </li>
                <li className="pt-3">
                  <div className="mb-2 text-[12px] font-semibold text-ink">Ikon bidang (landing)</div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {FIELDS.map((f) => (
                      <div key={f.slug} className="flex items-center gap-2.5 rounded-[10px] border border-line bg-white p-2">
                        <FieldMark icon={f.icon} accent={f.accent} />
                        <span className="text-[11.5px] font-medium leading-snug text-ink">{f.name}</span>
                      </div>
                    ))}
                  </div>
                </li>
              </ul>
            )}

            {/* actions */}
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
              <button type="button" onClick={save} disabled={!dirty} className="sb-btn sb-btn-primary !py-2 text-[12.5px] disabled:opacity-45">
                {dirty ? <Save size={15} /> : <Check size={15} />}
                {dirty ? "Simpan pengaturan" : "Tersimpan"}
              </button>
              <button type="button" onClick={reset} disabled={!dirty} className="sb-btn sb-btn-outline !py-2 text-[12.5px] disabled:opacity-45">
                <RotateCcw size={15} />
                Batalkan
              </button>
              <a href="/" target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-primary-700 hover:underline">
                Lihat di situs publik
                <ExternalLink size={12} />
              </a>
            </div>
          </div>

          {/* ── preview: in its own column, never sticky, so it can't overlap ── */}
          <aside aria-label="Pratinjau footer" className="h-fit self-start rounded-[14px] bg-[#082617] p-4 [background-image:linear-gradient(168deg,#071f12,#0b3320_72%,#0e3d26)]">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#e6c56a]/85">Pratinjau</span>
              <span className="text-[10px] text-[#8fb29b]">footer</span>
            </div>
            {draft.brandImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={draft.brandImage} alt="" aria-hidden className="h-[38px] w-auto max-w-[210px] object-contain object-left" />
            ) : null}
            {draft.creditLine ? (
              <div className="mt-2 text-[11px] leading-relaxed text-[#a8c7b1]">{draft.creditLine}</div>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {draft.social.filter((s) => s.on).map((s) => {
                const Icon = SOCIAL_ICON[s.key];
                return (
                  <span key={s.key} className="grid h-7 w-7 place-items-center rounded-full border border-white/15 bg-white/[0.06] text-[#d9e9dd]">
                    <Icon size={12} aria-hidden />
                  </span>
                );
              })}
            </div>
            {(draft.email || draft.hours) && (
              <div className="mt-3 space-y-1 text-[10.5px] leading-relaxed text-[#8fb29b]">
                {draft.email ? <p>{draft.email}</p> : null}
                {draft.hours ? <p>{draft.hours}</p> : null}
              </div>
            )}
            <div className="mt-3 border-t border-white/10 pt-2 text-[10px] text-[#7fa28c]">
              © 2026 Srikandi Buana · {draft.showBlueprint ? "Blueprint" : ""} {draft.showDemoNotice ? "· demo" : ""}
            </div>
          </aside>
        </div>
      </Card>
    </div>
  );
}
