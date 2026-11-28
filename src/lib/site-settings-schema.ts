import { MEGA_MENU, MEGA_TAGLINE } from "@/config/navigation";
import { ORG } from "@/config/org";

export type SiteFeatureKey =
  | "productCatalogue" | "programs" | "training" | "activities" | "news"
  | "gallery" | "partnerships" | "documents" | "faq" | "membershipInterest" | "externalPortal";
export type SiteHomeSectionKey = "capabilities" | "fields" | "activities" | "products" | "transparency" | "join";

export interface SiteMenuItem {
  id: string; label: string; href: string; desc: string; icon: string; external: boolean; enabled: boolean;
}
export interface SiteMenuColumn { id: string; heading: string; items: SiteMenuItem[]; }
export interface SiteMenuGroup {
  id: string; heading: string; enabled: boolean;
  feature: { eyebrow: string; title: string; body: string; href: string; linkLabel: string };
  columns: SiteMenuColumn[]; items: SiteMenuItem[];
}
export interface SiteFooterGroup { id: string; heading: string; enabled: boolean; items: SiteMenuItem[]; }
export type SiteSocialPlatform = "instagram" | "youtube" | "facebook" | "whatsapp" | "tiktok" | "email";
export interface SiteSocialItem { id: string; platform: SiteSocialPlatform; href: string; enabled: boolean; }

export interface PublicProfileContent {
  schemaVersion: 1;
  intro: string;
  vision: string;
  missions: string[];
  galleryIntro: string;
  mapUrl: string;
  heroCredit: string;
  legacyHeroFileId: string;
  legacyLogoFileId: string;
  source: string;
  sourcePreservedInArchive: boolean;
}

export type PublicHeroVariant = "cinematic" | "split" | "editorial" | "minimal";

export interface PublicSiteSettings {
  schemaVersion: 1;
  identity: { siteName: string; tagline: string; logoUrl: string; creditName: string; creditLine: string };
  hero: { variant: PublicHeroVariant; imageUrl: string; imageAssetId: string; imageAlt: string; imagePositionX: number; imagePositionY: number; eyebrow: string; title: string; subtitle: string; description: string; primaryLabel: string; primaryHref: string; secondaryLabel: string; secondaryHref: string };
  contact: { email: string; phone: string; whatsapp: string; address: string; officeHours: string };
  announcement: { enabled: boolean; text: string };
  features: Record<SiteFeatureKey, boolean>;
  home: Record<SiteHomeSectionKey, boolean>;
  navigation: { showSearch: boolean; showContact: boolean; showLogin: boolean; tagline: string; groups: SiteMenuGroup[] };
  footer: { showSocial: boolean; showCredit: boolean; showCopyright: boolean; copyrightText: string; groups: SiteFooterGroup[] };
  socials: SiteSocialItem[];
  profileContent: PublicProfileContent;
}

const idOf = (value: string) => value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const menuGroups: SiteMenuGroup[] = MEGA_MENU.map((group, groupIndex) => {
  const groupId = idOf(group.heading) || "menu-" + groupIndex;
  const columns = group.columns.map((column, columnIndex) => ({
    id: groupId + "-column-" + (columnIndex + 1),
    heading: column.heading,
    items: column.items.map((item, itemIndex) => ({
      id: groupId + "-" + (columnIndex + 1) + "-" + (itemIndex + 1),
      label: item.label, href: item.href, desc: item.desc ?? "", icon: item.icon ?? "file",
      external: Boolean(item.external), enabled: true,
    })),
  }));
  return { id: groupId, heading: group.heading, enabled: true, feature: { ...group.feature }, columns, items: columns.flatMap((column) => column.items) };
});

const item = (id: string, label: string, href: string, icon: string): SiteMenuItem => ({
  id, label, href, icon, desc: "", external: false, enabled: true,
});
const footerGroups: SiteFooterGroup[] = [
  { id: "organisasi", heading: "Organisasi", enabled: true, items: [
    item("footer-profil", "Profil organisasi", "/profil", "users"),
    item("footer-documents", "Dokumen publik", "/dokumen", "file"),
    item("footer-faq", "Pertanyaan umum", "/faq", "help"),
  ]},
  { id: "kegiatan", heading: "Program & kegiatan", enabled: true, items: [
    item("footer-program", "Program", "/program", "clipboard-list"),
    item("footer-training", "Pelatihan", "/pelatihan", "graduation-cap"),
    item("footer-activities", "Kegiatan", "/kegiatan", "calendar"),
  ]},
  { id: "informasi", heading: "Informasi", enabled: true, items: [
    item("footer-news", "Kabar", "/kabar", "newspaper"),
    item("footer-gallery", "Galeri", "/galeri", "images"),
    item("footer-partnerships", "Kemitraan", "/kemitraan", "handshake"),
  ]},
  { id: "layanan", heading: "Layanan", enabled: true, items: [
    item("footer-contact", "Kontak", "/kontak", "phone"),
    item("footer-help", "Pusat bantuan", "/bantuan", "help-circle"),
    item("footer-login", "Masuk ruang kerja", "/masuk", "log-in"),
  ]},
];

