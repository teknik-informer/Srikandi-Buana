export type AssuranceState =
  | "not_recorded" | "draft" | "submitted" | "needs_correction"
  | "internally_verified" | "externally_verified" | "expired"
  | "not_applicable" | "withheld";

export type AssuranceInput = {
  status?: AssuranceState;
  today?: string;
  reason?: string;
  issuer?: string;
  externalReference?: string;
  verifiedAt?: string;
  evidenceId?: string;
  verifierId?: string;
  expiresOn?: string;
};

export function isValidDay(value: unknown): value is string;
export function isValidTimestamp(value: unknown): value is string;
export function resolveAssuranceState(input?: AssuranceInput): {
  state: AssuranceState;
  valid: boolean;
  issue?: string;
  issues?: string[];
  reason?: string;
};

export function interpretMeasure(input?: {
  state?: "not_collected" | "pending" | "measured" | "not_applicable" | "withheld";
  value?: number;
  reason?: string;
}): { state: string; value: number | null; label: string; issue?: string; reason?: string };

export function evaluateProgramActivation(program?: Record<string, unknown>): {
  canActivate: boolean;
  state: "ready_for_authorised_activation" | "preparation_incomplete";
  missing: { key: string; label: string }[];
  message: string;
};

export function reconcileMassBalance(input?: {
  opening?: number; received?: number; producedIn?: number;
  shipped?: number; losses?: number; closing?: number; tolerance?: number;
  unit?: string; productForm?: string; locationId?: string;
}): {
  state: "incomplete" | "reconciled" | "variance";
  valid: boolean;
  missing?: string[];
  expectedClosing?: number;
  actualClosing?: number;
  variance?: number;
  unit?: string;
  productForm?: string;
  locationId?: string;
};

export function validateMarketObservation(input?: Record<string, unknown>): {
  valid: boolean; issues: string[];
};

export function validateTraceabilityEvent(input?: Record<string, unknown>): {
  valid: boolean; issues: string[];
};

export const recordStates: Readonly<Record<string, AssuranceState>>;
export const marketObservationKinds: readonly string[];
export const traceabilityEventTypes: readonly string[];
