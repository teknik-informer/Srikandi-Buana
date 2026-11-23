import type { Metadata } from "next";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { can, requireIdentity } from "@/lib/session";
import { SuratClient, type SecretariatLetter } from "./surat-client";

export const metadata: Metadata = { title: "Surat Masuk & Keluar" };

export default async function SuratPage({
  searchParams,
}: {
  searchParams: Promise<{ result?: string }>;
}) {
  const identity = await requireIdentity("secretariat:read");
  const { result } = await searchParams;
  const sql = getV9Sql();
  const query = await sql`
    SELECT
      id::text AS id,
      reference_no,
      direction,
      number,
      subject,
      counterpart,
      letter_date::text AS date,
      status,
      assignee_label AS assignee
    FROM v9.secretariat_letters
    WHERE organization_id = ${identity.organizationId}
    ORDER BY letter_date DESC, created_at DESC
    LIMIT 500
  `;
  const rows = rowsFromResult<SecretariatLetter>(query);

  return (
    <SuratClient
      initialRows={rows}
      actorName={identity.name}
      result={result}
      canWrite={can(identity, "secretariat:letters:write")}
    />
  );
}
