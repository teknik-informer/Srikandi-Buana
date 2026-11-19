/**
 * Explicit allowlist for isolated Architect QA Preview branches.
 *
 * QA-only tools are available only when Vercel confirms the Preview deployment
 * environment AND the source branch is on this list. This gate does not decide
 * root Administrator Sistem permissions, which are resolved by the authenticated
 * root-account policy. Never trust a client-provided environment flag.
 */
export const architectQaPreviewBranches = Object.freeze([
  "feat/architect-identity-console-2026-11-15",
  "implementation/five-app-platform-hub-2026-11-17",
  "architecture/v13-modular-platform-foundation-2026-11-17",
  "feat/admin-full-access-six-app-sidebar-2026-11-18",
  "feat/qa-preview-test-center-access-2026-11-18",
]);

export function isArchitectQaPreview(env = process.env) {
  return env.VERCEL_ENV === "preview"
    && architectQaPreviewBranches.includes(env.VERCEL_GIT_COMMIT_REF);
}
