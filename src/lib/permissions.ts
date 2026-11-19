/**
 * Compatibility facade for legacy imports.
 *
 * New feature code should import from "@/features/identity/access-policy".
 * Keep this module until all legacy consumers have been migrated and tested.
 */
export {
  roles,
  isArchitectFullAccess,
  canReadKindForRole,
  canReadKind,
  canWriteKind,
  canReviewFollowup,
  canPublishRecord,
  canReadRecord,
  canWriteRecord,
  visibleRecord,
  canReadSectionForRole,
  canReadSection,
} from "../features/identity/access-policy";
export type { Role, Principal, AccessRecord, ModuleAccessState } from "../features/identity/access-policy";
