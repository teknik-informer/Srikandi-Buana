"use server";

import { getV9Sql } from "@/lib/db";

export interface JoinState {
  ok: boolean;
  message: string;
  name?: string;
  ref?: string;
}

const CONSENT_VERSION = "v9.1-membership-interest-2026-11-23";

const ALLOWED_INTEREST_AREAS = new Set([
  "pertanian",
  "pelatihan",
  "usaha",
  "organisasi",
]);

const ALLOWED_EXPERIENCE_LEVELS = new Set([
  "baru",
  "1-3",
  "4-10",
  "10+",
]);

export async function submitJoinInterest(
  _prev: JoinState,
  formData: FormData,
): Promise<JoinState> {
  const nama = String(formData.get("nama") ?? "").trim().replace(/\s+/g, " ");
  const telepon = String(formData.get("telepon") ?? "").trim();
  const alamat = String(formData.get("alamat") ?? "").trim();
  const kegiatan = String(formData.get("kegiatan") ?? "").trim();
  const pengalaman = String(formData.get("pengalaman") ?? "").trim();
  const catatan = String(formData.get("catatan") ?? "").trim();
  const setuju = formData.get("setuju") === "on" || formData.get("setuju") === "true";

  if (nama.length < 3 || nama.length > 160) {
    return { ok: false, message: "Nama lengkap harus terdiri dari 3–160 karakter." };
  }
  if (!/^[0-9+\-\s()]{8,20}$/.test(telepon)) {
    return { ok: false, message: "Nomor WhatsApp tidak valid." };
  }
  if (alamat.length < 5 || alamat.length > 500) {
    return { ok: false, message: "Alamat harus terdiri dari 5–500 karakter." };
  }
  if (!ALLOWED_INTEREST_AREAS.has(kegiatan)) {
    return { ok: false, message: "Pilihan kegiatan tidak dikenali." };
  }
  if (!ALLOWED_EXPERIENCE_LEVELS.has(pengalaman)) {
    return { ok: false, message: "Pilihan pengalaman tani tidak dikenali." };
  }
  if (catatan.length > 1000) {
    return { ok: false, message: "Catatan maksimal 1.000 karakter." };
  }
  if (!setuju) {
    return { ok: false, message: "Persetujuan pemrosesan data wajib dicentang." };
  }

  try {
    const sql = getV9Sql();
    const queryResult = await sql`
      WITH organization AS (
        SELECT id
        FROM v9.organizations
        WHERE slug = 'srikandi-buana'
          AND status = 'active'
        LIMIT 1
      ),
      submitted AS (
        INSERT INTO v9.membership_interests (
          organization_id,
          applicant_name,
          phone,
          address,
          interest_area,
          experience_level,
          message,
          status,
          consent_version,
          consented_at,
          source
        )
        SELECT
          organization.id,
          ${nama},
          ${telepon},
          ${alamat},
          ${kegiatan},
          ${pengalaman},
          NULLIF(${catatan}, ''),
          'submitted',
          ${CONSENT_VERSION},
          now(),
          'website'
        FROM organization
        RETURNING id, reference_no, organization_id
      ),
      queued AS (
        INSERT INTO v9.outbox_events (
          organization_id,
          event_type,
          dedupe_key,
          payload
        )
        SELECT
          submitted.organization_id,
          'membership.interest.submitted',
          'membership-interest:' || submitted.id::text,
          jsonb_build_object(
            'membership_interest_id', submitted.id,
            'reference_no', submitted.reference_no
          )
        FROM submitted
        RETURNING id
      )
      SELECT submitted.reference_no
      FROM submitted
      INNER JOIN queued ON true
    `;

    const resultRows = Array.isArray(queryResult)
      ? (queryResult as Array<{ reference_no: string }>)
      : (queryResult as unknown as { rows: Array<{ reference_no: string }> }).rows;
    const submission = resultRows[0];

    if (!submission?.reference_no) {
      throw new Error("Membership interest insert returned no reference.");
    }

    return {
      ok: true,
      name: nama.split(" ")[0],
      ref: submission.reference_no,
      message:
        "Minat bergabung Anda telah tersimpan. Bidang Organisasi & Keanggotaan akan menghubungi Anda untuk proses verifikasi.",
    };
  } catch (error) {
    console.error(
      "[membership-interest] Persistence failed:",
      error instanceof Error ? error.message : "Unknown database error",
    );
    return {
      ok: false,
      message:
        "Pengajuan belum dapat disimpan karena layanan sedang tidak tersedia. Data Anda belum tercatat; silakan coba kembali.",
    };
  }
}
