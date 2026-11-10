import { getAuthenticatedExternalUser } from "@/lib/external-auth";
import { activeExternalGrants } from "@/lib/external-access-policy";
import { json } from "@/lib/account-access";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAuthenticatedExternalUser();
  if (!user) return json({ error: "Sesi portal eksternal tidak valid atau organisasi belum terverifikasi." }, 401);
  const grants = activeExternalGrants(user.grants);
  return json({
    account: {
      id: user.accountId,
      email: user.email,
      fullName: user.fullName,
      organizationId: user.organizationId,
      organizationName: user.organizationName,
      organizationType: user.organizationType,
    },
    grants,
    hasActiveAccess: grants.length > 0,
  });
}
