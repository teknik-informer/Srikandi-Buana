/**
 * Explicit allowlist for isolated Architect QA Preview branches.
 *
 * Full administrative CRUD is granted only when Vercel confirms the Preview
 * deployment environment AND the source branch is on this list. Never infer
 * this capability from the role name or a client-provided value.
 */
export const architectQaPreviewBranches = Object.freeze([
  "feat/architect-identity-console-2026-11-15",
  "implementation/five-app-platform-hub-2026-11-17",
  "architecture/v13-modular-platform-foundation-2026-11-17",
]);

export function isArchitectQaPreview(env = process.env) {
  return env.VERCEL_ENV === "preview"
    && architectQaPreviewBranches.includes(env.VERCEL_GIT_COMMIT_REF);
}
