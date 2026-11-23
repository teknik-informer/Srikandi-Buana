"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getV9Sql, rowsFromResult } from "@/lib/db";
import { can, requireIdentity } from "@/lib/session";

type MutationRow = { id: string };

function validUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function normalize(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function logFailure(area: string, reason: unknown): void {
  console.error(
    `[${area}] Operation failed:`,
    reason instanceof Error ? reason.message : "Unknown error",
  );
}

function agriculturePath(result: string): string {
  return `/app/bidang/pertanian/data?result=${result}`;
}

function ensureAgricultureWrite(identity: Awaited<ReturnType<typeof requireIdentity>>): void {
  if (!can(identity, "field:pertanian:data:write")) redirect("/app");
}

function refreshAgriculture(): void {
  revalidatePath("/app/bidang/pertanian");
  revalidatePath("/app/bidang/pertanian/data");
  revalidatePath("/app/bidang/pertanian/rencana");
  revalidatePath("/app/bidang/pertanian/laporan");
}

export async function createAgriculturePlot(formData: FormData): Promise<void> {
  const identity = await requireIdentity("field:pertanian:read");
  ensureAgricultureWrite(identity);

  const plotCode = normalize(String(formData.get("plot_code") ?? ""));
  const ownerLabel = normalize(String(formData.get("owner_label") ?? ""));
  const ownerMembershipId = String(formData.get("owner_membership_id") ?? "").trim();
  const hamlet = normalize(String(formData.get("hamlet") ?? ""));
  const village = normalize(String(formData.get("village") ?? ""));
  const commodity = normalize(String(formData.get("commodity") ?? ""));
  const landUse = normalize(String(formData.get("land_use") ?? ""));
  const areaText = String(formData.get("area_ha") ?? "").trim();
  const area = Number(areaText);
  const locationNote = String(formData.get("location_note") ?? "").trim();

  if (
    plotCode.length < 2 || plotCode.length > 60 ||
    ownerLabel.length < 2 || ownerLabel.length > 160 ||
    (ownerMembershipId && !validUuid(ownerMembershipId)) ||
    hamlet.length > 120 ||
    village.length < 2 || village.length > 120 ||
    commodity.length < 2 || commodity.length > 120 ||
    landUse.length > 120 ||
    !Number.isFinite(area) || area <= 0 || area > 100000 ||
    locationNote.length > 1000
  ) {
    redirect(agriculturePath("invalid"));
  }

  let created = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH inserted AS (
        INSERT INTO v9.agriculture_plots (
          organization_id, field_key, plot_code, owner_membership_id, owner_label,
          hamlet, village, commodity, land_use, area_ha, location_note, created_by, updated_by
        )
        SELECT
          application.organization_id,
          application.field_key,
          ${plotCode},
          membership.id,
          COALESCE(person.full_name, ${ownerLabel}),
          NULLIF(${hamlet}, ''),
          ${village},
          ${commodity},
          NULLIF(${landUse}, ''),
          ${area},
          NULLIF(${locationNote}, ''),
          ${identity.userId},
          ${identity.userId}
        FROM v9.field_applications AS application
        LEFT JOIN v9.memberships AS membership
          ON membership.id = NULLIF(${ownerMembershipId}, '')::uuid
          AND membership.organization_id = application.organization_id
          AND membership.status = 'active'
        LEFT JOIN v9.people AS person ON person.id = membership.person_id
        WHERE application.organization_id = ${identity.organizationId}
          AND application.field_key = 'pertanian'
          AND application.is_enabled = true
          AND (
            NULLIF(${ownerMembershipId}, '') IS NULL
            OR membership.id IS NOT NULL
          )
        RETURNING id, organization_id, field_key, plot_code, owner_label, commodity, area_ha
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT
          organization_id,
          ${identity.userId},
          'agriculture_plot.created',
          'agriculture_plot',
          id::text,
          jsonb_build_object(
            'field_key', field_key,
            'plot_code', plot_code,
            'owner_label', owner_label,
            'commodity', commodity,
            'area_ha', area_ha
          )
        FROM inserted
        RETURNING id
      )
      SELECT inserted.id::text AS id
      FROM inserted
      INNER JOIN audit ON true
    `;
    created = rowsFromResult<MutationRow>(result).length === 1;
  } catch (reason) {
    logFailure("agriculture-plot-create", reason);
    const message = reason instanceof Error ? reason.message.toLowerCase() : "";
    if (message.includes("unique")) redirect(agriculturePath("duplicate"));
    redirect(agriculturePath("error"));
  }

  if (!created) redirect(agriculturePath("member-unavailable"));
  refreshAgriculture();
  redirect(agriculturePath("plot-created"));
}

export async function updateAgriculturePlotStatus(formData: FormData): Promise<void> {
  const identity = await requireIdentity("field:pertanian:read");
  ensureAgricultureWrite(identity);

  const plotId = String(formData.get("plot_id") ?? "").trim();
  const nextStatus = String(formData.get("next_status") ?? "").trim();
  if (!validUuid(plotId) || !["active","paused","archived"].includes(nextStatus)) {
    redirect(agriculturePath("invalid"));
  }

  let changed = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH changed AS (
        UPDATE v9.agriculture_plots AS plot
        SET
          status = ${nextStatus},
          updated_by = ${identity.userId},
          updated_at = now()
        WHERE plot.id = ${plotId}
          AND plot.organization_id = ${identity.organizationId}
          AND plot.field_key = 'pertanian'
          AND plot.status <> 'archived'
          AND (
            ${nextStatus} <> 'archived'
            OR NOT EXISTS (
              SELECT 1 FROM v9.agriculture_cycles AS cycle
              WHERE cycle.plot_id = plot.id
                AND cycle.organization_id = plot.organization_id
                AND cycle.status IN ('planned','planted','growing')
            )
          )
        RETURNING plot.id, plot.organization_id, plot.field_key, plot.plot_code, plot.status
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT organization_id, ${identity.userId}, 'agriculture_plot.status.' || status,
          'agriculture_plot', id::text,
          jsonb_build_object('field_key', field_key, 'plot_code', plot_code, 'status', status)
        FROM changed
        RETURNING id
      )
      SELECT changed.id::text AS id
      FROM changed
      INNER JOIN audit ON true
    `;
    changed = rowsFromResult<MutationRow>(result).length === 1;
  } catch (reason) {
    logFailure("agriculture-plot-status", reason);
    redirect(agriculturePath("error"));
  }

  if (!changed) redirect(agriculturePath("plot-stale-or-active-cycle"));
  refreshAgriculture();
  redirect(agriculturePath("plot-updated"));
}

