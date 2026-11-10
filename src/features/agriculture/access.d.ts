export const agencyRoles: readonly string[];
export type AgencyPrincipal = {
  accountId: string;
  userId?: string;
  organisationId: string;
  role: string;
  personId?: string;
  assignedProgramIds?: string[];
  assignedSiteIds?: string[];
};
export type AgencyAccessRequest = {
  principal: AgencyPrincipal;
  resource: string;
  action: string;
  record: {
    organisationId: string;
    personId?: string;
    participantPersonId?: string;
    enrolledPersonIds?: string[];
    programId?: string;
    siteId?: string;
    createdBy?: string;
    initiatedBy?: string;
    containsPersonalData?: boolean;
    personalDataClass?: string;
  };
  grant?: {
    active: boolean;
    expiresAt: string;
    organisationId: string;
    resources: string[];
    actions: string[];
    programIds: string[];
    siteIds: string[];
    restrictedDataApproved?: boolean;
    personalDataApproved?: boolean;
  };
  now?: Date;
};
export function authorizeAgencyAction(request?: AgencyAccessRequest): { allowed: boolean; reason: string };
export function listAgencyPermissions(role: string): string[];
