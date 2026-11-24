import { requireIdentity, can } from "@/lib/session";
import { CoreShell } from "@/components/core-shell";
import { CORE_NAV } from "@/config/apps";
import { getV9Sql, rowsFromResult } from "@/lib/db";

interface CountRow {
  count: number;
}

function errorType(reason: unknown): string {
  return reason instanceof Error && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(reason.name)
    ? reason.name
    : "UnknownError";
}

export default async function PengurusLayout({ children }: { children: React.ReactNode }) {
  const identity = await requireIdentity("organization:read");
  let pending: number | null = null;

  try {
    const sql = getV9Sql();
    const canReadFinance = can(identity, "approval:read") || can(identity, "finance:journal:approve");
    const canReadMembership = can(identity, "field:organisasi:review");
    const canReadWorkplans = can(identity, "approval:read") || can(identity, "organization:team:approve");
    const jobs: Promise<unknown>[] = [];

    if (canReadFinance) {
      jobs.push(sql`
        SELECT count(*)::int AS count
        FROM v9.finance_journals
        WHERE organization_id = ${identity.organizationId}
          AND status = 'submitted'
      `);
    }
    if (canReadMembership) {
      jobs.push(sql`
        SELECT count(*)::int AS count
        FROM v9.membership_interests
        WHERE organization_id = ${identity.organizationId}
          AND status IN ('submitted', 'under_review')
      `);
    }
    if (canReadWorkplans) {
      jobs.push(sql`
        SELECT count(*)::int AS count
        FROM v9.field_workplans
        WHERE organization_id = ${identity.organizationId}
          AND status = 'submitted'
      `);
    }

    const results = await Promise.all(jobs);
    pending = results.reduce<number>((total, result) => {
      const count = rowsFromResult<CountRow>(result)[0]?.count ?? 0;
      return total + Number(count);
    }, 0);
  } catch (reason) {
    console.warn("[pengurus-navigation] Approval count unavailable", errorType(reason));
  }

  return (
    <CoreShell
      identity={identity}
      activeApp="pengurus"
      nav={[
        {
          label: "Pengurus Harian",
          items: CORE_NAV.pengurus.map((item) => ({
            ...item,
            badge: item.label === "Persetujuan" && pending !== null && pending > 0
              ? pending
              : undefined,
          })),
        },
        {
          label: "Pintasan",
          items: [
            { label: "Aplikasi bidang", href: "/app/bidang" },
            { label: "Keuangan ringkas", href: "/app/keuangan" },
            { label: "Semua aplikasi", href: "/app" },
          ],
        },
      ]}
    >
      {children}
    </CoreShell>
  );
}
