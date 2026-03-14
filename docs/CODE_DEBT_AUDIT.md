# Code Debt Audit (2026-03-14)

## Scope
Quick debt scan performed across workspace/tooling, package boundaries, and reliability signals.

## Key Findings

### 1) Monorepo dependency state is currently unstable
- Root scripts rely on Turbo + Yarn workspaces (`yarn lint`, `yarn test` call `turbo run ...`).
- Running those root checks fails immediately in `@blackstar/mobile` because Yarn reports the package is not present in the lockfile.
- This prevents routine lint/test execution and is a release-risk debt item.

### 2) Package-manager/lockfile drift exists
- The repo declares Yarn 4 at the root and in mobile package metadata.
- `apps/gateway` still includes an npm `package-lock.json`.
- `apps/mobile` has a local `yarn.lock` generated from installing inside that subproject.
- Mixed lockfile strategy is likely contributing to workspace resolution issues.

### 3) High code duplication between `src/` and shared packages
- The README says the app is monorepo-structured with shared `packages/core` and `packages/ui`, while still saying “main app code lives at root” and listing `src/` as main app source.
- Identical implementations exist in both root `src/*` and `packages/*` (components, hooks, contexts).
- This creates two sources of truth and increases regression risk for every feature update.

### 4) Quality gate coverage is uneven
- Turbo is configured for `lint` and `test` pipelines, but several workspaces do not define corresponding scripts.
- `@blackstar/core` and `@blackstar/ui` package manifests currently only expose entrypoints.
- `@blackstar/gateway` has `typecheck` but no lint/test scripts.

### 5) Small but visible hygiene debt remains
- Duplicated README sections are present (table-of-contents entries and repeated “Current App Surfaces” / “Feature Flags” blocks).
- Existing lint suppressions and lingering TODO markers indicate known debt that should be tracked formally.

## Priority Next Steps

### P0 (This week): Restore deterministic CI health
1. Pick one package manager + one lockfile policy (recommended: Yarn workspaces at root).
2. Regenerate lockfiles from root and remove conflicting subproject lockfiles.
3. Ensure `yarn lint` and `yarn test` pass at root before any feature work.
4. Add CI guardrails to fail on introducing nested lockfiles.

### P1 (1-2 weeks): Remove duplicate source-of-truth problem
1. Decide canonical ownership:
   - UI primitives/components in `packages/ui`.
   - shared hooks/services/contexts in `packages/core`.
   - app composition/routes/screens in `src` (or `apps/mobile/src`) only.
2. Replace duplicate root exports with imports from packages.
3. Migrate in vertical slices (e.g., chat stack, order stack) with snapshot and smoke checks.

### P2 (2-4 weeks): Normalize quality gates across workspaces
1. Add `lint`, `test`, and `typecheck` scripts for every package.
2. Keep Turbo tasks, but make all package scripts explicit.
3. Add minimal baseline tests for gateway routes and core hooks.

### P3 (Ongoing): Documentation and hygiene cleanup
1. Deduplicate README sections and align architecture docs with actual folder ownership.
2. Convert TODO/lint-suppress comments into tracked issues with owner + due date.
3. Introduce a debt register (`docs/TECH_DEBT_REGISTER.md`) reviewed in sprint planning.

## Commands Run During Audit
- `yarn lint` (failed due to workspace/lockfile state)
- `yarn test` (failed due to workspace/lockfile state)
- targeted ripgrep scans for TODO/FIXME/eslint-disable markers
- file comparisons between `src/*` and `packages/*` to confirm duplication
