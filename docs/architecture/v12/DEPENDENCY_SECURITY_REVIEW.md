# Dependency security review — 6 November 2026

## Changes applied on the development branch

- Updated `next` and `eslint-config-next` from `16.4.3` to `16.4.5`. The upstream 16.4.5 release contains the fixes for the seven Next.js security advisories published on 3 November 2026: https://github.com/vercel/next.js/releases/tag/v16.4.5
- Removed the direct development dependency `react-server-dom-webpack@19.2.6`. No application source import was found, and the Next.js build passed after its removal. This avoids retaining a vulnerable standalone React Server Components package in the development dependency tree.
- Regenerated and committed `package-lock.json` using npm on GitHub Actions. The resulting exact lockfile was used for the successful build and test run.

## Current audit result

| Scope | Result |
| --- | --- |
| Production dependencies (`npm audit --omit=dev`) | 0 vulnerabilities |
| All dependencies (`npm audit`) | 8 moderate, 0 high, 0 critical |

The remaining findings are the `minimatch` denial-of-service advisory GHSA-g3hv-75wg-m249, reached through `typescript-eslint` / `@typescript-eslint/typescript-estree`. The installed parser currently requests `minimatch ^10.2.2`, while the advisory lists `11.0.1` as patched. A forced major override is intentionally not applied because it may break the parser's expected API. Track the upstream compatible dependency update before closing this finding.

Advisory: https://github.com/advisories/GHSA-g3hv-75wg-m249

## Verification

- `npm ci` — passed
- `npm audit --omit=dev --audit-level=moderate` — passed
- `npm run test:navigation:compat` and `npm run test:terminology` — passed
- `npm run test:ecosystem` — passed
- `npm run test:integration:staging` — passed
- `npm run typecheck` — passed
- `npm test` — passed
- `npm run build` — passed

These changes are on `feat/enterprise-v12-foundation` only. They have not been merged or deployed to Production.