export const DEFAULT_PUBLIC_SITE_SETTINGS: PublicSiteSettings = {
  schemaVersion: 1,
  identity: { siteName: ORG.shortName, tagline: ORG.tagline, logoUrl: "/brand/wordmark-alpha.png", creditName: ORG.shortName, creditLine: "" },
  hero: {
    variant: "cinematic", imageUrl: "/images/hero-pemanen.jpg", imageAssetId: "", imageAlt: "Aktivitas pertanian dan kebersamaan anggota Srikandi Buana", imagePositionX: 62, imagePositionY: 42,
    eyebrow: "Kelompok Wanita Tani", title: ORG.shortName, subtitle: "Bersama, Berkarya, Berdaya",
    description: "Ruang kerja bersama untuk mengelola organisasi, memperkuat kegiatan pertanian, dan mengembangkan kapasitas anggota secara bertahap.",
    primaryLabel: "Minat bergabung", primaryHref: "/gabung", secondaryLabel: "Lihat profil", secondaryHref: "/profil",
  },
  contact: { email: "", phone: "", whatsapp: "", address: "", officeHours: "" },
  announcement: { enabled: false, text: "" },
  features: {
    productCatalogue: false, programs: true, training: true, activities: true, news: true,
    gallery: true, partnerships: true, documents: true, faq: true, membershipInterest: true, externalPortal: false,
  },
  home: { capabilities: true, fields: true, activities: true, products: false, transparency: true, join: true },
  navigation: { showSearch: true, showContact: true, showLogin: true, tagline: MEGA_TAGLINE, groups: menuGroups },
  footer: {
    showSocial: true, showCredit: false, showCopyright: true, copyrightText: "Seluruh hak dilindungi.", groups: footerGroups,
  },
  socials: [],
  profileContent: { schemaVersion: 1, intro: "", vision: "", missions: [], galleryIntro: "", mapUrl: "", heroCredit: "", legacyHeroFileId: "", legacyLogoFileId: "", source: "", sourcePreservedInArchive: false },
};

