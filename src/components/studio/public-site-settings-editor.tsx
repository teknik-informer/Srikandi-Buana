"use client";

import { useActionState, useState } from "react";
import { Plus, Trash2, Save } from "lucide-react";
import { savePublicSiteSettings, type SaveSiteSettingsState } from "@/app/actions/public-site-settings";
import {
  SITE_FEATURE_LABELS, SITE_HOME_LABELS,
  type PublicSiteSettings, type SiteFeatureKey, type SiteHomeSectionKey,
  type SiteMenuGroup, type SiteMenuItem, type SiteFooterGroup, type SiteSocialPlatform,
} from "@/lib/site-settings-schema";

type Tab = "umum" | "fitur" | "navigasi" | "footer" | "sosial";
const emptyResult: SaveSiteSettingsState = { ok: false, message: "" };
const makeId = (prefix: string) => prefix + "-" + Math.random().toString(36).slice(2, 9);

function Field({ label, value, onChange, maxLength = 240, placeholder = "", type = "text" }: {
  label: string; value: string; onChange: (value: string) => void;
  maxLength?: number; placeholder?: string; type?: "text" | "email" | "url" | "tel";
}) {
  return <label className="block min-w-0">
    <span className="mb-1 block text-[11px] font-semibold text-ink2">{label}</span>
    <input type={type} value={value ?? ""} maxLength={maxLength} placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)} className="sb-input w-full min-w-0" />
  </label>;
}

function Toggle({ label, description, checked, onChange }: {
  label: string; description?: string; checked: boolean; onChange: (value: boolean) => void;
}) {
  return <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-white px-3 py-3">
    <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#127e2f]" />
    <span className="min-w-0">
      <span className="block text-[12px] font-semibold text-ink">{label}</span>
      {description ? <span className="mt-0.5 block text-[10.5px] leading-relaxed text-muted">{description}</span> : null}
    </span>
  </label>;
}

function LinkEditor({ item, onPatch, onDelete }: {
  item: SiteMenuItem; onPatch: (patch: Partial<SiteMenuItem>) => void; onDelete: () => void;
}) {
  return <div className="grid gap-2 rounded-xl border border-line bg-paper/50 p-3 sm:grid-cols-[1fr_1.2fr_auto]">
    <Field label="Label tautan" value={item.label} onChange={(label) => onPatch({ label })} maxLength={80} />
    <Field label="Alamat / rute" value={item.href} onChange={(href) => onPatch({ href })} maxLength={500} placeholder="/profil" />
    <div className="flex items-end justify-end gap-2">
      <Toggle label="Tampilkan" checked={item.enabled} onChange={(enabled) => onPatch({ enabled })} />
      <button type="button" onClick={onDelete} aria-label="Hapus tautan" className="mb-0.5 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 bg-white text-red-700 hover:bg-red-50"><Trash2 size={14} /></button>
    </div>
    <div className="sm:col-span-3">
      <Field label="Keterangan singkat" value={item.desc} onChange={(desc) => onPatch({ desc })} maxLength={180} />
    </div>
  </div>;
}

