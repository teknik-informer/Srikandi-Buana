# SRIKANDI BUANA v11.5 security hotfix

Date: 6 November 2026

## Scope

This isolated hotfix is based on the deployed v11.5 baseline commit `e605242b299d53814731cbe2ade6beff32934161`. It is intentionally limited to dependency security and CI verification. It does not include the v12 enterprise architecture work, database migrations, or business data changes.

## Dependency changes

- Update `next` and `eslint-config-next` from `16.4.3` to `16.4.5`.
- Remove the unused direct development dependency `react-server-dom-webpack`. The repository's application source does not import this package directly; Next.js manages the RSC implementation it requires.
- Keep `react` and `react-dom` pinned at `19.2.6` to avoid an uncoordinated React/Next compatibility change. React's published RSC fixes for the 19.2 line were available from 19.2.4 onward.
- Regenerate `package-lock.json` using npm in GitHub Actions, then install from that exact lockfile and run the full verification suite.

## Security references

- Next.js v16.4.5 release, published 3 November 2026: https://github.com/vercel/next.js/releases/tag/v16.4.5
- Next.js security advisories: https://github.com/vercel/next.js/security/advisories
- React Server Components security guidance: https://react.dev/blog/2025/12/11/denial-of-service-and-source-code-exposure-in-react-server-components

The Next.js 16.4.5 release addresses seven security advisories published on 3 November 2026. React 19.2.6 is later than the patched 19.2.4 RSC release.

## CI gates

- `npm ci`
- `npm audit --omit=dev --audit-level=low` — blocking production dependency gate
- `npm audit --audit-level=moderate` — report-only for development dependency findings
- Navigation compatibility and terminology tests
- Integration security tests
- TypeScript typecheck
- Full project regression suite
- Next.js production build

## Release boundary

This branch and its PR do not change the Production deployment. No merge, deployment, database migration, or production environment modification is performed by this hotfix preparation. Release remains subject to review and explicit deployment approval.
