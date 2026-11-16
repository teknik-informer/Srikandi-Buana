export type V14LegacyDomain =
  | "member_profiles"
  | "partner_organizations"
  | "programmes"
  | "activities"
  | "tasks"
  | "documents";
export type V14LegacyMapping = { domain: V14LegacyDomain; values: Record<string, unknown> };
export function mapLegacyRecordToV14(kind: string, raw: unknown): V14LegacyMapping | null;
export function v14LegacyDate(value: unknown): string | null;
