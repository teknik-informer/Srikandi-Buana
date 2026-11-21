# Production Baseline Lock — 2026-11-21

## Authoritative baseline

- Production deployment: https://admin-dashboard-dphe8vwer-teknik-informer.vercel.app
- Vercel deployment: `dpl_25iPg8TuwKoUJXkXzsTG1vwk2BUy`
- Branch: `integration/phase1-preview-2026-11-16`
- Commit: `1c498abdfac8169432db62c91d0c96fb48072039`
- Recovery branch: `recovery/production-baseline-2026-11-21`

This branch was created directly from the exact Production commit above. It is the only approved starting point for the recovery and additive-development work described here.

## Protected production behavior

The following areas are protected from unrelated redesign or replacement:

1. Member registration and the `anggota` record model, including email/phone identity, verification state, consent fields, and the existing account activation flow.
2. Login page composition and its dedicated `login.css` styles, together with the existing authentication API, rate limiting, session handling, and return-path validation.
3. Dashboard navigation, application hub, workspace shell, header, sidebar, mega menu, account controls, and their existing route mapping.
4. Workspace presentation and existing CSS/UI primitives.
5. Existing database schema, production data, and migration history.

Any change to a protected area must be required by a concrete feature or verified defect, be isolated to the smallest possible surface, and include a regression test. Visual redesign is not an acceptable side effect of a module-level change.

## Development and release rules

- New work must be additive and based on this branch.
- Do not merge unrelated experimental branches wholesale. Review and port only independently verified changes.
- Do not change Production environment variables, data, schema, or deployment.
- Do not apply migrations to QA or Production without explicit approval.
- Do not merge or deploy Production without explicit approval.
- A Preview is not considered ready until the deployment is READY and the baseline regression suite plus relevant feature checks pass.
- Report unverified behavior honestly; a successful build alone is not functional UAT.

## First protected regression surfaces

- `src/app/masuk/page.tsx`
- `src/app/masuk/login-form.tsx`
- `src/app/masuk/login.css`
- `src/app/api/auth/login/route.ts`
- `src/app/_components/member-profile-completion.tsx`
- `src/app/_components/member-audience-dashboard.tsx`
- `src/lib/srikandi.ts` (`modules.anggota`)
- `src/app/_components/dashboard-navigation.tsx`
- `src/app/_components/application-hub.tsx`
- `src/app/_components/workspace-shell.tsx`
- `scripts/verify-navigation.mjs`
- `scripts/verify-template-ui.mjs`
- `scripts/verify-whatsapp-login.mjs`