export const SITE_FEATURE_LABELS: Record<SiteFeatureKey, { label: string; description: string }> = {
  productCatalogue: { label: "Produk publik", description: "Halaman produk, tautan menu, dan pemesanan pada website. Tidak mematikan pengelolaan produk internal Bidang Usaha." },
  programs: { label: "Program", description: "Halaman dan tautan program organisasi." },
  training: { label: "Pelatihan", description: "Halaman dan tautan informasi pelatihan." },
  activities: { label: "Kegiatan", description: "Agenda dan dokumentasi kegiatan yang dibuka untuk publik." },
  news: { label: "Kabar", description: "Halaman kabar dan artikel publik." },
  gallery: { label: "Galeri", description: "Halaman galeri publik." },
  partnerships: { label: "Kemitraan", description: "Informasi kemitraan publik." },
  documents: { label: "Dokumen publik", description: "Dokumen yang final dan diklasifikasikan untuk publik." },
  faq: { label: "Pertanyaan umum", description: "Halaman tanya jawab publik." },
  membershipInterest: { label: "Formulir minat bergabung", description: "Pengajuan minat anggota; bukan aktivasi anggota atau akun." },
  externalPortal: { label: "Portal eksternal", description: "Tautan portal terbatas bagi pemerintah, NGO, dan mitra." },
};
export const SITE_HOME_LABELS: Record<SiteHomeSectionKey, { label: string; description: string }> = {
  capabilities: { label: "Ringkasan kemampuan", description: "Ringkasan layanan organisasi pada beranda." },
  fields: { label: "Bidang kerja", description: "Kartu bidang dari registry organisasi." },
  activities: { label: "Agenda publik", description: "Kegiatan yang ditandai terbuka untuk publik." },
  products: { label: "Sorotan produk", description: "Bagian produk beranda; memerlukan fitur Produk publik aktif." },
  transparency: { label: "Transparansi", description: "Penjelasan klasifikasi informasi dan dokumen publik." },
  join: { label: "Ajakan bergabung", description: "Bagian formulir minat bergabung." },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function normalizePublicSiteSettings(input: unknown, profileContentInput?: unknown): PublicSiteSettings {
  const value = (isRecord(input) ? input : {}) as Partial<PublicSiteSettings>;
  const base = DEFAULT_PUBLIC_SITE_SETTINGS;
  const identity = { ...base.identity, ...(isRecord(value.identity) ? value.identity : {}) };
  const rawHero: Record<string, unknown> = isRecord(value.hero) ? value.hero as Record<string, unknown> : {};
  const allowedHeroVariants = new Set(["cinematic", "split", "editorial", "minimal"]);
  const hero = {
    ...base.hero,
    ...rawHero,
    variant: (allowedHeroVariants.has(String(rawHero.variant)) ? rawHero.variant : base.hero.variant) as PublicHeroVariant,
    imageUrl: typeof rawHero.imageUrl === "string" && rawHero.imageUrl.length <= 500 &&
      ((rawHero.imageUrl.startsWith("/") && !rawHero.imageUrl.startsWith("//")) ||
       /^https:\/\/\S+$/i.test(rawHero.imageUrl))
      ? rawHero.imageUrl : base.hero.imageUrl,
    imageAssetId: typeof rawHero.imageAssetId === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(rawHero.imageAssetId)
      ? rawHero.imageAssetId : "",
    imageAlt: typeof rawHero.imageAlt === "string" ? rawHero.imageAlt.slice(0, 180) : base.hero.imageAlt,
    imagePositionX: typeof rawHero.imagePositionX === "number" && Number.isFinite(rawHero.imagePositionX) ? Math.min(100, Math.max(0, rawHero.imagePositionX)) : base.hero.imagePositionX,
    imagePositionY: typeof rawHero.imagePositionY === "number" && Number.isFinite(rawHero.imagePositionY) ? Math.min(100, Math.max(0, rawHero.imagePositionY)) : base.hero.imagePositionY,
  };
  const contact = { ...base.contact, ...(isRecord(value.contact) ? value.contact : {}) };
  const announcement = { ...base.announcement, ...(isRecord(value.announcement) ? value.announcement : {}) };
  const features = { ...base.features, ...(isRecord(value.features) ? value.features : {}) };
  const home = { ...base.home, ...(isRecord(value.home) ? value.home : {}) };
  const navigation = { ...base.navigation, ...(isRecord(value.navigation) ? value.navigation : {}) };
  const footer = { ...base.footer, ...(isRecord(value.footer) ? value.footer : {}) };
  const profileSource = isRecord(profileContentInput) ? profileContentInput : isRecord(value.profileContent) ? value.profileContent : {};
  const profileContent: PublicProfileContent = {
    schemaVersion: 1,
    intro: typeof profileSource.intro === "string" ? profileSource.intro : base.profileContent.intro,
    vision: typeof profileSource.vision === "string" ? profileSource.vision : base.profileContent.vision,
    missions: Array.isArray(profileSource.missions) ? profileSource.missions.filter((mission): mission is string => typeof mission === "string").slice(0, 12) : base.profileContent.missions,
    galleryIntro: typeof profileSource.galleryIntro === "string" ? profileSource.galleryIntro : base.profileContent.galleryIntro,
    mapUrl: typeof profileSource.mapUrl === "string" ? profileSource.mapUrl : base.profileContent.mapUrl,
    heroCredit: typeof profileSource.heroCredit === "string" ? profileSource.heroCredit : base.profileContent.heroCredit,
    legacyHeroFileId: typeof profileSource.legacyHeroFileId === "string" ? profileSource.legacyHeroFileId : base.profileContent.legacyHeroFileId,
    legacyLogoFileId: typeof profileSource.legacyLogoFileId === "string" ? profileSource.legacyLogoFileId : base.profileContent.legacyLogoFileId,
    source: typeof profileSource.source === "string" ? profileSource.source : base.profileContent.source,
    sourcePreservedInArchive: profileSource.sourcePreservedInArchive === true,
  };

  const groups = Array.isArray(navigation.groups)
    ? navigation.groups.filter(isRecord).map((rawGroup, index) => {
        const fallback = base.navigation.groups.find((group) => group.id === rawGroup.id)
          ?? base.navigation.groups[index]
          ?? base.navigation.groups[0];
        const sourceColumns = Array.isArray(rawGroup.columns) ? rawGroup.columns : fallback.columns;
        const columns = sourceColumns.filter(isRecord).map((rawColumn, columnIndex) => {
          const fallbackColumn = fallback.columns[columnIndex] ?? fallback.columns[0];
          const sourceItems = Array.isArray(rawColumn.items) ? rawColumn.items : fallbackColumn?.items ?? [];
          return {
            ...fallbackColumn,
            ...rawColumn,
            id: typeof rawColumn.id === "string" ? rawColumn.id : fallbackColumn?.id ?? "column-" + columnIndex,
            heading: typeof rawColumn.heading === "string" ? rawColumn.heading : fallbackColumn?.heading ?? "Tautan",
            items: sourceItems.filter(isRecord).map((rawItem, itemIndex) => ({
              id: typeof rawItem.id === "string" ? rawItem.id : "link-" + columnIndex + "-" + itemIndex,
              label: typeof rawItem.label === "string" ? rawItem.label : "",
              href: typeof rawItem.href === "string" ? rawItem.href : "",
              desc: typeof rawItem.desc === "string" ? rawItem.desc : "",
              icon: typeof rawItem.icon === "string" ? rawItem.icon : "file",
              external: rawItem.external === true,
              enabled: rawItem.enabled !== false,
            })),
          };
        });
        const rawFeature = isRecord(rawGroup.feature) ? rawGroup.feature : {};
        return {
          ...fallback,
          ...rawGroup,
          id: typeof rawGroup.id === "string" ? rawGroup.id : "menu-" + index,
          heading: typeof rawGroup.heading === "string" ? rawGroup.heading : fallback.heading,
          enabled: rawGroup.enabled !== false,
          feature: { ...fallback.feature, ...rawFeature },
          columns,
          items: columns.flatMap((column) => column.items),
        };
      })
    : base.navigation.groups;

  const footerLinks = Array.isArray(footer.groups)
    ? footer.groups.filter(isRecord).map((rawGroup, index) => {
        const fallback = base.footer.groups.find((group) => group.id === rawGroup.id)
          ?? base.footer.groups[index]
          ?? base.footer.groups[0];
        const sourceItems = Array.isArray(rawGroup.items) ? rawGroup.items : fallback?.items ?? [];
        return {
          ...fallback,
          ...rawGroup,
          id: typeof rawGroup.id === "string" ? rawGroup.id : "footer-" + index,
          heading: typeof rawGroup.heading === "string" ? rawGroup.heading : fallback?.heading ?? "Tautan",
          enabled: rawGroup.enabled !== false,
          items: sourceItems.filter(isRecord).map((rawItem, itemIndex) => ({
            id: typeof rawItem.id === "string" ? rawItem.id : "footer-link-" + index + "-" + itemIndex,
            label: typeof rawItem.label === "string" ? rawItem.label : "",
            href: typeof rawItem.href === "string" ? rawItem.href : "",
            desc: typeof rawItem.desc === "string" ? rawItem.desc : "",
            icon: typeof rawItem.icon === "string" ? rawItem.icon : "file",
            external: rawItem.external === true,
            enabled: rawItem.enabled !== false,
          })),
        };
      })
    : base.footer.groups;

  const socials = Array.isArray(value.socials)
    ? value.socials.filter(isRecord).map((rawSocial, index) => ({
        id: typeof rawSocial.id === "string" ? rawSocial.id : "social-" + index,
        platform: rawSocial.platform as SiteSocialPlatform,
        href: typeof rawSocial.href === "string" ? rawSocial.href : "",
        enabled: rawSocial.enabled === true,
      }))
    : base.socials;

  return {
    schemaVersion: 1,
    identity,
    hero,
    contact,
    announcement,
    features,
    home,
    navigation: { ...navigation, groups },
    footer: { ...footer, groups: footerLinks },
    socials,
    profileContent,
  } as PublicSiteSettings;
}

export function isSitePathEnabled(path: string, settings: PublicSiteSettings): boolean {
  const pathname = path.split("?")[0].split("#")[0];
  const checks: Array<[string, SiteFeatureKey]> = [
    ["/produk", "productCatalogue"], ["/program", "programs"], ["/pelatihan", "training"],
    ["/kegiatan", "activities"], ["/kabar", "news"], ["/galeri", "gallery"],
    ["/kemitraan", "partnerships"], ["/dokumen", "documents"], ["/faq", "faq"],
    ["/gabung", "membershipInterest"], ["/portal", "externalPortal"],
  ];
  const match = checks.find(([prefix]) => pathname === prefix || pathname.startsWith(prefix + "/"));
  return match ? Boolean(settings.features[match[1]]) : true;
}
