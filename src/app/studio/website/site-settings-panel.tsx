"use client";

/**
 * Site settings editor — the footer is content, so it is edited here, not in
 * code. Every write goes through the store reducer (`site.update` /
 * `site.social`) so it lands in the audit trail, and is mirrored to the public
 * footer through lib/site-settings.ts so the change is visible without a
 * deploy or even a reload.
 */
import { useEffect, useMemo, useState } from "react";
import { ExternalLink, RotateCcw, Save, Check } from "lucide-react";
import { Badge, Card, CardHeader } from "@/components/ui";
import { useStore, SOCIAL_LABEL, type SiteSettings, type SocialKey } from "@/lib/store";
import { loadSiteSettings, saveSiteSettings } from "@/lib/site-settings";
import { SOCIAL_ICON } from "@/components/public-shell";
import { FIELDS } from "@/config/fields";
import { FieldMark } from "@/components/brand";

const input =
  "mt-1 w-full rounded-[8px] border border-line bg-white px-3 py-2 text-[13px] text-ink outline-none transition placeholder:text-muted2 focus:border-primary focus:ring-2 focus:ring-primary/15";

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[12px] font-semibold text-ink">{label}</span>
      {hint ? <span className="mt-0.5 block text-[11px] leading-relaxed text-muted">{hint}</span> : null}
      {children}
    </label>
  );
}