export function PublicSiteSettingsEditor({ initialSettings }: { initialSettings: PublicSiteSettings }) {
  const [settings, setSettings] = useState<PublicSiteSettings>(initialSettings);
  const [tab, setTab] = useState<Tab>("umum");
  const [result, action, pending] = useActionState(savePublicSiteSettings, emptyResult);

  const patchIdentity = (patch: Partial<PublicSiteSettings["identity"]>) =>
    setSettings((s) => ({ ...s, identity: { ...s.identity, ...patch } }));
  const patchHero = (patch: Partial<PublicSiteSettings["hero"]>) =>
    setSettings((s) => ({ ...s, hero: { ...s.hero, ...patch } }));
  const patchContact = (patch: Partial<PublicSiteSettings["contact"]>) =>
    setSettings((s) => ({ ...s, contact: { ...s.contact, ...patch } }));

  function patchGroup(index: number, patch: Partial<SiteMenuGroup>) {
    setSettings((s) => {
      const groups = [...s.navigation.groups];
      const next = { ...groups[index], ...patch };
      next.items = next.columns.flatMap((column) => column.items);
      groups[index] = next;
      return { ...s, navigation: { ...s.navigation, groups } };
    });
  }
  function patchMenuItem(g: number, c: number, i: number, patch: Partial<SiteMenuItem>) {
    setSettings((s) => {
      const groups = [...s.navigation.groups];
      const group = { ...groups[g], columns: [...groups[g].columns] };
      const column = { ...group.columns[c], items: [...group.columns[c].items] };
      column.items[i] = { ...column.items[i], ...patch };
      group.columns[c] = column;
      group.items = group.columns.flatMap((entry) => entry.items);
      groups[g] = group;
      return { ...s, navigation: { ...s.navigation, groups } };
    });
  }
  function addGroup() {
    const group: SiteMenuGroup = {
      id: makeId("menu"), heading: "Kelompok menu baru", enabled: true,
      feature: { eyebrow: "Informasi", title: "Judul kelompok", body: "Keterangan kelompok menu.", href: "/profil", linkLabel: "Selengkapnya" },
      columns: [{ id: makeId("kolom"), heading: "Tautan", items: [] }], items: [],
    };
    setSettings((s) => ({ ...s, navigation: { ...s.navigation, groups: [...s.navigation.groups, group] } }));
  }
  function addMenuLink(g: number, c: number) {
    const link: SiteMenuItem = { id: makeId("link"), label: "Tautan baru", href: "/profil", desc: "", icon: "file", external: false, enabled: true };
    setSettings((s) => {
      const groups = [...s.navigation.groups];
      const group = { ...groups[g], columns: [...groups[g].columns] };
      group.columns[c] = { ...group.columns[c], items: [...group.columns[c].items, link] };
      group.items = group.columns.flatMap((entry) => entry.items);
      groups[g] = group;
      return { ...s, navigation: { ...s.navigation, groups } };
    });
  }
  function deleteMenuLink(g: number, c: number, i: number) {
    setSettings((s) => {
      const groups = [...s.navigation.groups];
      const group = { ...groups[g], columns: [...groups[g].columns] };
      group.columns[c] = { ...group.columns[c], items: group.columns[c].items.filter((_, index) => index !== i) };
      group.items = group.columns.flatMap((entry) => entry.items);
      groups[g] = group;
      return { ...s, navigation: { ...s.navigation, groups } };
    });
  }
  function deleteGroup(index: number) {
    setSettings((s) => ({ ...s, navigation: { ...s.navigation, groups: s.navigation.groups.filter((_, i) => i !== index) } }));
  }
  function patchFooterGroup(index: number, patch: Partial<SiteFooterGroup>) {
    setSettings((s) => {
      const groups = [...s.footer.groups];
      groups[index] = { ...groups[index], ...patch };
      return { ...s, footer: { ...s.footer, groups } };
    });
  }
  function addFooterGroup() {
    const group: SiteFooterGroup = { id: makeId("footer"), heading: "Kelompok baru", enabled: true, items: [] };
    setSettings((s) => ({ ...s, footer: { ...s.footer, groups: [...s.footer.groups, group] } }));
  }
  function addFooterLink(groupIndex: number) {
    const link: SiteMenuItem = { id: makeId("footer-link"), label: "Tautan baru", href: "/profil", desc: "", icon: "file", external: false, enabled: true };
    setSettings((s) => {
      const groups = [...s.footer.groups];
      groups[groupIndex] = { ...groups[groupIndex], items: [...groups[groupIndex].items, link] };
      return { ...s, footer: { ...s.footer, groups } };
    });
  }
  function patchFooterLink(g: number, i: number, patch: Partial<SiteMenuItem>) {
    setSettings((s) => {
      const groups = [...s.footer.groups];
      const group = { ...groups[g], items: [...groups[g].items] };
      group.items[i] = { ...group.items[i], ...patch };
      groups[g] = group;
      return { ...s, footer: { ...s.footer, groups } };
    });
  }
  function deleteFooterLink(g: number, i: number) {
    setSettings((s) => {
      const groups = [...s.footer.groups];
      groups[g] = { ...groups[g], items: groups[g].items.filter((_, index) => index !== i) };
      return { ...s, footer: { ...s.footer, groups } };
    });
  }
  function deleteFooterGroup(index: number) {
    setSettings((s) => ({ ...s, footer: { ...s.footer, groups: s.footer.groups.filter((_, i) => i !== index) } }));
  }
  function addSocial() {
    setSettings((s) => ({ ...s, socials: [...s.socials, { id: makeId("social"), platform: "instagram", href: "https://instagram.com/", enabled: false }] }));
  }
  function patchSocial(index: number, patch: Partial<PublicSiteSettings["socials"][number]>) {
    setSettings((s) => {
      const socials = [...s.socials];
      socials[index] = { ...socials[index], ...patch };
      return { ...s, socials };
    });
  }
  function deleteSocial(index: number) {
    setSettings((s) => ({ ...s, socials: s.socials.filter((_, i) => i !== index) }));
  }

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "umum", label: "Identitas & beranda" }, { id: "fitur", label: "Fitur situs" },
    { id: "navigasi", label: "Navigasi" }, { id: "footer", label: "Footer" }, { id: "sosial", label: "Kontak & sosial" },
  ];

  return <form action={action} className="space-y-4">
    <input type="hidden" name="settings_json" value={JSON.stringify(settings)} />
    <div className="flex flex-wrap gap-1.5 rounded-xl border border-line bg-paper p-1.5">
      {tabs.map((entry) => <button key={entry.id} type="button" onClick={() => setTab(entry.id)}
        className={"rounded-lg px-3 py-2 text-[11.5px] font-semibold transition " + (tab === entry.id ? "bg-white text-primary-800 shadow-sm" : "text-muted hover:text-ink")}>{entry.label}</button>)}
    </div>

    {tab === "umum" ? <div className="grid gap-4 xl:grid-cols-2">
      <section className="rounded-xl border border-line bg-white p-4">
        <h2 className="text-[13px] font-bold text-ink">Identitas & branding</h2>
        <p className="mb-4 mt-1 text-[10.5px] text-muted">Nama dan identitas situs pada header, footer, dan metadata.</p>
        <div className="grid gap-3">
          <Field label="Nama situs" value={settings.identity.siteName} onChange={(siteName) => patchIdentity({ siteName })} maxLength={100} />
          <Field label="Tagline" value={settings.identity.tagline} onChange={(tagline) => patchIdentity({ tagline })} maxLength={180} />
          <Field label="Path logo atau URL HTTPS" value={settings.identity.logoUrl} onChange={(logoUrl) => patchIdentity({ logoUrl })} maxLength={500} placeholder="/brand/wordmark-on-dark.png" />
          <Field label="Nama kredit" value={settings.identity.creditName} onChange={(creditName) => patchIdentity({ creditName })} maxLength={100} />
          <Field label="Baris kredit" value={settings.identity.creditLine} onChange={(creditLine) => patchIdentity({ creditLine })} maxLength={240} />
        </div>
      </section>
      <section className="rounded-xl border border-line bg-white p-4">
        <h2 className="text-[13px] font-bold text-ink">Konten utama beranda</h2>
        <p className="mb-4 mt-1 text-[10.5px] text-muted">Perbarui pesan utama tanpa mengganti struktur visual halaman.</p>
        <div className="grid gap-3">
          <Field label="Eyebrow" value={settings.hero.eyebrow} onChange={(eyebrow) => patchHero({ eyebrow })} maxLength={100} />
          <Field label="Judul utama" value={settings.hero.title} onChange={(title) => patchHero({ title })} maxLength={140} />
          <Field label="Subjudul" value={settings.hero.subtitle} onChange={(subtitle) => patchHero({ subtitle })} maxLength={180} />
          <label className="block"><span className="mb-1 block text-[11px] font-semibold text-ink2">Deskripsi</span>
            <textarea value={settings.hero.description} onChange={(event) => patchHero({ description: event.target.value })} maxLength={700} rows={3} className="sb-input h-auto w-full resize-y py-2" /></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Tombol utama" value={settings.hero.primaryLabel} onChange={(primaryLabel) => patchHero({ primaryLabel })} />
            <Field label="Rute utama" value={settings.hero.primaryHref} onChange={(primaryHref) => patchHero({ primaryHref })} />
            <Field label="Tombol kedua" value={settings.hero.secondaryLabel} onChange={(secondaryLabel) => patchHero({ secondaryLabel })} />
            <Field label="Rute kedua" value={settings.hero.secondaryHref} onChange={(secondaryHref) => patchHero({ secondaryHref })} />
          </div>
        </div>
      </section>
      <section className="rounded-xl border border-line bg-white p-4">
        <h2 className="mb-3 text-[13px] font-bold text-ink">Pemberitahuan situs</h2>
        <Toggle label="Tampilkan bar pemberitahuan" checked={settings.announcement.enabled} onChange={(enabled) => setSettings((s) => ({ ...s, announcement: { ...s.announcement, enabled } }))} />
        <label className="mt-3 block"><span className="mb-1 block text-[11px] font-semibold text-ink2">Isi pemberitahuan</span>
          <textarea value={settings.announcement.text} onChange={(event) => setSettings((s) => ({ ...s, announcement: { ...s.announcement, text: event.target.value } }))} rows={2} maxLength={300} className="sb-input h-auto w-full resize-y py-2" placeholder="Informasi singkat untuk pengunjung" /></label>
      </section>
      <section className="rounded-xl border border-line bg-white p-4">
        <h2 className="mb-3 text-[13px] font-bold text-ink">Susunan beranda</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {(Object.keys(SITE_HOME_LABELS) as SiteHomeSectionKey[]).map((key) =>
            <Toggle key={key} label={SITE_HOME_LABELS[key].label} description={SITE_HOME_LABELS[key].description} checked={settings.home[key]} onChange={(value) => setSettings((s) => ({ ...s, home: { ...s.home, [key]: value } }))} />)}
        </div>
      </section>
    </div> : null}

    {tab === "fitur" ? <section className="rounded-xl border border-line bg-white p-4">
      <h2 className="text-[13px] font-bold text-ink">Fitur halaman publik</h2>
      <p className="mb-4 mt-1 text-[10.5px] text-muted">Fitur yang dimatikan disembunyikan dari navigasi dan halaman publiknya ditutup. Data dan fungsi internal sumbernya tidak dihapus.</p>
      <div className="grid gap-2 md:grid-cols-2">
        {(Object.keys(SITE_FEATURE_LABELS) as SiteFeatureKey[]).map((key) =>
          <Toggle key={key} label={SITE_FEATURE_LABELS[key].label} description={SITE_FEATURE_LABELS[key].description} checked={settings.features[key]} onChange={(value) => setSettings((s) => ({ ...s, features: { ...s.features, [key]: value } }))} />)}
      </div>
      <div className="mt-4 rounded-lg border border-[#e9d9ae] bg-[#fffaf0] p-3 text-[11px] leading-relaxed text-[#735d35]">
        Menonaktifkan Produk publik hanya menyembunyikan halaman promosi, tautan publik, dan pemesanan. Daftar produk internal, persediaan, pesanan, POS, dan laporan Bidang Usaha tetap berjalan sesuai hak akses.
      </div>
    </section> : null}

    {tab === "navigasi" ? <div className="space-y-3">
      <section className="rounded-xl border border-line bg-white p-4">
        <h2 className="mb-3 text-[13px] font-bold text-ink">Pengaturan header</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          <Toggle label="Pencarian situs" checked={settings.navigation.showSearch} onChange={(showSearch) => setSettings((s) => ({ ...s, navigation: { ...s.navigation, showSearch } }))} />
          <Toggle label="Tautan kontak" checked={settings.navigation.showContact} onChange={(showContact) => setSettings((s) => ({ ...s, navigation: { ...s.navigation, showContact } }))} />
          <Toggle label="Tautan masuk" checked={settings.navigation.showLogin} onChange={(showLogin) => setSettings((s) => ({ ...s, navigation: { ...s.navigation, showLogin } }))} />
        </div>
        <div className="mt-3"><Field label="Tagline panel menu" value={settings.navigation.tagline} onChange={(tagline) => setSettings((s) => ({ ...s, navigation: { ...s.navigation, tagline } }))} maxLength={160} /></div>
      </section>
      {settings.navigation.groups.map((group, gi) =>
        <details key={group.id} className="rounded-xl border border-line bg-white">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
            <span className="text-[12px] font-bold text-ink">{group.heading}</span>
            <span className="text-[10px] text-muted">{group.items.length} tautan</span>
          </summary>
          <div className="space-y-4 border-t border-line p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Judul kelompok" value={group.heading} onChange={(heading) => patchGroup(gi, { heading })} maxLength={80} />
              <Toggle label="Tampilkan kelompok" checked={group.enabled} onChange={(enabled) => patchGroup(gi, { enabled })} />
              <Field label="Judul panel" value={group.feature.title} onChange={(title) => patchGroup(gi, { feature: { ...group.feature, title } })} maxLength={120} />
              <Field label="Eyebrow" value={group.feature.eyebrow} onChange={(eyebrow) => patchGroup(gi, { feature: { ...group.feature, eyebrow } })} maxLength={80} />
              <Field label="Tautan panel" value={group.feature.href} onChange={(href) => patchGroup(gi, { feature: { ...group.feature, href } })} maxLength={500} />
              <Field label="Label tautan panel" value={group.feature.linkLabel} onChange={(linkLabel) => patchGroup(gi, { feature: { ...group.feature, linkLabel } })} maxLength={80} />
            </div>
            <label className="block"><span className="mb-1 block text-[11px] font-semibold text-ink2">Deskripsi panel</span>
              <textarea value={group.feature.body} onChange={(event) => patchGroup(gi, { feature: { ...group.feature, body: event.target.value } })} maxLength={240} rows={2} className="sb-input h-auto w-full resize-y py-2" /></label>
            {group.columns.map((column, ci) =>
              <section key={column.id} className="space-y-2 rounded-xl bg-paper/70 p-3">
                <Field label="Judul kolom" value={column.heading} onChange={(heading) => {
                  const columns = [...group.columns]; columns[ci] = { ...column, heading }; patchGroup(gi, { columns });
                }} maxLength={80} />
                {column.items.map((entry, ii) =>
                  <LinkEditor key={entry.id} item={entry} onPatch={(patch) => patchMenuItem(gi, ci, ii, patch)} onDelete={() => deleteMenuLink(gi, ci, ii)} />)}
                <button type="button" onClick={() => addMenuLink(gi, ci)} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary-700"><Plus size={13} /> Tambah tautan</button>
              </section>)}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button type="button" onClick={() => patchGroup(gi, { columns: [...group.columns, { id: makeId("kolom"), heading: "Kolom baru", items: [] }] })} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-[11px] font-semibold text-ink2"><Plus size={13} /> Tambah kolom</button>
              <button type="button" onClick={() => deleteGroup(gi)} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-semibold text-red-700 hover:bg-red-50"><Trash2 size={13} /> Hapus kelompok</button>
            </div>
          </div>
        </details>)}
      <button type="button" onClick={addGroup} className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-primary-400 px-3 py-2.5 text-[11.5px] font-semibold text-primary-800 hover:bg-primary-50"><Plus size={14} /> Tambah kelompok menu</button>
    </div> : null}

    {tab === "footer" ? <div className="space-y-3">
      <section className="rounded-xl border border-line bg-white p-4">
        <h2 className="mb-3 text-[13px] font-bold text-ink">Tampilan footer</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          <Toggle label="Kanal sosial" checked={settings.footer.showSocial} onChange={(showSocial) => setSettings((s) => ({ ...s, footer: { ...s.footer, showSocial } }))} />
          <Toggle label="Kredit organisasi" checked={settings.footer.showCredit} onChange={(showCredit) => setSettings((s) => ({ ...s, footer: { ...s.footer, showCredit } }))} />
          <Toggle label="Hak cipta" checked={settings.footer.showCopyright} onChange={(showCopyright) => setSettings((s) => ({ ...s, footer: { ...s.footer, showCopyright } }))} />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Nama pemegang hak cipta" value={settings.identity.creditName} onChange={(creditName) => patchIdentity({ creditName })} />
          <Field label="Teks hak cipta" value={settings.footer.copyrightText} onChange={(copyrightText) => setSettings((s) => ({ ...s, footer: { ...s.footer, copyrightText } }))} />
        </div>
      </section>
      {settings.footer.groups.map((group, gi) =>
        <section key={group.id} className="space-y-3 rounded-xl border border-line bg-white p-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
            <Field label="Judul kelompok footer" value={group.heading} onChange={(heading) => patchFooterGroup(gi, { heading })} maxLength={80} />
            <Toggle label="Tampilkan" checked={group.enabled} onChange={(enabled) => patchFooterGroup(gi, { enabled })} />
            <button type="button" onClick={() => deleteFooterGroup(gi)} aria-label="Hapus kelompok footer" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-700 hover:bg-red-50"><Trash2 size={14} /></button>
          </div>
          {group.items.map((entry, ii) =>
            <LinkEditor key={entry.id} item={entry} onPatch={(patch) => patchFooterLink(gi, ii, patch)} onDelete={() => deleteFooterLink(gi, ii)} />)}
          <button type="button" onClick={() => addFooterLink(gi)} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary-700"><Plus size={13} /> Tambah tautan footer</button>
        </section>)}
      <button type="button" onClick={addFooterGroup} className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-primary-400 px-3 py-2.5 text-[11.5px] font-semibold text-primary-800"><Plus size={14} /> Tambah kelompok footer</button>
    </div> : null}

    {tab === "sosial" ? <div className="space-y-3">
      <section className="rounded-xl border border-line bg-white p-4">
        <h2 className="text-[13px] font-bold text-ink">Kontak organisasi</h2>
        <p className="mb-4 mt-1 text-[10.5px] text-muted">Isi hanya alamat dan kanal yang benar-benar dimiliki serta dikelola organisasi.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Email" type="email" value={settings.contact.email} onChange={(email) => patchContact({ email })} maxLength={254} />
          <Field label="Telepon" type="tel" value={settings.contact.phone} onChange={(phone) => patchContact({ phone })} maxLength={30} />
          <Field label="WhatsApp" type="tel" value={settings.contact.whatsapp} onChange={(whatsapp) => patchContact({ whatsapp })} maxLength={30} />
          <Field label="Jam layanan" value={settings.contact.officeHours} onChange={(officeHours) => patchContact({ officeHours })} maxLength={180} />
          <div className="sm:col-span-2"><Field label="Alamat sekretariat" value={settings.contact.address} onChange={(address) => patchContact({ address })} maxLength={500} /></div>
        </div>
      </section>
      {settings.socials.map((social, index) =>
        <div key={social.id} className="grid gap-2 rounded-xl border border-line bg-white p-3 sm:grid-cols-[180px_1fr_auto_auto] sm:items-end">
          <label className="block"><span className="mb-1 block text-[11px] font-semibold text-ink2">Platform</span>
            <select value={social.platform} onChange={(event) => patchSocial(index, { platform: event.target.value as SiteSocialPlatform })} className="sb-input w-full">
              <option value="instagram">Instagram</option><option value="youtube">YouTube</option><option value="facebook">Facebook</option><option value="whatsapp">WhatsApp</option><option value="tiktok">TikTok</option><option value="email">Email</option>
            </select>
          </label>
          <Field label="Alamat kanal" value={social.href} onChange={(href) => patchSocial(index, { href })} maxLength={500} />
          <Toggle label="Aktif" checked={social.enabled} onChange={(enabled) => patchSocial(index, { enabled })} />
          <button type="button" onClick={() => deleteSocial(index)} aria-label="Hapus kanal sosial" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-700 hover:bg-red-50"><Trash2 size={14} /></button>
        </div>)}
      <button type="button" onClick={addSocial} className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-primary-400 px-3 py-2.5 text-[11.5px] font-semibold text-primary-800"><Plus size={14} /> Tambah kanal sosial</button>
    </div> : null}

    <div className="sticky bottom-3 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white/95 p-3 shadow-lg backdrop-blur">
      <div className="min-w-0 text-[11px]" aria-live="polite">
        {result.message ? <span className={result.ok ? "font-semibold text-green-700" : "font-semibold text-red-700"}>{result.message}</span> : <span className="text-muted">Perubahan berlaku setelah disimpan.</span>}
      </div>
      <button type="submit" disabled={pending} className="sb-btn sb-btn-primary shrink-0 disabled:cursor-wait disabled:opacity-60">
        <Save size={14} /> {pending ? "Menyimpan…" : "Simpan pengaturan situs"}
      </button>
    </div>
  </form>;
}
