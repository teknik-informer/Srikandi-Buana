import type { Metadata } from "next";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { requireIdentity } from "@/lib/session";
import { ProfilClient, type MemberProfileData } from "./profil-client";

export const metadata: Metadata = { title: "Profil Saya" };

interface ProfileRow {
  person_id: string;
  full_name: string;
  preferred_name: string | null;
  phone: string | null;
  village: string | null;
  member_number: string | null;
  membership_status: string | null;
  joined_on: string | null;
}

export default async function ProfilAnggotaPage() {
  const identity = await requireIdentity("member:self");

  try {
    const sql = getV9Sql();
    const rows = rowsFromResult<ProfileRow>(await sql`
      SELECT
        person.id::text AS person_id,
        person.full_name,
        person.preferred_name,
        person.phone,
        person.village,
        membership.member_number,
        membership.status AS membership_status,
        to_char(membership.created_at::date, 'YYYY-MM-DD') AS joined_on
      FROM v9.user_accounts AS account
      INNER JOIN v9.people AS person
        ON person.id = account.person_id
      LEFT JOIN LATERAL (
        SELECT
          member.member_number,
          member.status,
          member.created_at
        FROM v9.memberships AS member
        WHERE member.person_id = person.id
          AND member.organization_id = ${identity.organizationId}
        ORDER BY
          CASE member.status
            WHEN 'active' THEN 1
            WHEN 'pending' THEN 2
            WHEN 'inactive' THEN 3
            WHEN 'left' THEN 4
            ELSE 5
          END,
          member.created_at DESC
        LIMIT 1
      ) AS membership ON true
      WHERE account.id = ${identity.userId}
        AND person.status = 'active'
      LIMIT 1
    `);

    const row = rows[0];
    if (!row) {
      return <ProfilClient profile={null} loadError={false} />;
    }

    const interestRows = rowsFromResult<{ interest_key: string }>(await sql`
      SELECT interest_key
      FROM v9.person_interests
      WHERE organization_id = ${identity.organizationId}
        AND person_id = ${row.person_id}
      ORDER BY interest_label
    `);

    const profile: MemberProfileData = {
      personId: row.person_id,
      legalName: row.full_name,
      preferredName: row.preferred_name ?? "",
      phone: row.phone ?? "",
      village: row.village ?? "",
      memberNumber: row.member_number,
      membershipStatus: row.membership_status,
      joinedOn: row.joined_on,
      role: identity.role,
      scope: identity.scope,
      interests: interestRows.map((interest) => interest.interest_key),
    };

    return <ProfilClient profile={profile} loadError={false} />;
  } catch (reason) {
    const errorType =
      reason instanceof Error && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(reason.name)
        ? reason.name
        : "UnknownError";
    console.warn("[member-profile] Source unavailable", errorType);
    return <ProfilClient profile={null} loadError />;
  }
}
