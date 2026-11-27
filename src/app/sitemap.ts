import { siteOrigin } from "@/lib/site-origin";
import type { MetadataRoute } from "next";
import { getPublications } from "@/lib/public-content";
import { publicPages } from "@/lib/seo";
import { programs } from "@/lib/srikandi";
import { informationPages } from "@/lib/information-pages";
import { getPublicPolicySettings } from "@/lib/public-policy-store";
import { publicPolicyHref } from "@/lib/public-policies";
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteOrigin();
  const [feed, policySettings] = await Promise.all([getPublications(), getPublicPolicySettings()]);
  const legacyPolicyPaths = new Set([...Object.keys(informationPages).map(slug => "/" + slug), "/kebijakan"]);
  const policyDocuments = policySettings.enabled ? policySettings.documents.filter(document => document.status === "published") : [];
  const paths = [
    ...Object.keys(publicPages).filter(path => !legacyPolicyPaths.has(path)),
    ...programs.map(program => "/program/" + program.id),
    ...(policySettings.enabled ? ["/kebijakan"] : [])
  ];
  const pageEntries = [...new Set(paths)].map(path => ({
    url: new URL(path, base).toString(),
    lastModified: new Date("2026-11-02T00:00:00.000Z")
  }));
  const policyEntries = policyDocuments.map(document => {
    const parsed = new Date(document.updatedAt);
    return {
      url: new URL(publicPolicyHref(document.slug), base).toString(),
      lastModified: Number.isNaN(parsed.getTime()) ? new Date("2026-11-02T00:00:00.000Z") : parsed
    };
  });
  const publicationEntries = feed.items.map(item => ({
    url: base + "/kabar/" + encodeURIComponent(item.id),
    lastModified: new Date(item.updated || item.date)
  }));
  const entries = [...pageEntries, ...policyEntries, ...publicationEntries];
  return [...new Map(entries.map(entry => [entry.url, entry])).values()];
}
