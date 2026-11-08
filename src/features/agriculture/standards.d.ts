export type StandardVersion = {
  id?: string;
  issuer: string;
  version: string;
  sourceUrl: string;
  effectiveFrom: string;
  replacedOn?: string;
  status?: "published" | "superseded" | string;
};
export function selectStandardVersion(versions?: StandardVersion[], asOfDate?: string): {
  state: "invalid_date" | "no_effective_version" | "ambiguous_versions" | "selected";
  selected: StandardVersion | null;
  candidates: StandardVersion[];
};
export function evaluateStandardControl(control?: Record<string, unknown>, assessment?: Record<string, unknown> | null): {
  state: string;
  claimable?: false;
  issue?: string;
};
export function evaluateCertificateRecord(certificate?: Record<string, unknown>, asOfDate?: string): {
  state: string;
  claimable: false;
  missing?: string[];
  notice?: string;
};