export function SiteSettingsPanel() {
  const { state, actor, exec } = useStore();
  const saved = state.site;
  const [draft, setDraft] = useState<SiteSettings>(saved);
  const [dirty, setDirty] = useState(false);

  // Pick up whatever the store already holds (including a restored save).
  useEffect(() => {
    setDraft(loadSiteSettings());
    setDirty(false);
  }, []);

  const live = useMemo(
    () => draft.social.filter((s) => s.on).length,
    [draft.social],
  );

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

  return (
    <div id="pengaturan" className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <Card>
          <CardHeader
            title="Identitas di footer"
            subtitle="Tampil di bawah emblem. Kosongkan baris keterangan untuk menyembunyikannya."
            action={
              <Badge tone={dirty ? "warning" : "success"}>{dirty ? "Belum disimpan" : "Tersimpan"}</Badge>
            }
          />
          <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
            <Row label="Nama pada footer" hint="Contoh: Srikandi Buana">
              <input
                className={input}
                value={draft.creditName}
                onChange={(e) => patch({ creditName: e.target.value })}
                maxLength={48}
              />
            </Row>
            <Row label="Baris keterangan" hint="Satu kalimat pendek; boleh dikosongkan.">
              <input
                className={input}
                value={draft.creditLine}
                onChange={(e) => patch({ creditLine: e.target.value })}
                maxLength={90}
              />
            </Row>
            <Row label="Email kontak" hint="Ditampilkan sebagai tautan mailto.">
              <input
                className={input}
                type="email"
                value={draft.email}
                onChange={(e) => patch({ email: e.target.value })}
                placeholder="halo@srikandibuana.org"
              />
            </Row>
            <Row label="Jam layanan" hint="Contoh: Senin–Jumat, 08.00–15.00 WIB">
              <input
                className={input}
                value={draft.hours}
                onChange={(e) => patch({ hours: e.target.value })}
                maxLength={48}
              />
            </Row>
            <Row label="Tampilkan stamp blueprint" hint="Baris teknis di dasar footer.">
              <button
                type="button"
                role="switch"
                aria-checked={draft.showBlueprint}
                onClick={() => patch({ showBlueprint: !draft.showBlueprint })}
                className={`mt-1.5 inline-flex h-9 w-[74px] items-center rounded-full border px-1 transition ${
                  draft.showBlueprint ? "border-primary bg-primary" : "border-line bg-surface2"
                }`}
              >
                <span
                  className={`h-7 w-7 rounded-full bg-white shadow transition ${
                    draft.showBlueprint ? "translate-x-[34px]" : ""
                  }`}
                />
              </button>
            </Row>
            <Row label="Tampilkan pengingat demo" hint="Menyebut bahwa isi situs dapat diubah dari studio.">
              <button
                type="button"
                role="switch"
                aria-checked={draft.showDemoNotice}
                onClick={() => patch({ showDemoNotice: !draft.showDemoNotice })}
                className={`mt-1.5 inline-flex h-9 w-[74px] items-center rounded-full border px-1 transition ${
                  draft.showDemoNotice ? "border-primary bg-primary" : "border-line bg-surface2"
                }`}
              >
                <span
                  className={`h-7 w-7 rounded-full bg-white shadow transition ${
                    draft.showDemoNotice ? "translate-x-[34px]" : ""
                  }`}
                />
              </button>
            </Row>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Media sosial"
            subtitle={`Ikon tampil berurutan tepat di bawah branding. ${live} tautan aktif.`}
            action={<Badge tone="info">{live}/{draft.social.length} aktif</Badge>}
          />
          <ul className="divide-y divide-line">
            {draft.social.map((s) => {
              const Icon = SOCIAL_ICON[s.key];
              return (
                <li key={s.key} className="grid gap-2 px-4 py-3 sm:grid-cols-[132px_1fr_auto] sm:items-center sm:gap-3">
                  <span className="flex items-center gap-2 text-[12.5px] font-semibold text-ink">
                    <Icon size={15} className="text-muted" aria-hidden />
                    {SOCIAL_LABEL[s.key]}
                  </span>
                  <input
                    className={`${input} mt-0 font-mono text-[11.5px]`}
                    value={s.href}
                    onChange={(e) => patchSocial(s.key, { href: e.target.value })}
                    placeholder="https://…"
                    aria-label={`Tautan ${SOCIAL_LABEL[s.key]}`}
                  />
                  <button
                    type="button"
                    role="switch"
                    aria-checked={s.on}
                    aria-label={`Aktifkan ${SOCIAL_LABEL[s.key]}`}
                    onClick={() => patchSocial(s.key, { on: !s.on })}
                    className={`inline-flex h-8 w-14 items-center rounded-full border px-0.5 transition ${
                      s.on ? "border-primary bg-primary" : "border-line bg-surface2"
                    }`}
                  >
                    <span
                      className={`h-6 w-6 rounded-full bg-white shadow transition ${
                        s.on ? "translate-x-[25px]" : ""
                      }`}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <div className="space-y-4">
        <Card className="lg:sticky lg:top-20">
          <CardHeader title="Pratinjau footer" subtitle="Persis yang tampil di situs publik" />
          <div className="p-4">
            <div className="overflow-hidden rounded-[14px] bg-[#082617] p-4 [background-image:linear-gradient(168deg,#071f12,#0b3320_72%,#0e3d26)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/emblem-gold.png" alt="" aria-hidden className="h-9 w-9" />
              <div className="mt-2.5 font-display text-[22px] leading-none text-[#f4e6c3]">
                {draft.creditName || "—"}
              </div>
              {draft.creditLine ? (
                <div className="mt-1.5 text-[11px] leading-relaxed text-[#a8c7b1]">{draft.creditLine}</div>
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
              </div>
              {(draft.email || draft.hours) && (
                <div className="mt-3 text-[10.5px] leading-relaxed text-[#8fb29b]">
                  {draft.email}
                  {draft.email && draft.hours ? " · " : ""}
                  {draft.hours}
                </div>
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={save} disabled={!dirty} className="sb-btn sb-btn-primary !py-2 text-[12.5px] disabled:opacity-45">
                {dirty ? <Save size={15} /> : <Check size={15} />}
                {dirty ? "Simpan pengaturan" : "Tersimpan"}
              </button>
              <button type="button" onClick={reset} disabled={!dirty} className="sb-btn sb-btn-outline !py-2 text-[12.5px] disabled:opacity-45">
                <RotateCcw size={15} />
                Batalkan
              </button>
            </div>
            <a href="/" target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-primary-700 hover:underline">
              Lihat footer di situs publik
              <ExternalLink size={12} />
            </a>
          </div>
        </Card>

        <Card>
          <CardHeader title="Ikon bidang (landing)" subtitle="Dipakai pada kartu “Empat bidang resmi”" />
          <ul className="space-y-2 p-4">
            {FIELDS.map((f) => (
              <li key={f.slug} className="flex items-center gap-2.5">
                <FieldMark icon={f.icon} accent={f.accent} />
                <span className="text-[12px] font-medium text-ink">{f.name}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
