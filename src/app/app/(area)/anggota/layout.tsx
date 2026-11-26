import { requireIdentity } from "@/lib/session";
import { getPublicSiteSettings } from "@/lib/public-site-settings";
import { MemberShell } from "@/components/member-shell";

export default async function AnggotaLayout({ children }: { children: React.ReactNode }) {
  const identity = await requireIdentity("member:self");
  const settings = await getPublicSiteSettings();
  return (
    <MemberShell
      identity={identity}
      showPublicActivities={settings.features.activities}
      showPublicProducts={settings.features.productCatalogue}
    >
      {children}
    </MemberShell>
  );
}
