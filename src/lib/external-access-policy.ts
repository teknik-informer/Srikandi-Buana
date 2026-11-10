export type ExternalOrganizationType = "government" | "ngo" | "partner";
export type ExternalScopeType = "project" | "program" | "region" | "aggregate";
export type ExternalScope = {
  type: ExternalScopeType;
  ref: string;
  permission: "read" | "aggregate";
};
export type ExternalGrant = {
  id: string;
  audience: ExternalOrganizationType;
  purpose: string;
  status: "active" | "suspended" | "revoked";
  validFrom: string;
  validUntil: string;
  scopes: ExternalScope[];
};
export type ExternalPrincipal = {
  accountId: string;
  workspaceOwner: string;
  organizationId: string;
  organizationType: ExternalOrganizationType;
  organizationName: string;
  email: string;
  fullName: string;
  accountStatus: "active" | "disabled" | "invited";
  grants: ExternalGrant[];
};
export type ExternalResource = {
  workspaceOwner: string;
  classification: "public" | "project" | "program" | "aggregate" | "personal" | "financial" | "internal";
  projectId?: string | null;
  programId?: string | null;
  regionId?: string | null;
  aggregateKey?: string | null;
};

/** External access is deny-by-default and evaluated on every request. */
export function canExternalRead(
  principal: ExternalPrincipal | null | undefined,
  resource: ExternalResource,
  now = new Date(),
): boolean {
  if (resource.classification === "public") return true;
  if (!principal || principal.accountStatus !== "active") return false;
  if (!resource.workspaceOwner || resource.workspaceOwner !== principal.workspaceOwner) return false;
  // Personal records and raw accounting entries are never exposed by a generic external grant.
  if (["personal", "financial", "internal"].includes(resource.classification)) return false;
  const instant = now.getTime();
  if (!Number.isFinite(instant)) return false;
  return principal.grants.some((grant) => {
    if (
      grant.status !== "active" ||
      grant.audience !== principal.organizationType ||
      !grant.purpose.trim() ||
      !Number.isFinite(Date.parse(grant.validFrom)) ||
      !Number.isFinite(Date.parse(grant.validUntil)) ||
      Date.parse(grant.validFrom) > instant ||
      Date.parse(grant.validUntil) <= instant
    ) return false;
    return grant.scopes.some((scope) => {
      if (!scope.ref || scope.permission !== (scope.type === "aggregate" ? "aggregate" : "read")) return false;
      if (resource.classification === "project") {
        return scope.type === "project" && !!resource.projectId && scope.ref === resource.projectId;
      }
      if (resource.classification === "program") {
        return scope.type === "program" && !!resource.programId && scope.ref === resource.programId;
      }
      if (resource.classification === "aggregate") {
        if (scope.type === "aggregate") return !!resource.aggregateKey && ["members", "land", "harvest"].includes(resource.aggregateKey) && scope.ref === resource.aggregateKey;
        if (scope.type === "region") return !!resource.regionId && scope.ref === resource.regionId;
      }
      return false;
    });
  });
}

export function activeExternalGrants(grants: ExternalGrant[], now = new Date()): ExternalGrant[] {
  const instant = now.getTime();
  if (!Number.isFinite(instant)) return [];
  return grants.filter((grant) =>
    grant.status === "active" &&
    Number.isFinite(Date.parse(grant.validFrom)) &&
    Number.isFinite(Date.parse(grant.validUntil)) &&
    Date.parse(grant.validFrom) <= instant &&
    Date.parse(grant.validUntil) > instant &&
    grant.scopes.length > 0
  );
}