export async function createAgricultureCycle(formData: FormData): Promise<void> {
  const identity = await requireIdentity("field:pertanian:read");
  ensureAgricultureWrite(identity);

  const plotId = String(formData.get("plot_id") ?? "").trim();
  const cropName = normalize(String(formData.get("crop_name") ?? ""));
  const variety = normalize(String(formData.get("variety") ?? ""));
  const season = normalize(String(formData.get("season_label") ?? ""));
  const plantingDate = String(formData.get("planting_date") ?? "").trim();
  const plannedHarvestDate = String(formData.get("planned_harvest_date") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (
    !validUuid(plotId) ||
    cropName.length < 2 || cropName.length > 120 ||
    variety.length > 120 || season.length > 100 ||
    (plantingDate && !validDate(plantingDate)) ||
    (plannedHarvestDate && !validDate(plannedHarvestDate)) ||
    (plantingDate && plannedHarvestDate && plannedHarvestDate < plantingDate) ||
    notes.length > 3000
  ) {
    redirect(agriculturePath("invalid"));
  }

  let created = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH inserted AS (
        INSERT INTO v9.agriculture_cycles (
          organization_id, field_key, plot_id, crop_name, variety, season_label,
          planting_date, planned_harvest_date, status, notes, created_by, updated_by
        )
        SELECT
          plot.organization_id,
          plot.field_key,
          plot.id,
          ${cropName},
          NULLIF(${variety}, ''),
          NULLIF(${season}, ''),
          NULLIF(${plantingDate}, '')::date,
          NULLIF(${plannedHarvestDate}, '')::date,
          'planned',
          NULLIF(${notes}, ''),
          ${identity.userId},
          ${identity.userId}
        FROM v9.agriculture_plots AS plot
        WHERE plot.id = ${plotId}
          AND plot.organization_id = ${identity.organizationId}
          AND plot.field_key = 'pertanian'
          AND plot.status = 'active'
        RETURNING id, organization_id, field_key, plot_id, crop_name, status
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT
          organization_id,
          ${identity.userId},
          'agriculture_cycle.created',
          'agriculture_cycle',
          id::text,
          jsonb_build_object('field_key', field_key, 'plot_id', plot_id, 'crop_name', crop_name, 'status', status)
        FROM inserted
        RETURNING id
      )
      SELECT inserted.id::text AS id
      FROM inserted
      INNER JOIN audit ON true
    `;
    created = rowsFromResult<MutationRow>(result).length === 1;
  } catch (reason) {
    logFailure("agriculture-cycle-create", reason);
    redirect(agriculturePath("error"));
  }

  if (!created) redirect(agriculturePath("plot-unavailable"));
  refreshAgriculture();
  redirect(agriculturePath("cycle-created"));
}

export async function updateAgricultureCycleStatus(formData: FormData): Promise<void> {
  const identity = await requireIdentity("field:pertanian:read");
  ensureAgricultureWrite(identity);

  const cycleId = String(formData.get("cycle_id") ?? "").trim();
  const nextStatus = String(formData.get("next_status") ?? "").trim();
  const harvestedOn = String(formData.get("harvested_on") ?? "").trim();

  if (
    !validUuid(cycleId) ||
    !["planted","growing","harvested","cancelled"].includes(nextStatus) ||
    (harvestedOn && !validDate(harvestedOn)) ||
    (nextStatus === "harvested" && !validDate(harvestedOn))
  ) {
    redirect(agriculturePath("invalid"));
  }

  let changed = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH changed AS (
        UPDATE v9.agriculture_cycles AS cycle
        SET
          status = ${nextStatus},
          harvested_on = CASE WHEN ${nextStatus} = 'harvested' THEN ${harvestedOn}::date ELSE NULL END,
          updated_by = ${identity.userId},
          updated_at = now()
        WHERE cycle.id = ${cycleId}
          AND cycle.organization_id = ${identity.organizationId}
          AND cycle.field_key = 'pertanian'
          AND (
            (cycle.status = 'planned' AND ${nextStatus} IN ('planted','cancelled'))
            OR (cycle.status = 'planted' AND ${nextStatus} IN ('growing','cancelled'))
            OR (cycle.status = 'growing' AND ${nextStatus} IN ('harvested','cancelled'))
          )
          AND (
            ${nextStatus} <> 'harvested'
            OR EXISTS (
              SELECT 1 FROM v9.agriculture_harvests AS harvest
              WHERE harvest.cycle_id = cycle.id
                AND harvest.organization_id = cycle.organization_id
            )
          )
        RETURNING cycle.id, cycle.organization_id, cycle.field_key, cycle.plot_id, cycle.crop_name, cycle.status, cycle.harvested_on
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT organization_id, ${identity.userId}, 'agriculture_cycle.status.' || status,
          'agriculture_cycle', id::text,
          jsonb_build_object('field_key', field_key, 'plot_id', plot_id, 'crop_name', crop_name, 'status', status, 'harvested_on', harvested_on)
        FROM changed
        RETURNING id
      )
      SELECT changed.id::text AS id
      FROM changed
      INNER JOIN audit ON true
    `;
    changed = rowsFromResult<MutationRow>(result).length === 1;
  } catch (reason) {
    logFailure("agriculture-cycle-status", reason);
    redirect(agriculturePath("error"));
  }

  if (!changed) redirect(agriculturePath("cycle-transition-blocked"));
  refreshAgriculture();
  redirect(agriculturePath("cycle-updated"));
}

