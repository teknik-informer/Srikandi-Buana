# Dependency security review — SRIKANDI BUANA v12

**Reviewed:** 6 November 2026  
**Production security baseline:** `feat/ecosystem-v11-5` / `15db17e73aa5aa076d53d964fbfd93208895c45d`  
**v12 branch:** `feat/enterprise-v12-foundation`

## Dependency changes

- Keep `next` and `eslint-config-next` at `16.4.5`, the security release already deployed to Production.
- Keep React and React DOM at `19.2.6`.
- Remove the unused direct development dependency `react-server-dom-webpack`; the application does not import it directly and Next.js owns the RSC runtime dependency.
- Apply a scoped npm override for `@typescript-eslint/typescript-estree > minimatch` to `11.0.1`, the patched version listed for GHSA-g3hv-75wg-m249.
- Regenerate the v12 lockfile from the validated Production hotfix lockfile while preserving the v12 Node engine range `>=22.13.0 <27`.
- Change the full dependency audit from report-only to a blocking CI gate.

## Security audit status

| Scope | Expected gate |
|---|---|
| Production dependencies | `npm audit --omit=dev --audit-level=low` — blocking |
| All dependencies | `npm audit --audit-level=moderate` — blocking |
| Known minimatch advisory | Patched lockfile version `11.0.1` |

The Production hotfix commit `15db17e` passed both audit commands with zero vulnerabilities. The v12 branch previously resolved `minimatch@10.2.6` and allowed the full audit to fail with `continue-on-error`; this update removes that gap. The final v12 branch must still complete its own fresh CI run before the security gate is considered closed.

## Verification required on this branch

- `npm ci`
- `npm audit --omit=dev --audit-level=low`
- `npm audit --audit-level=moderate`
- `npm run test:navigation:compat`
- `npm run test:terminology`
- `npm run test:ecosystem`
- `npm run test:integration:staging`
- `npm run typecheck`
- `npm test`
- `npm run build`

A successful static/unit suite is not a substitute for browser E2E against an isolated staging database.

## References

- Next.js 16.4.5 release: https://github.com/vercel/next.js/releases/tag/v16.4.5
- Next.js security advisories: https://github.com/vercel/next.js/security/advisories
- minimatch advisory: https://github.com/advisories/GHSA-g3hv-75wg-m249
- React Server Components security guidance: https://react.dev/blog/2025/12/11/denial-of-service-and-source-code-exposure-in-react-server-components

## Release boundary

No Production migration or deployment is authorized by this document. Keep PR #1 in Draft until the Vercel, database, privacy, browser E2E, backup/restore and commercial-plan release gates are met.
