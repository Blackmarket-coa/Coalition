# Quality Gates Script Audit

## Package-by-package script status

| Package | lint | test | typecheck | Status | Notes |
|---|---|---|---|---|---|
| @blackstar/mobile | ✅ implemented | ✅ implemented | ⚠️ temporary exemption script | Partial | Typecheck script placeholder until TS project wiring is finalized. |
| @blackstar/gateway | ⚠️ temporary exemption script | ⚠️ temporary exemption script | ✅ implemented (`tsc --noEmit`) | Partial | Lint/test scripts added as explicit temporary exemptions. |
| @blackstar/web | ⚠️ temporary exemption script | ⚠️ temporary exemption script | ⚠️ temporary exemption script | Exempted | Web package currently build-only in workspace pipeline. |
| @blackstar/core | ⚠️ temporary exemption script | ⚠️ temporary exemption script | ⚠️ temporary exemption script | Exempted | Shared package exports only; quality scripts explicitly declared for pipeline consistency. |
| @blackstar/ui | ⚠️ temporary exemption script | ⚠️ temporary exemption script | ⚠️ temporary exemption script | Exempted | Shared package exports only; quality scripts explicitly declared for pipeline consistency. |

## Monorepo pipeline updates

- Added root `typecheck` script: `yarn check:lockfiles && turbo run typecheck`.
- Added Turbo `typecheck` task with workspace dependency propagation (`^typecheck`).

## Follow-up plan to remove exemptions

1. Replace placeholder lint scripts with eslint configs per package.
2. Replace placeholder test scripts with baseline test runners (or mark packages intentionally no-test with ADR).
3. Replace placeholder typecheck scripts with project-level `tsc --noEmit` once per-package tsconfig and references are in place.
