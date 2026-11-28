import type { Metadata } from "next";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { can, requireIdentity } from "@/lib/session";
import { SuratClient, type SecretariatLetter } from "./surat-client";

export const metadata: Metadata = { title: "Surat Masuk & Keluar" };

export default async function SuratPage({
  searchParams,
}: {
  searchParams: Promise<{ result?: string; direction?: string }>;
}) {
  const identity = await requireIdentity("secretariat:read");
  const { result, direction: requestedDirection } = await searchParams;
  const initialDirection = requestedDirection === "keluar" ? "keluar" : "masuk";
  const sql = getV9Sql();
  const query = await sql`
    SELECT
      letter.id::text AS id,
      letter.reference_no,
      letter.direction,
      letter.number,
      letter.subject,
      letter.counterpart,
      letter.letter_date::text AS date,
      letter.status,
      letter.assignee_label AS assignee,
      generated_document.id::text AS document_id
    FROM v9.secretariat_letters AS letter
    LEFT JOIN LATERAL (
      SELECT document.id
      FROM v9.secretariat_documents AS document
      WHERE document.organization_id = letter.organization_id
        AND document.source_letter_id = letter.id
        AND document.status <> 'arsip'
      ORDER BY document.created_at DESC
      LIMIT 1
    ) AS generated_document ON true
    WHERE letter.organization_id = ${identity.organizationId}
    ORDER BY letter.letter_date DESC, letter.created_at DESC
    LIMIT 500
  `;
  const rows = rowsFromResult<SecretariatLetter>(query);

  return (
    <SuratClient
      initialRows={rows}
      initialDirection={initialDirection}
      actorName={identity.name}
      result={result}
      canWrite={can(identity, "secretariat:letters:write")}
      canGenerateDocuments={can(identity, "secretariat:documents:write")}
    />
  );
}
