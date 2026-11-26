import type { Metadata } from "next";
import { PublicHeader, PublicFooter } from "@/components/public-shell";
import { getPublicSiteSettings } from "@/lib/public-site-settings";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSiteSettings();
  return {
    title: {
      default: settings.identity.siteName,
      template: `%s | ${settings.identity.siteName}`,
    },
    description: settings.identity.tagline,
  };
}

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const settings = await getPublicSiteSettings();
  return (
    <div className="public-canvas min-h-dvh">
      <PublicHeader settings={settings} />
      <main className="public-body">{children}</main>
      <PublicFooter settings={settings} />
    </div>
  );
}
