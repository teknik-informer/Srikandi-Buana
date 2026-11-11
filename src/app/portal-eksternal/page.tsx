import { redirect } from "next/navigation";
import { getAuthenticatedExternalUser } from "@/lib/external-auth";
import { activeExternalGrants } from "@/lib/external-access-policy";
import { getExternalAgricultureSummary } from "@/lib/external-agriculture-summary";
import ExternalAudienceDashboard from "@/app/_components/external-audience-dashboard";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Dashboard Instansi & Mitra | Srikandi Buana",
  robots: { index: false, follow: false },
};

export default async function ExternalPortalPage() {
  const user = await getAuthenticatedExternalUser();
  if (!user) redirect("/masuk");
  const grants = activeExternalGrants(user.grants);
  const summary = await getExternalAgricultureSummary(user);

  return (
    <ExternalAudienceDashboard
      organizationType={user.organizationType}
      organizationName={user.organizationName}
      fullName={user.fullName}
      email={user.email}
      grants={grants}
      summary={summary}
    />
  );
}