export async function recordAgricultureVisit(formData: FormData): Promise<void> {
  const identity = await requireIdentity("field:pertanian:read");
  ensureAgricultureWrite(identity);

  const plotId = String(formData.get("plot_id") ?? "").trim();
  const cycleId = String(formData.get("cycle_id") ?? "").trim();
  const visitDate = String(formData.get("visit_date") ?? "").trim();
  const visitType = String(formData.get("visit_type") ?? "").trim();
  const observer = normalize(String(formData.get("observer_label") ?? ""));
  const findings = String(formData.get("findings") ?? "").trim();
  const recommendations = String(formData.get("recommendations") ?? "").trim();

  if (
    !validUuid(plotId) || (cycleId && !validUuid(cycleId)) ||
    !validDate(visitDate) ||
    !["monitoring","budidaya","hama_penyakit","sarana","panen","lainnya"].includes(visitType) ||
    observer.length < 2 || observer.length > 160 ||
    findings.length > 5000 || recommendations.length > 3000
  ) {
    redirect(agriculturePath("invalid"));
  }

  let created = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH inserted AS (
        INSERT INTO v9.agriculture_visits (
          organization_id, field_key, plot_id, cycle_id, visit_date,
          visit_type, observer_label, findings, recommendations, created_by
        )
        SELECT
          plot.organization_id,
          plot.field_key,
          plot.id,
          cycle.id,
          ${visitDate}::date,
          ${visitType},
          ${observer},
          NULLIF(${findings}, ''),
          NULLIF(${recommendations}, ''),
          ${identity.userId}
        FROM v9.agriculture_plots AS plot
        LEFT JOIN v9.agriculture_cycles AS cycle
          ON cycle.id = NULLIF(${cycleId}, '')::uuid
          AND cycle.plot_id = plot.id
          AND cycle.organization_id = plot.organization_id
          AND cycle.field_key = plot.field_key
          AND cycle.status <> 'cancelled'
        WHERE plot.id = ${plotId}
          AND plot.organization_id = ${identity.organizationId}
          AND plot.field_key = 'pertanian'
          AND plot.status <> 'archived'
          AND (NULLIF(${cycleId}, '') IS NULL OR cycle.id IS NOT NULL)
        RETURNING id, organization_id, field_key, plot_id, cycle_id, visit_date, visit_type, observer_label
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT
          organization_id,
          ${identity.userId},
          'agriculture_visit.recorded',
          'agriculture_visit',
          id::text,
          jsonb_build_object('field_key', field_key, 'plot_id', plot_id, 'cycle_id', cycle_id, 'visit_date', visit_date, 'visit_type', visit_type, 'observer_label', observer_label)
        FROM inserted
        RETURNING id
      )
      SELECT inserted.id::text AS id
      FROM inserted
      INNER JOIN audit ON true
    `;
    created = rowsFromResult<MutationRow>(result).length === 1;
  } catch (reason) {
    logFailure("agriculture-visit-create", reason);
    redirect(agriculturePath("error"));
  }

  if (!created) redirect(agriculturePath("plot-or-cycle-unavailable"));
  refreshAgriculture();
  redirect(agriculturePath("visit-recorded"));
}

export async function recordAgricultureHarvest(formData: FormData): Promise<void> {
  const identity = await requireIdentity("field:pertanian:read");
  ensureAgricultureWrite(identity);

  const plotId = String(formData.get("plot_id") ?? "").trim();
  const cycleId = String(formData.get("cycle_id") ?? "").trim();
  const harvestDate = String(formData.get("harvest_date") ?? "").trim();
  const commodity = normalize(String(formData.get("commodity") ?? ""));
  const weightText = String(formData.get("weight_kg") ?? "").trim();
  const weight = Number(weightText);
  const grade = normalize(String(formData.get("quality_grade") ?? ""));
  const moistureText = String(formData.get("moisture_percent") ?? "").trim();
  const moisture = moistureText === "" ? null : Number(moistureText);
  const recorder = normalize(String(formData.get("recorded_by_label") ?? ""));
  const note = String(formData.get("note") ?? "").trim();

  if (
    !validUuid(plotId) || !validUuid(cycleId) || !validDate(harvestDate) ||
    commodity.length < 2 || commodity.length > 120 ||
    !Number.isFinite(weight) || weight <= 0 || weight > 100000000 ||
    grade.length > 60 ||
    (moisture !== null && (!Number.isFinite(moisture) || moisture < 0 || moisture > 100)) ||
    recorder.length < 2 || recorder.length > 160 ||
    note.length > 3000
  ) {
    redirect(agriculturePath("invalid"));
  }

  let recorded = false;
  try {
    const sql = getV9Sql();
    const result = await sql`
      WITH inserted AS (
        INSERT INTO v9.agriculture_harvests (
          organization_id, field_key, plot_id, cycle_id, harvest_date,
          commodity, weight_kg, quality_grade, moisture_percent,
          recorded_by_label, note, created_by
        )
        SELECT
          cycle.organization_id,
          cycle.field_key,
          cycle.plot_id,
          cycle.id,
          ${harvestDate}::date,
          ${commodity},
          ${weight},
          NULLIF(${grade}, ''),
          ${moisture},
          ${recorder},
          NULLIF(${note}, ''),
          ${identity.userId}
        FROM v9.agriculture_cycles AS cycle
        INNER JOIN v9.agriculture_plots AS plot
          ON plot.id = cycle.plot_id
          AND plot.organization_id = cycle.organization_id
          AND plot.field_key = cycle.field_key
        WHERE cycle.id = ${cycleId}
          AND cycle.plot_id = ${plotId}
          AND cycle.organization_id = ${identity.organizationId}
          AND cycle.field_key = 'pertanian'
          AND cycle.status IN ('growing','harvested')
          AND plot.status <> 'archived'
        RETURNING id, organization_id, field_key, plot_id, cycle_id, harvest_date, commodity, weight_kg, quality_grade
      ),
      audit AS (
        INSERT INTO v9.audit_events (
          organization_id, actor_user_id, action, entity_type, entity_id, after_state
        )
        SELECT
          organization_id,
          ${identity.userId},
          'agriculture_harvest.recorded',
          'agriculture_harvest',
          id::text,
          jsonb_build_object('field_key', field_key, 'plot_id', plot_id, 'cycle_id', cycle_id, 'harvest_date', harvest_date, 'commodity', commodity, 'weight_kg', weight_kg, 'quality_grade', quality_grade)
        FROM inserted
        RETURNING id
      )
      SELECT inserted.id::text AS id
      FROM inserted
      INNER JOIN audit ON true
    `;
    recorded = rowsFromResult<MutationRow>(result).length === 1;
  } catch (reason) {
    logFailure("agriculture-harvest-create", reason);
    redirect(agriculturePath("error"));
  }

  if (!recorded) redirect(agriculturePath("cycle-unavailable"));
  refreshAgriculture();
  redirect(agriculturePath("harvest-recorded"));
}
